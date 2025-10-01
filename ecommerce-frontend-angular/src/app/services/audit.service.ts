import { Injectable } from '@angular/core';

export interface AuditLog {
  action: string;
  timestamp: Date;
  userId?: string;
  details?: any;
}

@Injectable({
  providedIn: 'root'
})
export class AuditService {
  private logs: AuditLog[] = [];

  log(action: string, details?: any, userId?: string) {
    const auditLog: AuditLog = {
      action,
      timestamp: new Date(),
      userId,
      details
    };
    
    this.logs.push(auditLog);
    console.log('Audit:', auditLog);
  }

  getLogs(): AuditLog[] {
    return [...this.logs];
  }

  clearLogs() {
    this.logs = [];
  }
}