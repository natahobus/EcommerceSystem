import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  variables: string[];
}

interface EmailRequest {
  to: string;
  template: string;
  variables: Record<string, any>;
  priority: 'low' | 'normal' | 'high';
}

@Injectable({
  providedIn: 'root'
})
export class EmailService {
  private apiUrl = 'http://localhost:5000/api';
  
  private templates: EmailTemplate[] = [
    {
      id: 'order_confirmation',
      name: 'Order Confirmation',
      subject: 'Pedido #{orderId} confirmado',
      body: 'Olá {customerName}, seu pedido #{orderId} no valor de R${total} foi confirmado.',
      variables: ['orderId', 'customerName', 'total']
    },
    {
      id: 'payment_success',
      name: 'Payment Success',
      subject: 'Pagamento aprovado',
      body: 'Seu pagamento de R${amount} foi aprovado com sucesso.',
      variables: ['amount']
    },
    {
      id: 'low_stock_alert',
      name: 'Low Stock Alert',
      subject: 'Estoque baixo - {productName}',
      body: 'O produto {productName} está com estoque baixo: {stock} unidades.',
      variables: ['productName', 'stock']
    }
  ];

  constructor(private http: HttpClient) {}

  sendEmail(request: EmailRequest): Observable<any> {
    return this.http.post(`${this.apiUrl}/emails/send`, request);
  }

  getTemplates(): EmailTemplate[] {
    return this.templates;
  }

  renderTemplate(templateId: string, variables: Record<string, any>): string {
    const template = this.templates.find(t => t.id === templateId);
    if (!template) return '';

    let rendered = template.body;
    for (const [key, value] of Object.entries(variables)) {
      rendered = rendered.replace(new RegExp(`{${key}}`, 'g'), String(value));
    }
    return rendered;
  }

  scheduleEmail(request: EmailRequest, sendAt: Date): Observable<any> {
    return this.http.post(`${this.apiUrl}/emails/schedule`, { ...request, sendAt });
  }

  getEmailHistory(limit: number = 50): Observable<any> {
    return this.http.get(`${this.apiUrl}/emails/history?limit=${limit}`);
  }
}