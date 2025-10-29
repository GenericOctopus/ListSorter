import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { createRxDatabase, RxDatabase, RxCollection, removeRxDatabase, addRxPlugin } from 'rxdb';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';
import { replicateRxCollection, RxReplicationState } from 'rxdb/plugins/replication';
import { RxDBUpdatePlugin } from 'rxdb/plugins/update';
import { Observable, BehaviorSubject, firstValueFrom } from 'rxjs';
import { map } from 'rxjs/operators';
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
export class DatabaseService {
  private db: ListSorterDatabase | null = null;
  private replicationState: RxReplicationState<SortedListDocument, any> | null = null;
  private isBrowser: boolean;
  private dbReady: Promise<void>;
  private authService: AuthService;
  private syncStatusSubject = new BehaviorSubject<{ isSetup: boolean; isActive: boolean }>({
    isSetup: false,
    isActive: false
  });

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
      this.authService.currentUser$.subscribe((user) => {
        if (user) {
          this.setupSync();
        } else {
          this.cancelSync();
        }
      });
    }
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
        console.log('Database created successfully');
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

      console.log('Adding collections...');
      await this.db.addCollections({
        lists: {
          schema: sortedListSchema
        }
      });
      console.log('Collections added successfully');

      console.log('RxDB initialized and ready. Database:', this.db);
      console.log('Database name:', this.db.name);
      console.log('Collections:', Object.keys(this.db.collections));
      
      // Test query to verify database is working
      const testQuery = await this.db.lists.find().exec();
      console.log('Test query result - existing documents:', testQuery.length);
      
      // Set up sync if user is authenticated (don't await ensureReady since we're already initialized)
      this.setupSyncInternal();
    } catch (error) {
      console.error('Error initializing RxDB:', error);
      throw error;
    }
  }

  private async ensureReady(): Promise<void> {
    console.log('ensureReady: waiting for dbReady promise...');
    try {
      await this.dbReady;
      console.log('ensureReady: dbReady promise resolved');
    } catch (error) {
      console.error('ensureReady: dbReady promise rejected:', error);
      throw error;
    }
  }

  private async setupSync(): Promise<void> {
    await this.ensureReady();
    this.setupSyncInternal();
  }

  private async setupSyncInternal(): Promise<void> {
    if (!this.db || !this.isBrowser) return;

    const user = this.authService.currentUserValue;
    if (!user) return;

    try {
      // Migrate local lists to the authenticated user
      const migratedCount = await this.migrateLocalListsToUser(user.userId);
      if (migratedCount > 0) {
        console.log(`Migrated ${migratedCount} local lists to user account`);
      }

      // Cancel existing sync if any
      this.cancelSync();

      const appwriteConfig = await this.authService.getAppwriteConfig();
      if (!appwriteConfig) {
        console.error('Failed to get AppWrite configuration');
        return;
      }

      console.log('Setting up RxDB replication with AppWrite');

      // Set up replication with AppWrite
      this.replicationState = replicateRxCollection({
        collection: this.db.lists,
        replicationIdentifier: 'appwrite-lists-replication',
        live: true,
        retryTime: 5000,
        autoStart: true,
        pull: {
          async handler(lastCheckpoint: any, batchSize: number) {
            const newCheckpoint = lastCheckpoint || 0;
            try {
              const documents = await appwriteConfig.pullHandler(newCheckpoint, batchSize);
              return {
                documents: documents.map((d: SortedListDocument) => ({ ...d, _deleted: false })),
                checkpoint: documents.length > 0 
                  ? Math.max(...documents.map((d: SortedListDocument) => d.updatedAt))
                  : newCheckpoint
              };
            } catch (error) {
              console.error('Pull replication error:', error);
              return {
                documents: [],
                checkpoint: newCheckpoint
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

      // Listen to replication events
      this.replicationState.error$.subscribe(error => {
        console.error('Replication error:', error);
      });

      this.replicationState.active$.subscribe(active => {
        console.log('Replication active:', active);
        this.updateSyncStatus();
      });

      this.updateSyncStatus();
      console.log('Replication setup complete');
    } catch (error) {
      console.error('Error setting up sync:', error);
    }
  }

  private cancelSync(): void {
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
    console.log('saveSortedList called, isBrowser:', this.isBrowser);
    if (!this.isBrowser) {
      console.log('Not in browser, returning null');
      return null;
    }
    
    console.log('Ensuring database is ready...');
    await this.ensureReady();
    
    console.log('Database ready, db exists:', !!this.db);
    if (!this.db) {
      console.error('Database is null after ensureReady!');
      return null;
    }

    const user = this.authService.currentUserValue;
    const id = list._id || `list_${Date.now()}`;
    const now = Date.now();
    
    console.log('User:', user, 'ID:', id);

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
      console.log('Saving list with id:', id, 'userId:', doc.userId);
      
      // Check if document exists
      const existing = await this.db.lists.findOne({
        selector: { id: id }
      }).exec();
      
      if (existing) {
        console.log('Updating existing list');
        await existing.update({
          $set: doc
        });
      } else {
        console.log('Inserting new list');
        await this.db.lists.insert(doc);
      }
      
      console.log('List saved successfully');
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
      const docs = await this.db.lists
        .find({
          selector: {
            userId: userId
          },
          sort: [{ createdAt: 'desc' }]
        })
        .exec();

      console.log('getAllLists: Retrieved', docs.length, 'lists');
      return docs.map(doc => this.convertToSortedList(doc.toJSON() as SortedListDocument));
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

    const user = this.authService.currentUserValue;
    const userId = user ? user.userId : 'local';

    return this.db.lists
      .find({
        selector: {
          userId: userId
        },
        sort: [{ createdAt: 'desc' }]
      })
      .$.pipe(
        map((docs: any[]) => docs.map((doc: any) => this.convertToSortedList(doc.toJSON() as SortedListDocument)))
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
      const doc = await this.db.lists.findOne({
        selector: { id: id }
      }).exec();
      if (doc) {
        await doc.remove();
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

      console.log(`Migrating ${localLists.length} local lists to user ${userId}`);

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
}

// Re-export types for backward compatibility
export type { TierGroup, SortedList };
