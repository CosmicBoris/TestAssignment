import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { SupabaseService } from './supabase.service';
import { User } from '@supabase/supabase-js';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private supabase = inject(SupabaseService);
  private router = inject(Router);

  private _currentUser = signal<User | null>(null);
  public readonly currentUser = this._currentUser.asReadonly();
  
  private _initialized = signal<boolean>(false);
  public readonly initialized = this._initialized.asReadonly();
  
  private initPromise: Promise<void>;

  constructor() {
    this.initPromise = this.initializeAuth();
  }

  private async initializeAuth() {
    const { data: { session } } = await this.supabase.auth.getSession();
    this._currentUser.set(session?.user ?? null);
    this._initialized.set(true);

    this.supabase.auth.onAuthStateChange((event, session) => {
      const previousUser = this._currentUser();
      const newUser = session?.user ?? null;
      
      this._currentUser.set(newUser);
      
      if (event === 'SIGNED_OUT') {
        this.router.navigate(['/signin']);
      }
      
      if (event === 'SIGNED_IN' && !previousUser && newUser) {
        const currentPath = window.location.pathname;
        if (currentPath === '/signin' || currentPath === '/signup' || currentPath === '/') {
          this.router.navigate(['/app']);
        }
      }
      
      if (event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        if (newUser && !previousUser) {
          const currentPath = window.location.pathname;
          if (currentPath === '/signin' || currentPath === '/signup' || currentPath === '/') {
            this.router.navigate(['/app']);
          }
        }
      }
    });
  }
  
  async waitForInitialization(): Promise<void> {
    await this.initPromise;
  }

  async signUp(email: string, password: string) {
    const { data, error } = await this.supabase.auth.signUp({
      email,
      password
    });
    
    if (error) throw error;
    return data;
  }

  async signIn(email: string, password: string) {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) throw error;
    return data;
  }

  async signOut() {
    try {
      const { error } = await this.supabase.auth.signOut();
      if (error && error.message !== 'Auth session missing!') {
        throw error;
      }
    } catch (error: any) {
      if (error?.message !== 'Auth session missing!') {
        console.error('Sign out error:', error);
        throw error;
      }
    }
    
    this._currentUser.set(null);
  }

  getCurrentUser(): User | null {
    return this._currentUser();
  }

  isAuthenticated(): boolean {
    return this._currentUser() !== null;
  }
}
