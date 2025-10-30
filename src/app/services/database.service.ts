import { Injectable, PLATFORM_ID, inject, OnDestroy } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { createRxDatabase, RxDatabase, RxCollection, removeRxDatabase, addRxPlugin } from 'rxdb';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';
import { replicateRxCollection, RxReplicationState } from 'rxdb/plugins/replication';
import { RxDBUpdatePlugin } from 'rxdb/plugins/update';
import { Observable, BehaviorSubject, firstValueFrom, Subscription } from 'rxjs';
import { map, distinctUntilChanged } from 'rxjs/operators';
import { AuthService } from './auth.service';

// Add RxDB update plugin
addRxPlugin(RxDBUpdatePlugin);
import { 
  sortedListSchema, 
  SortedListDocument, 
  SortedListCollection,
  TierGroup,
  SortedList 
} from './rxdb-schemas';

type DatabaseCollections = {
  lists: SortedListCollection;
};

type ListSorterDatabase = RxDatabase<DatabaseCollections>;

@Injectable({
  providedIn: 'root'
})
export class DatabaseService implements OnDestroy {
  private db: ListSorterDatabase | null = null;
  private replicationState: RxReplicationState<SortedListDocument, any> | null = null;
  private isBrowser: boolean;
  private dbReady: Promise<void>;
  private authService: AuthService;
  private syncStatusSubject = new BehaviorSubject<{ isSetup: boolean; isActive: boolean }>({
    isSetup: false,
    isActive: false
  });
  private authSubscription?: Subscription;
  private onlineSubscription?: Subscription;
  private replicationSubscriptions: Subscription[] = [];
  private isSettingUpSync = false;
  private isDbReady = false;

  constructor() {
    const platformId = inject(PLATFORM_ID);
    this.authService = inject(AuthService);
    this.isBrowser = isPlatformBrowser(platformId);
    
    if (this.isBrowser) {
      this.dbReady = this.initDatabase();
    } else {
      this.dbReady = Promise.resolve();
    }

    // Listen for auth changes to setup/teardown sync
    if (this.isBrowser) {
      this.authSubscription = this.authService.currentUser$.pipe(
        distinctUntilChanged((prev, curr) => {
          // Only emit if user actually changed (by userId)
          return prev?.userId === curr?.userId;
        })
      ).subscribe((user) => {
        console.log('Auth state changed, user:', user?.userId || 'null');
        if (user) {
          this.setupSync();
        } else {
          this.cancelSync();
        }
      });

      // Listen for online status changes to trigger sync
      this.onlineSubscription = this.authService.isOnline$.pipe(
        distinctUntilChanged()
      ).subscribe((isOnline) => {
        console.log('Online status changed:', isOnline);
        if (isOnline && this.replicationState && this.authService.currentUserValue) {
          console.log('Triggering sync due to online status change');
          this.forceSyncNow();
        }
      });
    }
  }

  ngOnDestroy(): void {
    // Clean up subscriptions
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
    if (this.onlineSubscription) {
      this.onlineSubscription.unsubscribe();
    }
    // Cancel replication
    this.cancelSync();
  }

  private async initDatabase(): Promise<void> {
    try {
      console.log('Starting RxDB initialization...');
      const dbName = 'list-sorter-db';
      const storage = getRxStorageDexie();

      // Try to create the database
      try {
        console.log('Creating RxDB database:', dbName);
        this.db = await createRxDatabase<DatabaseCollections>({
          name: dbName,
          storage: storage,
          multiInstance: false,
          ignoreDuplicate: false
        });
        // console.log('Database created successfully');
      } catch (error: any) {
        // If database already exists (DB9 error), remove and recreate
        if (error.code === 'DB9' || error.parameters?.database === dbName) {
          console.log('Database already exists, removing and recreating...');
          await removeRxDatabase(dbName, storage);
          
          this.db = await createRxDatabase<DatabaseCollections>({
            name: dbName,
            storage: storage,
            multiInstance: false,
            ignoreDuplicate: false
          });
          console.log('Database recreated successfully');
        } else {
          throw error;
        }
      }

      // console.log('Adding collections...');
      await this.db.addCollections({
        lists: {
          schema: sortedListSchema
        }
      });
      // console.log('Collections added successfully');

      // console.log('RxDB initialized and ready. Database:', this.db);
      // console.log('Database name:', this.db.name);
      // console.log('Collections:', Object.keys(this.db.collections));
      
      // Test query to verify database is working
      // const testQuery = await this.db.lists.find().exec();
      // console.log('Test query result - existing documents:', testQuery.length);
      
      // Note: Sync will be set up by the authService.currentUser$ subscription
      // when a user is authenticated. No need to call setupSyncInternal here.
    } catch (error) {
      console.error('Error initializing RxDB:', error);
      throw error;
    }
  }

  private async ensureReady(): Promise<void> {
    // Return immediately if already ready
    if (this.isDbReady) {
      return;
    }
    
    console.log('ensureReady: waiting for dbReady promise...');
    try {
      await this.dbReady;
      this.isDbReady = true;
      console.log('ensureReady: dbReady promise resolved');
    } catch (error) {
      console.error('ensureReady: dbReady promise rejected:', error);
      throw error;
    }
  }

  private async setupSync(): Promise<void> {
    // If sync is already active, don't set it up again
    if (this.replicationState) {
      console.log('Sync already active, skipping setup...');
      return;
    }

    // Prevent multiple concurrent sync setup attempts
    if (this.isSettingUpSync) {
      console.log('Sync setup already in progress, skipping...');
      return;
    }
    
    // Set flag immediately to prevent race conditions
    this.isSettingUpSync = true;
    
    try {
      await this.ensureReady();
      await this.setupSyncInternal();
    } finally {
      this.isSettingUpSync = false;
    }
  }

  private async setupSyncInternal(): Promise<void> {
    if (!this.db || !this.isBrowser) return;

    const user = this.authService.currentUserValue;
    if (!user) return;

    // Double-check we don't already have an active replication
    if (this.replicationState) {
      console.log('Replication already exists in setupSyncInternal, skipping...');
      return;
    }

    try {
      // Migrate local lists to the authenticated user
      const migratedCount = await this.migrateLocalListsToUser(user.userId);
      if (migratedCount > 0) {
        console.log(`Migrated ${migratedCount} local lists to user account`);
      }

      // Cancel existing sync if any (defensive, should not be needed)
      this.cancelSync();

      const appwriteConfig = await this.authService.getAppwriteConfig();
      if (!appwriteConfig) {
        console.error('Failed to get AppWrite configuration');
        return;
      }

      console.log('Setting up RxDB replication with AppWrite');

      // Set up replication with AppWrite
      // Using live: false to disable continuous polling
      // Sync will only happen on manual trigger (online status changes, user actions)
      this.replicationState = replicateRxCollection({
        collection: this.db.lists,
        replicationIdentifier: 'appwrite-lists-replication',
        live: false,
        autoStart: true,
        pull: {
          async handler(lastCheckpoint: any, batchSize: number) {
            const newCheckpoint = lastCheckpoint || 0;
            console.log(`Pull handler called with checkpoint:`, newCheckpoint);
            try {
              const documents = await appwriteConfig.pullHandler(newCheckpoint, batchSize);
              console.log(`Pull handler received ${documents.length} documents`);
              // Always advance checkpoint to prevent infinite loops
              // If we have documents, use the max updatedAt
              // If no documents, use current timestamp to mark we've checked
              const nextCheckpoint = documents.length > 0 
                ? Math.max(...documents.map((d: SortedListDocument) => d.updatedAt))
                : (newCheckpoint === 0 ? Date.now() : newCheckpoint);
              
              console.log(`Pull handler returning checkpoint: ${nextCheckpoint}`);
              return {
                documents: documents.map((d: SortedListDocument) => ({ ...d, _deleted: false })),
                checkpoint: nextCheckpoint
              };
            } catch (error) {
              console.error('Pull replication error:', error);
              // On error, advance checkpoint to current time to avoid retrying same point
              return {
                documents: [],
                checkpoint: Date.now()
              };
            }
          },
          batchSize: 20
        },
        push: {
          async handler(docs: any[]) {
            try {
              await appwriteConfig.pushHandler(docs);
              return [];
            } catch (error) {
              console.error('Push replication error:', error);
              throw error;
            }
          },
          batchSize: 20
        }
      });

      // Listen to replication events and store subscriptions for cleanup
      this.replicationSubscriptions.push(
        this.replicationState.error$.subscribe(error => {
          console.error('Replication error:', error);
        })
      );

      this.replicationSubscriptions.push(
        this.replicationState.active$.subscribe(active => {
          // Only log when sync becomes active (starts), not when it becomes idle
          if (active) {
            console.log('Replication sync started');
          }
          this.updateSyncStatus();
        })
      );
      
      // Log when documents are received
      this.replicationSubscriptions.push(
        this.replicationState.received$.subscribe(doc => {
          console.log('Document received from Appwrite:', doc.id);
        })
      );
      
      // Log when documents are sent
      this.replicationSubscriptions.push(
        this.replicationState.sent$.subscribe(doc => {
          console.log('Document sent to Appwrite:', doc.id);
        })
      );

      this.updateSyncStatus();
      console.log('Replication setup complete');
      
      // Trigger initial sync
      console.log('Triggering initial sync...');
      await this.replicationState.reSync();
      console.log('Initial sync complete');
    } catch (error) {
      console.error('Error setting up sync:', error);
    }
  }

  private cancelSync(): void {
    // Clean up replication subscriptions
    this.replicationSubscriptions.forEach(sub => sub.unsubscribe());
    this.replicationSubscriptions = [];
    
    if (this.replicationState) {
      console.log('Cancelling replication');
      this.replicationState.cancel();
      this.replicationState = null;
    }
    this.updateSyncStatus();
  }

  private updateSyncStatus(): void {
    this.syncStatusSubject.next({
      isSetup: !!this.replicationState,
      isActive: !!this.replicationState && !!this.authService.currentUserValue
    });
  }

  async forceSyncNow(): Promise<void> {
    if (!this.replicationState || !this.isBrowser) {
      console.log('Cannot force sync: replication not active');
      return;
    }

    try {
      console.log('Forcing immediate sync...');
      await this.replicationState.reSync();
      console.log('Force sync complete');
    } catch (error) {
      console.error('Error during force sync:', error);
    }
  }

  getSyncStatus(): { isSetup: boolean; isActive: boolean } {
    return this.syncStatusSubject.value;
  }

  async saveSortedList(list: SortedList): Promise<any> {
    if (!this.isBrowser) {
      return null;
    }
    
    await this.ensureReady();
    
    if (!this.db) {
      console.error('Database is null after ensureReady!');
      return null;
    }

    const user = this.authService.currentUserValue;
    const id = list._id || `list_${Date.now()}`;
    const now = Date.now();

    const doc: SortedListDocument = {
      id,
      listName: list.listName,
      items: list.items,
      sortedItems: list.sortedItems,
      tieredItems: list.tieredItems,
      completed: list.completed,
      createdAt: list.createdAt ? list.createdAt.getTime() : now,
      completedAt: list.completedAt ? list.completedAt.getTime() : undefined,
      userId: user ? user.userId : 'local', // Use 'local' for unauthenticated users
      updatedAt: now
    };

    try {
      // Check if document exists
      const existing = await this.db.lists.findOne({
        selector: { id: id }
      }).exec();
      
      if (existing) {
        await existing.update({
          $set: doc
        });
      } else {
        await this.db.lists.insert(doc);
      }
      
      // Trigger push sync if user is online and authenticated
      if (this.replicationState && user && this.authService.isOnlineValue) {
        console.log('Triggering push sync after save...');
        this.forceSyncNow();
      }
      
      return { id };
    } catch (error) {
      console.error('Error saving list:', error);
      throw error;
    }
  }

  async getSortedList(id: string): Promise<SortedList | null> {
    if (!this.isBrowser) return null;
    await this.ensureReady();
    if (!this.db) return null;

    try {
      const doc = await this.db.lists.findOne({
        selector: { id: id }
      }).exec();
      if (!doc) return null;
      return this.convertToSortedList(doc.toJSON() as SortedListDocument);
    } catch (error) {
      console.error('Error getting list:', error);
      return null;
    }
  }

  async getAllLists(): Promise<SortedList[]> {
    if (!this.isBrowser) return [];
    await this.ensureReady();
    if (!this.db) return [];

    const user = this.authService.currentUserValue;
    const userId = user ? user.userId : 'local';

    try {
      // Get all documents and filter in memory since RxDB query isn't working
      const allDocs = await this.db.lists.find().exec();
      const filteredDocs = allDocs.filter(doc => doc.userId === userId);
      
      // Sort by createdAt descending
      const sortedDocs = filteredDocs.sort((a, b) => b.createdAt - a.createdAt);
      
      return sortedDocs.map(doc => this.convertToSortedList(doc.toJSON() as SortedListDocument));
    } catch (error) {
      console.error('Error in getAllLists:', error);
      return [];
    }
  }

  // Observable version for reactive updates
  getAllLists$(): Observable<SortedList[]> {
    if (!this.isBrowser || !this.db) {
      return new Observable(subscriber => subscriber.next([]));
    }

    // Use find all and filter in memory since RxDB query isn't working
    // Also react to auth changes by getting userId dynamically
    return this.db.lists
      .find()
      .$.pipe(
        map((docs: any[]) => {
          // Get current userId dynamically (not captured at subscription time)
          const user = this.authService.currentUserValue;
          const userId = user ? user.userId : 'local';
          
          // Filter by userId
          const filtered = docs.filter((doc: any) => doc.userId === userId);
          
          // Sort by createdAt descending
          const sorted = filtered.sort((a: any, b: any) => b.createdAt - a.createdAt);
          return sorted.map((doc: any) => this.convertToSortedList(doc.toJSON() as SortedListDocument));
        })
      );
  }

  async updateSortedList(list: SortedList): Promise<any> {
    return this.saveSortedList(list);
  }

  async deleteList(id: string): Promise<any> {
    if (!this.isBrowser) return null;
    await this.ensureReady();
    if (!this.db) return null;

    try {
      // Find and remove from local RxDB
      // The replication push handler will sync the deletion to Appwrite
      const doc = await this.db.lists.findOne({
        selector: { id: id }
      }).exec();
      
      if (doc) {
        await doc.remove();
        
        // Trigger push sync if user is online and authenticated
        const user = this.authService.currentUserValue;
        if (this.replicationState && user && this.authService.isOnlineValue) {
          console.log('Triggering push sync after delete...');
          this.forceSyncNow();
        }
      }
    } catch (error) {
      console.error('Error deleting list:', error);
      throw error;
    }
  }

  async clearDatabase(): Promise<void> {
    if (!this.isBrowser) return;
    await this.ensureReady();
    if (!this.db) return;

    try {
      const dbName = 'list-sorter-db';
      const storage = getRxStorageDexie();
      
      await this.db.remove();
      this.db = null;
      
      await removeRxDatabase(dbName, storage);
      await this.initDatabase();
    } catch (error) {
      console.error('Error clearing database:', error);
    }
  }

  private convertToSortedList(doc: SortedListDocument): SortedList {
    return {
      _id: doc.id,
      listName: doc.listName,
      items: doc.items,
      sortedItems: doc.sortedItems,
      tieredItems: doc.tieredItems,
      completed: doc.completed,
      createdAt: new Date(doc.createdAt),
      completedAt: doc.completedAt ? new Date(doc.completedAt) : undefined
    };
  }

  /**
   * Migrate local lists to authenticated user
   * Called when user logs in to associate their local data with their account
   */
  async migrateLocalListsToUser(userId: string): Promise<number> {
    if (!this.isBrowser || !this.db) return 0;

    try {
      // Find all lists with userId 'local'
      const localLists = await this.db.lists
        .find({
          selector: {
            userId: 'local'
          }
        })
        .exec();

      // Update each list to the new userId
      for (const list of localLists) {
        await list.update({
          $set: {
            userId: userId,
            updatedAt: Date.now()
          }
        });
      }

      return localLists.length;
    } catch (error) {
      console.error('Error migrating local lists:', error);
      return 0;
    }
  }
  
  /**
   * Force migrate all lists to current user (for debugging)
   */
  async forceReclaimAllLists(): Promise<number> {
    if (!this.isBrowser || !this.db) return 0;
    
    const user = this.authService.currentUserValue;
    if (!user) {
      console.error('No user logged in');
      return 0;
    }

    try {
      const allLists = await this.db.lists.find().exec();

      for (const list of allLists) {
        await list.update({
          $set: {
            userId: user.userId,
            updatedAt: Date.now()
          }
        });
      }

      return allLists.length;
    } catch (error) {
      console.error('Error force reclaiming lists:', error);
      return 0;
    }
  }
}

// Re-export types for backward compatibility
export type { TierGroup, SortedList };
