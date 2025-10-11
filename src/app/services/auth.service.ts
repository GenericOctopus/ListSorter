import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, Observable } from 'rxjs';
import { Client, Account, Databases, Query, Models, ID } from 'appwrite';
import { environment } from '../../environments/environment';
import { SortedListDocument } from './rxdb-schemas';

export interface AuthUser {
  userId: string;
  email: string;
  name: string;
}

export interface AppwriteReplicationConfig {
  pullHandler: (lastCheckpoint: number, batchSize: number) => Promise<SortedListDocument[]>;
  pushHandler: (docs: any[]) => Promise<void>;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private client: Client;
  private account: Account;
  private databases: Databases;
  private currentUserSubject: BehaviorSubject<AuthUser | null>;
  public currentUser$: Observable<AuthUser | null>;
  private isBrowser: boolean;

  constructor() {
    const platformId = inject(PLATFORM_ID);
    this.isBrowser = isPlatformBrowser(platformId);
    
    // Initialize AppWrite client
    this.client = new Client();
    this.client
      .setEndpoint(environment.appwrite.endpoint)
      .setProject(environment.appwrite.projectId);
    
    this.account = new Account(this.client);
    this.databases = new Databases(this.client);
    
    // Initialize with current session if available
    this.currentUserSubject = new BehaviorSubject<AuthUser | null>(null);
    this.currentUser$ = this.currentUserSubject.asObservable();
    
    if (this.isBrowser) {
      this.checkCurrentSession();
    }
  }

  private async checkCurrentSession(): Promise<void> {
    try {
      const session = await this.account.get();
      this.currentUserSubject.next({
        userId: session.$id,
        email: session.email,
        name: session.name
      });
    } catch (error) {
      // No active session
      this.currentUserSubject.next(null);
    }
  }

  get currentUserValue(): AuthUser | null {
    return this.currentUserSubject.value;
  }

  get isAuthenticated(): boolean {
    return !!this.currentUserValue;
  }

  async register(email: string, password: string, name: string): Promise<{ success: boolean; error?: string }> {
    if (!this.isBrowser) {
      return { success: false, error: 'Not in browser environment' };
    }

    try {
      // Create account
      await this.account.create(ID.unique(), email, password, name);
      
      // Automatically log in after registration
      const session = await this.account.createEmailPasswordSession(email, password);
      
      this.currentUserSubject.next({
        userId: session.userId,
        email: email,
        name: name
      });

      return { success: true };
    } catch (error: any) {
      console.error('Registration error:', error);
      return { 
        success: false, 
        error: error.message || 'Registration failed' 
      };
    }
  }

  async login(email: string, password: string): Promise<{ success: boolean; error?: string }> {
    if (!this.isBrowser) {
      return { success: false, error: 'Not in browser environment' };
    }

    try {
      const session = await this.account.createEmailPasswordSession(email, password);
      
      const user = await this.account.get();
      this.currentUserSubject.next({
        userId: user.$id,
        email: user.email,
        name: user.name
      });

      return { success: true };
    } catch (error: any) {
      console.error('Login error:', error);
      return { 
        success: false, 
        error: error.message || 'Login failed' 
      };
    }
  }

  async verifyToken(): Promise<boolean> {
    if (!this.isBrowser) {
      return false;
    }

    try {
      await this.account.get();
      return true;
    } catch (error) {
      this.logout();
      return false;
    }
  }

  async getAppwriteConfig(): Promise<AppwriteReplicationConfig | null> {
    if (!this.isBrowser || !this.currentUserValue) {
      return null;
    }

    const userId = this.currentUserValue.userId;
    const databaseId = environment.appwrite.databaseId;
    const collectionId = environment.appwrite.collectionsId.lists;

    return {
      pullHandler: async (lastCheckpoint: number, batchSize: number): Promise<SortedListDocument[]> => {
        try {
          const queries = [
            Query.equal('userId', userId),
            Query.greaterThan('updatedAt', lastCheckpoint),
            Query.limit(batchSize),
            Query.orderAsc('updatedAt')
          ];

          const response = await this.databases.listDocuments(
            databaseId,
            collectionId,
            queries
          );

          return response.documents.map((doc: any) => ({
            id: doc.$id,
            listName: doc.listName,
            items: doc.items,
            sortedItems: doc.sortedItems,
            tieredItems: doc.tieredItems,
            completed: doc.completed,
            createdAt: doc.createdAt,
            completedAt: doc.completedAt,
            userId: doc.userId,
            updatedAt: doc.updatedAt
          }));
        } catch (error) {
          console.error('Pull handler error:', error);
          return [];
        }
      },

      pushHandler: async (docs: any[]): Promise<void> => {
        try {
          for (const docData of docs) {
            const doc = docData.newDocumentState;
            
            try {
              // Try to update existing document
              await this.databases.updateDocument(
                databaseId,
                collectionId,
                doc.id,
                {
                  listName: doc.listName,
                  items: doc.items,
                  sortedItems: doc.sortedItems || [],
                  tieredItems: doc.tieredItems || [],
                  completed: doc.completed,
                  createdAt: doc.createdAt,
                  completedAt: doc.completedAt,
                  userId: doc.userId,
                  updatedAt: doc.updatedAt
                }
              );
            } catch (error: any) {
              // If document doesn't exist, create it
              if (error.code === 404) {
                await this.databases.createDocument(
                  databaseId,
                  collectionId,
                  doc.id,
                  {
                    listName: doc.listName,
                    items: doc.items,
                    sortedItems: doc.sortedItems || [],
                    tieredItems: doc.tieredItems || [],
                    completed: doc.completed,
                    createdAt: doc.createdAt,
                    completedAt: doc.completedAt,
                    userId: doc.userId,
                    updatedAt: doc.updatedAt
                  }
                );
              } else {
                throw error;
              }
            }
          }
        } catch (error) {
          console.error('Push handler error:', error);
          throw error;
        }
      }
    };
  }

  async checkServerAvailability(): Promise<boolean> {
    if (!this.isBrowser) {
      return false;
    }

    try {
      await this.account.get();
      return true;
    } catch (error) {
      return false;
    }
  }

  async logout(): Promise<void> {
    if (!this.isBrowser) return;

    try {
      await this.account.deleteSession('current');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.currentUserSubject.next(null);
    }
  }

  getClient(): Client {
    return this.client;
  }

  getAccount(): Account {
    return this.account;
  }

  getDatabases(): Databases {
    return this.databases;
  }
}
