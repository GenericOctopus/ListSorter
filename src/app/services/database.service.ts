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

export interface SortSession {
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

  constructor() {
    const platformId = inject(PLATFORM_ID);
    this.isBrowser = isPlatformBrowser(platformId);
    
    if (this.isBrowser) {
      // Only import and initialize PouchDB in the browser
      import('pouchdb').then((PouchDB) => {
        this.db = new PouchDB.default('list-sorter-db');
      });
    }
  }

  async saveListItem(item: ListItem): Promise<any> {
    if (!this.isBrowser || !this.db) return null;
    if (!item._id) {
      item._id = `item_${Date.now()}_${Math.random()}`;
    }
    return await this.db.put(item);
  }

  async saveSortSession(session: SortSession): Promise<any> {
    if (!this.isBrowser || !this.db) return null;
    if (!session._id) {
      session._id = `session_${Date.now()}`;
    }
    return await this.db.put(session);
  }

  async getSortSession(id: string): Promise<SortSession | null> {
    if (!this.isBrowser || !this.db) return null;
    try {
      return await this.db.get(id) as SortSession;
    } catch (error) {
      return null;
    }
  }

  async getAllSessions(): Promise<SortSession[]> {
    if (!this.isBrowser || !this.db) return [];
    const result = await this.db.allDocs({
      include_docs: true,
      startkey: 'session_',
      endkey: 'session_\ufff0'
    });
    return result.rows.map((row: any) => row.doc as SortSession);
  }

  async updateSortSession(session: SortSession): Promise<any> {
    if (!this.isBrowser || !this.db) return null;
    return await this.db.put(session);
  }

  async deleteSession(id: string): Promise<any> {
    if (!this.isBrowser || !this.db) return null;
    const doc = await this.db.get(id);
    return await this.db.remove(doc);
  }

  async clearDatabase(): Promise<void> {
    if (!this.isBrowser || !this.db) return;
    await this.db.destroy();
    const PouchDB = (await import('pouchdb')).default;
    this.db = new PouchDB('list-sorter-db');
  }
}
