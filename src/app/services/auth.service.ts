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
  private isOnlineSubject: BehaviorSubject<boolean>;
  public isOnline$: Observable<boolean>;
  private appwriteAvailableSubject: BehaviorSubject<boolean>;
  public appwriteAvailable$: Observable<boolean>;

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
    
    // Initialize connectivity tracking
    this.isOnlineSubject = new BehaviorSubject<boolean>(this.isBrowser ? navigator.onLine : false);
    this.isOnline$ = this.isOnlineSubject.asObservable();
    this.appwriteAvailableSubject = new BehaviorSubject<boolean>(false);
    this.appwriteAvailable$ = this.appwriteAvailableSubject.asObservable();
    
    if (this.isBrowser) {
      this.setupConnectivityListeners();
      this.checkCurrentSession();
      this.checkAppwriteConnection();
    }
  }

  private setupConnectivityListeners(): void {
    if (!this.isBrowser) return;

    // Listen for online/offline events
    window.addEventListener('online', () => {
      this.isOnlineSubject.next(true);
      this.checkAppwriteConnection();
    });

    window.addEventListener('offline', () => {
      this.isOnlineSubject.next(false);
      this.appwriteAvailableSubject.next(false);
    });
  }

  private async checkAppwriteConnection(): Promise<void> {
    if (!this.isBrowser || !navigator.onLine) {
      this.appwriteAvailableSubject.next(false);
      return;
    }

    try {
      // Check if we can reach Appwrite by trying to get account info
      // This will fail with 401 if not logged in, but that means Appwrite is reachable
      await this.account.get();
      // If we get here, we're connected and authenticated
      this.appwriteAvailableSubject.next(true);
    } catch (error: any) {
      // 401 means Appwrite is reachable but we're not authenticated - that's fine for showing auth
      if (error?.code === 401 || error?.type === 'general_unauthorized_scope') {
        this.appwriteAvailableSubject.next(true);
      } else {
        // Any other error means Appwrite is not reachable
        console.warn('Appwrite connection check failed:', error);
        this.appwriteAvailableSubject.next(false);
      }
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
      this.appwriteAvailableSubject.next(true);
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

  get isOnlineValue(): boolean {
    return this.isOnlineSubject.value;
  }

  get appwriteAvailableValue(): boolean {
    return this.appwriteAvailableSubject.value;
  }

  get canShowAuth(): boolean {
    return this.isOnlineValue && this.appwriteAvailableValue;
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
          // Build queries - only add greaterThan if we have a checkpoint
          const queries = [
            Query.equal('userId', userId),
            Query.limit(batchSize)
          ];
          
          // Only filter by updatedAt if we have a checkpoint (not initial sync)
          if (lastCheckpoint && lastCheckpoint > 0) {
            queries.push(Query.greaterThan('updatedAt', lastCheckpoint));
          }
          
          queries.push(Query.orderAsc('updatedAt'));

          const response = await this.databases.listDocuments(
            databaseId,
            collectionId,
            queries
          );

          return response.documents.map((doc: any) => ({
            id: doc.$id,
            listName: doc.listName,
            items: doc.items || [],
            sortedItems: doc.sortedItems || [],
            tieredItems: doc.tieredItems ? JSON.parse(doc.tieredItems) : [],
            completed: doc.completed,
            createdAt: doc.createdAt,
            completedAt: doc.completedAt || undefined,
            userId: doc.userId,
            updatedAt: doc.updatedAt
          }));
        } catch (error: any) {
          console.error('Pull handler error:', error.message || error);
          console.error('Error details:', { code: error.code, type: error.type });
          return [];
        }
      },

      pushHandler: async (docs: any[]): Promise<void> => {
        try {
          for (const docData of docs) {
            const doc = docData.newDocumentState;
            
            // Handle deletions
            if (docData.assumedMasterState?._deleted || doc._deleted) {
              try {
                await this.databases.deleteDocument(
                  databaseId,
                  collectionId,
                  doc.id
                );
              } catch (error: any) {
                // Ignore 404 errors (document already deleted)
                if (error.code !== 404) {
                  console.error('Failed to delete document:', doc.id, error);
                  throw error;
                }
              }
              continue; // Skip to next document
            }
            
            // Transform data for Appwrite
            const appwriteData: any = {
              listName: doc.listName,
              items: doc.items || [],
              sortedItems: doc.sortedItems || [],
              tieredItems: doc.tieredItems ? JSON.stringify(doc.tieredItems) : JSON.stringify([]),
              completed: doc.completed,
              createdAt: doc.createdAt,
              userId: doc.userId,
              updatedAt: doc.updatedAt
            };
            
            // Only include completedAt if it exists
            if (doc.completedAt !== null && doc.completedAt !== undefined) {
              appwriteData.completedAt = doc.completedAt;
            }
            
            try {
              // Try to create document first (more common for new lists)
              await this.databases.createDocument(
                databaseId,
                collectionId,
                doc.id,
                appwriteData
              );
            } catch (error: any) {
              // If document already exists, update it
              if (error.code === 409 || error.type === 'document_already_exists') {
                try {
                  await this.databases.updateDocument(
                    databaseId,
                    collectionId,
                    doc.id,
                    appwriteData
                  );
                } catch (updateError: any) {
                  console.error('Failed to update document:', doc.id, updateError);
                  throw updateError;
                }
              } else {
                console.error('Push error for doc:', doc.id, error);
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

  async requestPasswordReset(email: string): Promise<{ success: boolean; error?: string }> {
    if (!this.isBrowser) {
      return { success: false, error: 'Not in browser environment' };
    }

    try {
      // Get the current URL origin for the reset URL
      const resetUrl = `${window.location.origin}/reset-password`;
      
      await this.account.createRecovery(email, resetUrl);
      
      return { success: true };
    } catch (error: any) {
      console.error('Password reset request error:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to send password reset email' 
      };
    }
  }

  async completePasswordReset(
    userId: string, 
    secret: string, 
    password: string, 
    passwordConfirm: string
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.isBrowser) {
      return { success: false, error: 'Not in browser environment' };
    }

    // Validate passwords match on client side
    if (password !== passwordConfirm) {
      return { success: false, error: 'Passwords do not match' };
    }

    try {
      await this.account.updateRecovery(userId, secret, password);
      
      return { success: true };
    } catch (error: any) {
      console.error('Password reset completion error:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to reset password' 
      };
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
