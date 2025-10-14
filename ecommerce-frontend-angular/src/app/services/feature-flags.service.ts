import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface FeatureFlag {
  key: string;
  enabled: boolean;
  description: string;
  rolloutPercentage: number;
  conditions?: any;
}

@Injectable({
  providedIn: 'root'
})
export class FeatureFlagsService {
  private flags: { [key: string]: FeatureFlag } = {
    'new_checkout': {
      key: 'new_checkout',
      enabled: true,
      description: 'New checkout flow',
      rolloutPercentage: 50
    },
    'ai_recommendations': {
      key: 'ai_recommendations',
      enabled: true,
      description: 'AI-powered product recommendations',
      rolloutPercentage: 100
    },
    'voice_search': {
      key: 'voice_search',
      enabled: false,
      description: 'Voice search functionality',
      rolloutPercentage: 25
    },
    'dark_mode': {
      key: 'dark_mode',
      enabled: true,
      description: 'Dark mode theme',
      rolloutPercentage: 100
    },
    'advanced_filters': {
      key: 'advanced_filters',
      enabled: true,
      description: 'Advanced product filters',
      rolloutPercentage: 75
    }
  };

  private flagsSubject = new BehaviorSubject<{ [key: string]: FeatureFlag }>(this.flags);
  public flags$ = this.flagsSubject.asObservable();

  isEnabled(flagKey: string, userId?: string): boolean {
    const flag = this.flags[flagKey];
    if (!flag || !flag.enabled) {
      return false;
    }

    // Check rollout percentage
    if (flag.rolloutPercentage < 100) {
      const userHash = this.getUserHash(userId || 'anonymous');
      const userPercentage = userHash % 100;
      return userPercentage < flag.rolloutPercentage;
    }

    return true;
  }

  getAllFlags(): { [key: string]: FeatureFlag } {
    return { ...this.flags };
  }

  updateFlag(key: string, updates: Partial<FeatureFlag>) {
    if (this.flags[key]) {
      this.flags[key] = { ...this.flags[key], ...updates };
      this.flagsSubject.next({ ...this.flags });
      this.saveFlags();
    }
  }

  addFlag(flag: FeatureFlag) {
    this.flags[flag.key] = flag;
    this.flagsSubject.next({ ...this.flags });
    this.saveFlags();
  }

  removeFlag(key: string) {
    delete this.flags[key];
    this.flagsSubject.next({ ...this.flags });
    this.saveFlags();
  }

  getEnabledFeatures(userId?: string): string[] {
    return Object.keys(this.flags).filter(key => this.isEnabled(key, userId));
  }

  private getUserHash(userId: string): number {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  private saveFlags() {
    localStorage.setItem('featureFlags', JSON.stringify(this.flags));
  }

  private loadFlags() {
    const stored = localStorage.getItem('featureFlags');
    if (stored) {
      this.flags = { ...this.flags, ...JSON.parse(stored) };
      this.flagsSubject.next({ ...this.flags });
    }
  }

  // Utility methods for common feature checks
  isNewCheckoutEnabled(userId?: string): boolean {
    return this.isEnabled('new_checkout', userId);
  }

  isAIRecommendationsEnabled(userId?: string): boolean {
    return this.isEnabled('ai_recommendations', userId);
  }

  isVoiceSearchEnabled(userId?: string): boolean {
    return this.isEnabled('voice_search', userId);
  }

  isDarkModeEnabled(userId?: string): boolean {
    return this.isEnabled('dark_mode', userId);
  }
}