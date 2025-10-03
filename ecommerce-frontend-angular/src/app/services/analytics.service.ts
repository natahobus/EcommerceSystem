import { Injectable } from '@angular/core';

export interface AnalyticsEvent {
  event: string;
  category: string;
  action: string;
  label?: string;
  value?: number;
  timestamp: Date;
}

@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {
  private events: AnalyticsEvent[] = [];

  track(category: string, action: string, label?: string, value?: number) {
    const event: AnalyticsEvent = {
      event: 'track',
      category,
      action,
      label,
      value,
      timestamp: new Date()
    };
    
    this.events.push(event);
    console.log('Analytics:', event);
  }

  getEvents(): AnalyticsEvent[] {
    return [...this.events];
  }

  clearEvents() {
    this.events = [];
  }
}