import { Injectable } from '@angular/core';

export interface UXMetric {
  event: string;
  timestamp: number;
  duration?: number;
  element?: string;
  page?: string;
  data?: any;
}

@Injectable({
  providedIn: 'root'
})
export class UXMetricsService {
  private metrics: UXMetric[] = [];
  private pageLoadTime: number = 0;
  private interactionStartTime: number = 0;

  constructor() {
    this.trackPageLoad();
    this.trackUserInteractions();
  }

  trackPageLoad() {
    this.pageLoadTime = performance.now();
    
    window.addEventListener('load', () => {
      const loadTime = performance.now() - this.pageLoadTime;
      this.recordMetric({
        event: 'page_load',
        timestamp: Date.now(),
        duration: loadTime,
        page: window.location.pathname
      });
    });
  }

  trackUserInteractions() {
    // Track clicks
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      this.recordMetric({
        event: 'click',
        timestamp: Date.now(),
        element: this.getElementSelector(target),
        page: window.location.pathname
      });
    });

    // Track form interactions
    document.addEventListener('focusin', (event) => {
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        this.interactionStartTime = Date.now();
      }
    });

    document.addEventListener('focusout', (event) => {
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        const duration = Date.now() - this.interactionStartTime;
        this.recordMetric({
          event: 'form_interaction',
          timestamp: Date.now(),
          duration,
          element: this.getElementSelector(target),
          page: window.location.pathname
        });
      }
    });

    // Track scroll depth
    let maxScrollDepth = 0;
    window.addEventListener('scroll', () => {
      const scrollDepth = (window.scrollY + window.innerHeight) / document.body.scrollHeight;
      if (scrollDepth > maxScrollDepth) {
        maxScrollDepth = scrollDepth;
        this.recordMetric({
          event: 'scroll_depth',
          timestamp: Date.now(),
          data: { depth: Math.round(scrollDepth * 100) },
          page: window.location.pathname
        });
      }
    });
  }

  trackCustomEvent(event: string, data?: any, duration?: number) {
    this.recordMetric({
      event,
      timestamp: Date.now(),
      duration,
      data,
      page: window.location.pathname
    });
  }

  trackTimeOnPage() {
    const startTime = Date.now();
    
    window.addEventListener('beforeunload', () => {
      const timeOnPage = Date.now() - startTime;
      this.recordMetric({
        event: 'time_on_page',
        timestamp: Date.now(),
        duration: timeOnPage,
        page: window.location.pathname
      });
    });
  }

  getMetrics(): UXMetric[] {
    return [...this.metrics];
  }

  getMetricsSummary() {
    const summary = {
      totalEvents: this.metrics.length,
      avgPageLoadTime: 0,
      avgTimeOnPage: 0,
      clickCount: 0,
      formInteractions: 0,
      maxScrollDepth: 0
    };

    const pageLoadMetrics = this.metrics.filter(m => m.event === 'page_load');
    if (pageLoadMetrics.length > 0) {
      summary.avgPageLoadTime = pageLoadMetrics.reduce((sum, m) => sum + (m.duration || 0), 0) / pageLoadMetrics.length;
    }

    const timeOnPageMetrics = this.metrics.filter(m => m.event === 'time_on_page');
    if (timeOnPageMetrics.length > 0) {
      summary.avgTimeOnPage = timeOnPageMetrics.reduce((sum, m) => sum + (m.duration || 0), 0) / timeOnPageMetrics.length;
    }

    summary.clickCount = this.metrics.filter(m => m.event === 'click').length;
    summary.formInteractions = this.metrics.filter(m => m.event === 'form_interaction').length;

    const scrollMetrics = this.metrics.filter(m => m.event === 'scroll_depth');
    if (scrollMetrics.length > 0) {
      summary.maxScrollDepth = Math.max(...scrollMetrics.map(m => m.data?.depth || 0));
    }

    return summary;
  }

  exportMetrics(): string {
    return JSON.stringify(this.metrics, null, 2);
  }

  clearMetrics() {
    this.metrics = [];
  }

  private recordMetric(metric: UXMetric) {
    this.metrics.push(metric);
    
    // Keep only last 1000 metrics
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }

    // Send to analytics service in production
    console.log('UX Metric:', metric);
  }

  private getElementSelector(element: HTMLElement): string {
    if (element.id) return `#${element.id}`;
    if (element.className) return `.${element.className.split(' ')[0]}`;
    return element.tagName.toLowerCase();
  }
}