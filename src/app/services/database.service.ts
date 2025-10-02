import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

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
  private isBrowser: boolean;
  private dbReady: Promise<void>;

  constructor() {
    const platformId = inject(PLATFORM_ID);
    this.isBrowser = isPlatformBrowser(platformId);
    
    if (this.isBrowser) {
      // Only import and initialize PouchDB in the browser
      this.dbReady = import('pouchdb').then((PouchDB) => {
        this.db = new PouchDB.default('list-sorter-db');
        console.log('PouchDB initialized and ready');
      });
    } else {
      this.dbReady = Promise.resolve();
    }
  }

  private async ensureReady(): Promise<void> {
    await this.dbReady;
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
