import { Injectable, OnDestroy, inject, signal, computed, effect } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';
import { interval, Subscription } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';

export interface TabInfo {
  userId: string;
  deviceId: string;
  tabId: string;
  userAgent: string;
  isActive: boolean;
  lastSeen: string;
  createdAt: string;
}

export interface TabState {
  state: 'active' | 'idle' | 'stale';
  tab: TabInfo;
  isCurrentTab: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class TabTrackingService implements OnDestroy {
  private supabase = inject(SupabaseService);
  private auth = inject(AuthService);

  private deviceId: string;
  private tabId: string;
  private isTabActive: boolean;
  private heartbeatSubscription?: Subscription;
  private realtimeSubscription?: any;
  private stateRecomputeSubscription?: Subscription;
  
  private readonly ACTIVE_HEARTBEAT_INTERVAL = 5000;
  private readonly BACKGROUND_HEARTBEAT_INTERVAL = 30000;
  private readonly STATE_RECOMPUTE_INTERVAL = 2000;
  
  private readonly ACTIVE_THRESHOLD = 15;
  private readonly IDLE_THRESHOLD = 60;
  
  private rawTabs = signal<TabInfo[]>([]);
  private currentTime = signal<number>(Date.now());
  
  public readonly allTabs = computed(() => {
    this.currentTime();
    const raw = this.rawTabs();
    return raw.map(tab => this.computeTabState(tab));
  });
  
  public readonly activeTabs = computed(() => 
    this.allTabs().filter(t => t.state === 'active')
  );
  public readonly idleTabs = computed(() => 
    this.allTabs().filter(t => t.state === 'idle')
  );
  public readonly staleTabs = computed(() => 
    this.allTabs().filter(t => t.state === 'stale')
  );

  constructor() {
    this.deviceId = this.getOrCreateDeviceId();
    this.tabId = this.getOrCreateTabId();
    
    this.isTabActive = !document.hidden;
    
    this.setupVisibilityTracking();
    this.setupAuthTracking();
  }

  private getOrCreateDeviceId(): string {
    let deviceId = localStorage.getItem('deviceId');
    if (!deviceId) {
      deviceId = this.generateUUID();
      localStorage.setItem('deviceId', deviceId);
    }
    return deviceId;
  }

  private getOrCreateTabId(): string {
    let tabId = sessionStorage.getItem('tabId');
    if (!tabId) {
      tabId = this.generateUUID();
      sessionStorage.setItem('tabId', tabId);
    }
    return tabId;
  }

  private generateUUID(): string {
    return uuidv4();
  }

  private setupVisibilityTracking() {
    document.addEventListener('visibilitychange', () => {
      this.isTabActive = !document.hidden;
      this.updateHeartbeatInterval();
      
      if (this.isTabActive) {
        this.sendHeartbeat();
      }
    });

    window.addEventListener('focus', () => {
      this.isTabActive = true;
      this.updateHeartbeatInterval();
      this.sendHeartbeat();
    });

    window.addEventListener('blur', () => {
      this.isTabActive = false;
      this.updateHeartbeatInterval();
    });
  }

  private setupAuthTracking() {
    effect(() => {
      const user = this.auth.currentUser();
      if (user) {
        this.startTracking();
      } else {
        this.stopTracking();
      }
    });
  }

  private async startTracking() {
    await this.sendHeartbeat();
    this.startHeartbeat();
    this.startStateRecompute();
    this.subscribeToTabs();
    await this.loadTabs();
  }

  private stopTracking() {
    if (this.heartbeatSubscription) {
      this.heartbeatSubscription.unsubscribe();
      this.heartbeatSubscription = undefined;
    }
    
    if (this.stateRecomputeSubscription) {
      this.stateRecomputeSubscription.unsubscribe();
      this.stateRecomputeSubscription = undefined;
    }
    
    if (this.realtimeSubscription) {
      this.realtimeSubscription.unsubscribe();
      this.realtimeSubscription = undefined;
    }
    
    this.rawTabs.set([]);
  }

  private startHeartbeat() {
    if (this.heartbeatSubscription) {
      this.heartbeatSubscription.unsubscribe();
    }

    const interval_ms = this.isTabActive 
      ? this.ACTIVE_HEARTBEAT_INTERVAL 
      : this.BACKGROUND_HEARTBEAT_INTERVAL;

    this.heartbeatSubscription = interval(interval_ms).subscribe(() => {
      this.sendHeartbeat();
    });
  }

  private updateHeartbeatInterval() {
    this.startHeartbeat();
  }

  private startStateRecompute() {
    if (this.stateRecomputeSubscription) {
      this.stateRecomputeSubscription.unsubscribe();
    }

    this.stateRecomputeSubscription = interval(this.STATE_RECOMPUTE_INTERVAL).subscribe(() => {
      this.currentTime.set(Date.now());
    });
  }

  private async sendHeartbeat() {
    const user = this.auth.getCurrentUser();
    if (!user) return;

    const now = new Date().toISOString();
    const tabData = {
      user_id: user.id,
      device_id: this.deviceId,
      tab_id: this.tabId,
      user_agent: navigator.userAgent,
      is_active: this.isTabActive,
      last_seen: now
    };

    try {
      const { error } = await this.supabase.db
        .from('user_tabs')
        .upsert(tabData, {
          onConflict: 'user_id,device_id,tab_id'
        });

      if (error) {
        console.error('Error sending heartbeat:', error);
        return;
      }

      this.updateLocalTabState({
        userId: user.id,
        deviceId: this.deviceId,
        tabId: this.tabId,
        userAgent: navigator.userAgent,
        isActive: this.isTabActive,
        lastSeen: now,
        createdAt: now
      });
    } catch (error) {
      console.error('Error sending heartbeat:', error);
    }
  }

  private updateLocalTabState(updatedTab: TabInfo) {
    const currentTabs = this.rawTabs();
    const existingIndex = currentTabs.findIndex(
      tab => tab.tabId === updatedTab.tabId && 
             tab.deviceId === updatedTab.deviceId
    );

    if (existingIndex >= 0) {
      const newTabs = [...currentTabs];
      newTabs[existingIndex] = { ...currentTabs[existingIndex], ...updatedTab };
      this.rawTabs.set(newTabs);
    } else {
      this.rawTabs.set([...currentTabs, updatedTab]);
    }
  }

  private subscribeToTabs() {
    const user = this.auth.getCurrentUser();
    if (!user) return;

    this.realtimeSubscription = this.supabase.db
      .channel('user_tabs_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_tabs',
          filter: `user_id=eq.${user.id}`
        },
        () => this.loadTabs()
      )
      .subscribe();
  }

  private async loadTabs() {
    const user = this.auth.getCurrentUser();
    if (!user) return;

    try {
      const { data, error } = await this.supabase.db
        .from('user_tabs')
        .select('*')
        .eq('user_id', user.id)
        .order('last_seen', { ascending: false });

      if (error) {
        console.error('Error loading tabs:', error);
        return;
      }

      const tabs = (data || []).map(tab => this.mapToTabInfo(tab));
      this.rawTabs.set(tabs);
    } catch (error) {
      console.error('Error loading tabs:', error);
    }
  }

  private mapToTabInfo(dbRow: any): TabInfo {
    return {
      userId: dbRow.user_id,
      deviceId: dbRow.device_id,
      tabId: dbRow.tab_id,
      userAgent: dbRow.user_agent,
      isActive: dbRow.is_active,
      lastSeen: dbRow.last_seen,
      createdAt: dbRow.created_at
    };
  }

  private computeTabState(tab: TabInfo): TabState {
    const lastSeenDate = new Date(tab.lastSeen);
    const now = new Date();
    const secondsSinceLastSeen = (now.getTime() - lastSeenDate.getTime()) / 1000;

    let state: 'active' | 'idle' | 'stale';
    
    if (secondsSinceLastSeen < this.ACTIVE_THRESHOLD && tab.isActive) {
      state = 'active';
    } else if (secondsSinceLastSeen < this.IDLE_THRESHOLD) {
      state = 'idle';
    } else {
      state = 'stale';
    }

    return {
      state,
      tab,
      isCurrentTab: tab.tabId === this.tabId
    };
  }

  getCurrentTabId(): string {
    return this.tabId;
  }

  getCurrentDeviceId(): string {
    return this.deviceId;
  }

  ngOnDestroy() {
    this.stopTracking();
  }
}
