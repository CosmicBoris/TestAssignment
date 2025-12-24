import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { TabTrackingService, TabState } from '../../services/tab-tracking.service';
import * as FormatUtils from '../../utils';

interface DeviceGroup {
  deviceId: string;
  tabs: TabState[];
}

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent {
  private auth = inject(AuthService);
  private tabTracking = inject(TabTrackingService);
  private router = inject(Router);

  readonly activeTabs = this.tabTracking.activeTabs;
  readonly idleTabs = this.tabTracking.idleTabs;
  readonly staleTabs = this.tabTracking.staleTabs;
  
  readonly deviceGroups = computed(() => {
    const tabs = this.tabTracking.allTabs();
    const groups = new Map<string, TabState[]>();
    
    tabs.forEach((tab: TabState) => {
      const deviceId = tab.tab.deviceId;
      if (!groups.has(deviceId)) {
        groups.set(deviceId, []);
      }
      groups.get(deviceId)!.push(tab);
    });

    return Array.from(groups.entries()).map(([deviceId, tabs]) => ({
      deviceId,
      tabs: tabs.sort((a: TabState, b: TabState) => {
        if (a.isCurrentTab) return -1;
        if (b.isCurrentTab) return 1;
        return new Date(b.tab.lastSeen).getTime() - new Date(a.tab.lastSeen).getTime();
      })
    }));
  });

  userEmail = computed(() => this.auth.currentUser()?.email || '');

  getStateClass = FormatUtils.getStateClass;
  getStateLabel = FormatUtils.getStateLabel;
  formatLastSeen = FormatUtils.formatLastSeen;
  formatUserAgent = FormatUtils.formatUserAgent;

  getDeviceLabel(deviceId: string, index: number): string {
    const currentDeviceId = this.tabTracking.getCurrentDeviceId();
    return FormatUtils.getDeviceLabel(deviceId, currentDeviceId, index);
  }

  async signOut() {
    try {
      await this.auth.signOut();
    } catch (error) {
      console.error('Error signing out:', error);
      this.router.navigate(['/signin']);
    }
  }
}

