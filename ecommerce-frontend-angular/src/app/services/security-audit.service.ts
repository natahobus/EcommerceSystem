import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

interface SecurityEvent {
  id: string;
  type: 'login_attempt' | 'suspicious_activity' | 'data_access' | 'permission_change';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  timestamp: Date;
  userAgent?: string;
  ipAddress?: string;
  userId?: string;
  metadata?: any;
}

interface SecurityMetrics {
  totalEvents: number;
  criticalEvents: number;
  suspiciousActivities: number;
  blockedAttempts: number;
  lastAudit: Date;
}

@Injectable({
  providedIn: 'root'
})
export class SecurityAuditService {
  private events: SecurityEvent[] = [];
  private metrics = new BehaviorSubject<SecurityMetrics>({
    totalEvents: 0,
    criticalEvents: 0,
    suspiciousActivities: 0,
    blockedAttempts: 0,
    lastAudit: new Date()
  });

  private suspiciousPatterns = [
    /script/i,
    /javascript:/i,
    /onload/i,
    /onerror/i,
    /<script/i,
    /eval\(/i,
    /document\.cookie/i
  ];

  logSecurityEvent(event: Omit<SecurityEvent, 'id' | 'timestamp'>): void {
    const securityEvent: SecurityEvent = {
      ...event,
      id: this.generateEventId(),
      timestamp: new Date()
    };

    this.events.push(securityEvent);
    this.updateMetrics();
    
    // Alert on critical events
    if (event.severity === 'critical') {
      this.alertCriticalEvent(securityEvent);
    }

    // Keep only last 1000 events
    if (this.events.length > 1000) {
      this.events = this.events.slice(-1000);
    }
  }

  validateInput(input: string): { isValid: boolean; threats: string[] } {
    const threats: string[] = [];
    
    for (const pattern of this.suspiciousPatterns) {
      if (pattern.test(input)) {
        threats.push(`Suspicious pattern detected: ${pattern.source}`);
      }
    }

    // Check for SQL injection patterns
    const sqlPatterns = [
      /union\s+select/i,
      /drop\s+table/i,
      /delete\s+from/i,
      /insert\s+into/i,
      /update\s+set/i,
      /--/,
      /;/
    ];

    for (const pattern of sqlPatterns) {
      if (pattern.test(input)) {
        threats.push(`Potential SQL injection: ${pattern.source}`);
      }
    }

    if (threats.length > 0) {
      this.logSecurityEvent({
        type: 'suspicious_activity',
        severity: 'high',
        description: `Malicious input detected: ${threats.join(', ')}`,
        metadata: { input: input.substring(0, 100) }
      });
    }

    return {
      isValid: threats.length === 0,
      threats
    };
  }

  checkRateLimiting(userId: string, action: string): boolean {
    const now = Date.now();
    const timeWindow = 60000; // 1 minute
    const maxAttempts = 10;

    const recentEvents = this.events.filter(event => 
      event.userId === userId &&
      event.metadata?.action === action &&
      now - event.timestamp.getTime() < timeWindow
    );

    if (recentEvents.length >= maxAttempts) {
      this.logSecurityEvent({
        type: 'suspicious_activity',
        severity: 'medium',
        description: `Rate limit exceeded for user ${userId} on action ${action}`,
        userId,
        metadata: { action, attempts: recentEvents.length }
      });
      return false;
    }

    return true;
  }

  auditDataAccess(resource: string, userId: string, action: string): void {
    this.logSecurityEvent({
      type: 'data_access',
      severity: 'low',
      description: `User ${userId} performed ${action} on ${resource}`,
      userId,
      metadata: { resource, action }
    });
  }

  detectAnomalousActivity(userId: string, currentActivity: any): boolean {
    const userEvents = this.events.filter(e => e.userId === userId);
    
    // Check for unusual time patterns
    const now = new Date();
    const isUnusualTime = now.getHours() < 6 || now.getHours() > 22;
    
    // Check for rapid successive actions
    const recentEvents = userEvents.filter(e => 
      now.getTime() - e.timestamp.getTime() < 5000 // 5 seconds
    );
    
    if (isUnusualTime && recentEvents.length > 5) {
      this.logSecurityEvent({
        type: 'suspicious_activity',
        severity: 'medium',
        description: `Anomalous activity detected for user ${userId}: unusual time and rapid actions`,
        userId,
        metadata: { currentActivity, eventCount: recentEvents.length }
      });
      return true;
    }

    return false;
  }

  getSecurityMetrics(): Observable<SecurityMetrics> {
    return this.metrics.asObservable();
  }

  getRecentEvents(limit: number = 50): SecurityEvent[] {
    return this.events
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  getCriticalEvents(): SecurityEvent[] {
    return this.events.filter(e => e.severity === 'critical');
  }

  generateSecurityReport(): any {
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    const recentEvents = this.events.filter(e => e.timestamp >= last24Hours);
    
    const eventsByType = recentEvents.reduce((acc, event) => {
      acc[event.type] = (acc[event.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const eventsBySeverity = recentEvents.reduce((acc, event) => {
      acc[event.severity] = (acc[event.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      reportDate: now,
      period: '24 hours',
      totalEvents: recentEvents.length,
      eventsByType,
      eventsBySeverity,
      topThreats: this.getTopThreats(recentEvents),
      recommendations: this.generateRecommendations(recentEvents)
    };
  }

  private generateEventId(): string {
    return `sec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private updateMetrics(): void {
    const metrics: SecurityMetrics = {
      totalEvents: this.events.length,
      criticalEvents: this.events.filter(e => e.severity === 'critical').length,
      suspiciousActivities: this.events.filter(e => e.type === 'suspicious_activity').length,
      blockedAttempts: this.events.filter(e => e.metadata?.blocked).length,
      lastAudit: new Date()
    };

    this.metrics.next(metrics);
  }

  private alertCriticalEvent(event: SecurityEvent): void {
    console.error('CRITICAL SECURITY EVENT:', event);
    
    // In a real application, this would send alerts via email, SMS, etc.
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Critical Security Alert', {
        body: event.description,
        icon: '/assets/security-alert.png'
      });
    }
  }

  private getTopThreats(events: SecurityEvent[]): any[] {
    const threats = events
      .filter(e => e.type === 'suspicious_activity')
      .map(e => e.description)
      .reduce((acc, desc) => {
        acc[desc] = (acc[desc] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    return Object.entries(threats)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([threat, count]) => ({ threat, count }));
  }

  private generateRecommendations(events: SecurityEvent[]): string[] {
    const recommendations: string[] = [];
    
    const criticalCount = events.filter(e => e.severity === 'critical').length;
    if (criticalCount > 0) {
      recommendations.push('Immediate review of critical security events required');
    }

    const suspiciousCount = events.filter(e => e.type === 'suspicious_activity').length;
    if (suspiciousCount > 10) {
      recommendations.push('Consider implementing additional rate limiting');
    }

    const loginAttempts = events.filter(e => e.type === 'login_attempt').length;
    if (loginAttempts > 50) {
      recommendations.push('Review authentication mechanisms and consider MFA');
    }

    return recommendations;
  }
}