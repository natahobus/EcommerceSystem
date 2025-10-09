import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface EmailNotification {
  to: string;
  subject: string;
  body: string;
  type: 'order' | 'stock' | 'promotion' | 'system';
}

@Injectable({
  providedIn: 'root'
})
export class EmailNotificationService {
  private apiUrl = 'http://localhost:5000/api';

  constructor(private http: HttpClient) {}

  sendOrderConfirmation(email: string, orderId: string): Observable<any> {
    const notification: EmailNotification = {
      to: email,
      subject: `Pedido #${orderId} confirmado`,
      body: `Seu pedido #${orderId} foi confirmado e está sendo processado.`,
      type: 'order'
    };
    
    return this.sendEmail(notification);
  }

  sendStockAlert(email: string, productName: string): Observable<any> {
    const notification: EmailNotification = {
      to: email,
      subject: 'Produto em estoque!',
      body: `O produto "${productName}" está novamente disponível em estoque.`,
      type: 'stock'
    };
    
    return this.sendEmail(notification);
  }

  sendPromotionAlert(email: string, discount: number): Observable<any> {
    const notification: EmailNotification = {
      to: email,
      subject: 'Promoção especial!',
      body: `Aproveite ${discount}% de desconto em produtos selecionados!`,
      type: 'promotion'
    };
    
    return this.sendEmail(notification);
  }

  private sendEmail(notification: EmailNotification): Observable<any> {
    // Simula envio de email - em produção conectaria com serviço real
    console.log('Email enviado:', notification);
    return new Observable(observer => {
      setTimeout(() => {
        observer.next({ success: true, messageId: Date.now().toString() });
        observer.complete();
      }, 1000);
    });
  }

  scheduleEmail(notification: EmailNotification, sendAt: Date): Observable<any> {
    const delay = sendAt.getTime() - Date.now();
    
    return new Observable(observer => {
      if (delay <= 0) {
        this.sendEmail(notification).subscribe(observer);
      } else {
        setTimeout(() => {
          this.sendEmail(notification).subscribe(observer);
        }, delay);
      }
    });
  }
}