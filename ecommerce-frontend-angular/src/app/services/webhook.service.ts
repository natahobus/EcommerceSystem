import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface WebhookConfig {
  id: string;
  url: string;
  events: string[];
  active: boolean;
  secret?: string;
}

@Injectable({
  providedIn: 'root'
})
export class WebhookService {
  private webhooks: WebhookConfig[] = [];

  constructor(private http: HttpClient) {}

  registerWebhook(config: WebhookConfig): Observable<any> {
    this.webhooks.push(config);
    console.log('Webhook registered:', config);
    return new Observable(observer => {
      observer.next({ success: true, id: config.id });
      observer.complete();
    });
  }

  triggerWebhook(event: string, data: any) {
    const activeWebhooks = this.webhooks.filter(w => w.active && w.events.includes(event));
    
    activeWebhooks.forEach(webhook => {
      const payload = {
        event,
        data,
        timestamp: new Date().toISOString(),
        webhook_id: webhook.id
      };

      this.sendWebhook(webhook.url, payload, webhook.secret);
    });
  }

  private sendWebhook(url: string, payload: any, secret?: string) {
    const headers: any = { 'Content-Type': 'application/json' };
    
    if (secret) {
      headers['X-Webhook-Signature'] = this.generateSignature(payload, secret);
    }

    this.http.post(url, payload, { headers }).subscribe({
      next: () => console.log('Webhook sent successfully'),
      error: (err) => console.error('Webhook failed:', err)
    });
  }

  private generateSignature(payload: any, secret: string): string {
    // Simple signature generation (in production use HMAC-SHA256)
    return btoa(JSON.stringify(payload) + secret);
  }

  getWebhooks(): WebhookConfig[] {
    return [...this.webhooks];
  }

  removeWebhook(id: string) {
    this.webhooks = this.webhooks.filter(w => w.id !== id);
  }
}