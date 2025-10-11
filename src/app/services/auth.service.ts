import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, Observable } from 'rxjs';

export interface AuthUser {
  username: string;
  token: string;
  dbName: string;
}

export interface LoginResponse {
  message: string;
  token: string;
  username: string;
  dbName: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly AUTH_STORAGE_KEY = 'list_sorter_auth';
  private readonly AUTH_SERVER_URL = 'http://localhost:3001';
  
  private currentUserSubject: BehaviorSubject<AuthUser | null>;
  public currentUser$: Observable<AuthUser | null>;
  private isBrowser: boolean;

  constructor() {
    const platformId = inject(PLATFORM_ID);
    this.isBrowser = isPlatformBrowser(platformId);
    
    // Initialize with stored auth data if available
    const storedAuth = this.isBrowser ? this.getStoredAuth() : null;
    this.currentUserSubject = new BehaviorSubject<AuthUser | null>(storedAuth);
    this.currentUser$ = this.currentUserSubject.asObservable();
  }

  private getStoredAuth(): AuthUser | null {
    if (!this.isBrowser) return null;
    
    try {
      const stored = localStorage.getItem(this.AUTH_STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  private setStoredAuth(auth: AuthUser | null): void {
    if (!this.isBrowser) return;
    
    if (auth) {
      localStorage.setItem(this.AUTH_STORAGE_KEY, JSON.stringify(auth));
    } else {
      localStorage.removeItem(this.AUTH_STORAGE_KEY);
    }
  }

  get currentUserValue(): AuthUser | null {
    return this.currentUserSubject.value;
  }

  get isAuthenticated(): boolean {
    return !!this.currentUserValue;
  }

  async register(username: string, password: string): Promise<{ success: boolean; error?: string }> {
    if (!this.isBrowser) {
      return { success: false, error: 'Not in browser environment' };
    }

    try {
      const response = await fetch(`${this.AUTH_SERVER_URL}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || 'Registration failed' };
      }

      const authUser: AuthUser = {
        username: data.username,
        token: data.token,
        dbName: data.dbName,
      };

      this.setStoredAuth(authUser);
      this.currentUserSubject.next(authUser);

      return { success: true };
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, error: 'Network error. Please check if the auth server is running.' };
    }
  }

  async login(username: string, password: string): Promise<{ success: boolean; error?: string }> {
    if (!this.isBrowser) {
      return { success: false, error: 'Not in browser environment' };
    }

    try {
      const response = await fetch(`${this.AUTH_SERVER_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || 'Login failed' };
      }

      const authUser: AuthUser = {
        username: data.username,
        token: data.token,
        dbName: data.dbName,
      };

      this.setStoredAuth(authUser);
      this.currentUserSubject.next(authUser);

      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Network error. Please check if the auth server is running.' };
    }
  }

  async verifyToken(): Promise<boolean> {
    if (!this.isBrowser || !this.currentUserValue) {
      return false;
    }

    try {
      const response = await fetch(`${this.AUTH_SERVER_URL}/verify`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.currentUserValue.token}`,
        },
      });

      if (!response.ok) {
        this.logout();
        return false;
      }

      return true;
    } catch (error) {
      console.error('Token verification error:', error);
      return false;
    }
  }

  async getSyncConfig(): Promise<{ dbName: string; couchUrl: string; username: string } | null> {
    if (!this.isBrowser || !this.currentUserValue) {
      return null;
    }

    try {
      const response = await fetch(`${this.AUTH_SERVER_URL}/sync-config`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.currentUserValue.token}`,
        },
      });

      if (!response.ok) {
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting sync config:', error);
      return null;
    }
  }

  logout(): void {
    this.setStoredAuth(null);
    this.currentUserSubject.next(null);
  }

  getAuthHeader(): string | null {
    const user = this.currentUserValue;
    return user ? `Bearer ${user.token}` : null;
  }
}
