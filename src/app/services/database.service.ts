import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { AuthService } from './auth.service';

export interface ListItem {
  _id?: string;
  _rev?: string;
  name: string;
  rank?: number;
  createdAt: Date;
}

export interface TierGroup {
  tier: string;
  items: string[];
}

export interface SortedList {
  _id?: string;
  _rev?: string;
  listName: string;
  items: string[];
  sortedItems?: string[];
  tieredItems?: TierGroup[];
  completed: boolean;
  createdAt: Date;
  completedAt?: Date;
}

@Injectable({
  providedIn: 'root'
})
export class DatabaseService {
  private db: any;
  private remoteDb: any;
  private syncHandler: any;
  private isBrowser: boolean;
  private dbReady: Promise<void>;
  private authService: AuthService;

  constructor() {
    const platformId = inject(PLATFORM_ID);
    this.authService = inject(AuthService);
    this.isBrowser = isPlatformBrowser(platformId);
    
    if (this.isBrowser) {
      // Only import and initialize PouchDB in the browser
      this.dbReady = import('pouchdb').then((PouchDB) => {
        this.db = new PouchDB.default('list-sorter-db');
        console.log('PouchDB initialized and ready');
        
        // Set up sync if user is authenticated
        this.setupSync();
      });
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

  private async ensureReady(): Promise<void> {
    await this.dbReady;
  }

  private async setupSync(): Promise<void> {
    await this.ensureReady();
    if (!this.db || !this.isBrowser) return;

    const user = this.authService.currentUserValue;
    if (!user) return;

    try {
      const syncConfig = await this.authService.getSyncConfig();
      if (!syncConfig) {
        console.error('Failed to get sync configuration');
        return;
      }

      // Cancel existing sync if any
      this.cancelSync();

      // Import PouchDB if not already imported
      const PouchDB = (await import('pouchdb')).default;

      // Create remote database URL with user credentials
      // Note: In production, you might want to use a proxy or different auth method
      const remoteUrl = `${syncConfig.couchUrl}/${syncConfig.dbName}`;
      
      console.log('Setting up sync with:', remoteUrl);

      this.remoteDb = new PouchDB(remoteUrl, {
        skip_setup: true, // Database already exists, created by auth server
      });

      // Set up bidirectional sync
      this.syncHandler = this.db.sync(this.remoteDb, {
        live: true,
        retry: true,
      })
        .on('change', (info: any) => {
          console.log('Sync change:', info);
        })
        .on('paused', (err: any) => {
          console.log('Sync paused:', err);
        })
        .on('active', () => {
          console.log('Sync resumed');
        })
        .on('denied', (err: any) => {
          console.error('Sync denied:', err);
        })
        .on('complete', (info: any) => {
          console.log('Sync complete:', info);
        })
        .on('error', (err: any) => {
          console.error('Sync error:', err);
        });

      console.log('Sync setup complete');
    } catch (error) {
      console.error('Error setting up sync:', error);
    }
  }

  private cancelSync(): void {
    if (this.syncHandler) {
      console.log('Cancelling sync');
      this.syncHandler.cancel();
      this.syncHandler = null;
    }
    if (this.remoteDb) {
      this.remoteDb = null;
    }
  }

  async forceSyncNow(): Promise<void> {
    if (!this.db || !this.remoteDb || !this.isBrowser) {
      console.log('Cannot force sync: database not ready or not syncing');
      return;
    }

    try {
      console.log('Forcing immediate sync...');
      await this.db.replicate.to(this.remoteDb);
      await this.db.replicate.from(this.remoteDb);
      console.log('Force sync complete');
    } catch (error) {
      console.error('Error during force sync:', error);
    }
  }

  getSyncStatus(): { isSetup: boolean; isActive: boolean } {
    return {
      isSetup: !!this.syncHandler,
      isActive: !!this.syncHandler && !!this.authService.currentUserValue,
    };
  }

  async saveListItem(item: ListItem): Promise<any> {
    if (!this.isBrowser) return null;
    await this.ensureReady();
    if (!this.db) return null;
    if (!item._id) {
      item._id = `item_${Date.now()}_${Math.random()}`;
    }
    return await this.db.put(item);
  }

  async saveSortedList(list: SortedList): Promise<any> {
    if (!this.isBrowser) return null;
    await this.ensureReady();
    if (!this.db) return null;
    if (!list._id) {
      list._id = `list_${Date.now()}`;
    }
    return await this.db.put(list);
  }

  async getSortedList(id: string): Promise<SortedList | null> {
    if (!this.isBrowser) return null;
    await this.ensureReady();
    if (!this.db) return null;
    try {
      return await this.db.get(id) as SortedList;
    } catch (error) {
      return null;
    }
  }

  async getAllLists(): Promise<SortedList[]> {
    if (!this.isBrowser) return [];
    await this.ensureReady();
    if (!this.db) return [];
    try {
      const result = await this.db.allDocs({
        include_docs: true,
        startkey: 'list_',
        endkey: 'list_\ufff0'
      });
      console.log('getAllLists: Retrieved', result.rows.length, 'lists');
      return result.rows.map((row: any) => row.doc as SortedList);
    } catch (error) {
      console.error('Error in getAllLists:', error);
      return [];
    }
  }

  async updateSortedList(list: SortedList): Promise<any> {
    if (!this.isBrowser) return null;
    await this.ensureReady();
    if (!this.db) return null;
    return await this.db.put(list);
  }

  async deleteList(id: string): Promise<any> {
    if (!this.isBrowser) return null;
    await this.ensureReady();
    if (!this.db) return null;
    const doc = await this.db.get(id);
    return await this.db.remove(doc);
  }

  async clearDatabase(): Promise<void> {
    if (!this.isBrowser) return;
    await this.ensureReady();
    if (!this.db) return;
    await this.db.destroy();
    const PouchDB = (await import('pouchdb')).default;
    this.db = new PouchDB('list-sorter-db');
  }
}
