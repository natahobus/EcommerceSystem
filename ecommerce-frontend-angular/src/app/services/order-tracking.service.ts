import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';

interface TrackingEvent {
  id: string;
  orderId: string;
  status: OrderStatus;
  description: string;
  location?: string;
  timestamp: Date;
  estimatedDelivery?: Date;
}

enum OrderStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  PROCESSING = 'processing',
  SHIPPED = 'shipped',
  IN_TRANSIT = 'in_transit',
  OUT_FOR_DELIVERY = 'out_for_delivery',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
  RETURNED = 'returned'
}

interface OrderTracking {
  orderId: string;
  currentStatus: OrderStatus;
  events: TrackingEvent[];
  estimatedDelivery?: Date;
  trackingNumber?: string;
  carrier?: string;
}

@Injectable({
  providedIn: 'root'
})
export class OrderTrackingService {
  private apiUrl = 'http://localhost:5000/api';
  private trackingData = new Map<string, OrderTracking>();

  constructor(private http: HttpClient) {
    this.initializeMockData();
  }

  trackOrder(orderId: string): Observable<OrderTracking> {
    return this.http.get<OrderTracking>(`${this.apiUrl}/orders/${orderId}/tracking`);
  }

  getOrderStatus(orderId: string): OrderStatus | null {
    const tracking = this.trackingData.get(orderId);
    return tracking?.currentStatus || null;
  }

  updateOrderStatus(orderId: string, status: OrderStatus, description: string, location?: string): void {
    let tracking = this.trackingData.get(orderId);
    
    if (!tracking) {
      tracking = {
        orderId,
        currentStatus: status,
        events: [],
        trackingNumber: this.generateTrackingNumber(),
        carrier: 'Correios'
      };
      this.trackingData.set(orderId, tracking);
    }

    const event: TrackingEvent = {
      id: this.generateEventId(),
      orderId,
      status,
      description,
      location,
      timestamp: new Date()
    };

    tracking.events.push(event);
    tracking.currentStatus = status;

    // Update estimated delivery
    if (status === OrderStatus.SHIPPED) {
      tracking.estimatedDelivery = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000); // 5 days
    }
  }

  getStatusProgress(status: OrderStatus): number {
    const statusOrder = [
      OrderStatus.PENDING,
      OrderStatus.CONFIRMED,
      OrderStatus.PROCESSING,
      OrderStatus.SHIPPED,
      OrderStatus.IN_TRANSIT,
      OrderStatus.OUT_FOR_DELIVERY,
      OrderStatus.DELIVERED
    ];

    const index = statusOrder.indexOf(status);
    return index >= 0 ? ((index + 1) / statusOrder.length) * 100 : 0;
  }

  getStatusDescription(status: OrderStatus): string {
    const descriptions = {
      [OrderStatus.PENDING]: 'Pedido recebido e aguardando confirmação',
      [OrderStatus.CONFIRMED]: 'Pedido confirmado e sendo preparado',
      [OrderStatus.PROCESSING]: 'Pedido em processamento',
      [OrderStatus.SHIPPED]: 'Pedido enviado',
      [OrderStatus.IN_TRANSIT]: 'Pedido em trânsito',
      [OrderStatus.OUT_FOR_DELIVERY]: 'Saiu para entrega',
      [OrderStatus.DELIVERED]: 'Pedido entregue',
      [OrderStatus.CANCELLED]: 'Pedido cancelado',
      [OrderStatus.RETURNED]: 'Pedido devolvido'
    };

    return descriptions[status] || 'Status desconhecido';
  }

  getNextExpectedStatus(currentStatus: OrderStatus): OrderStatus | null {
    const statusFlow = {
      [OrderStatus.PENDING]: OrderStatus.CONFIRMED,
      [OrderStatus.CONFIRMED]: OrderStatus.PROCESSING,
      [OrderStatus.PROCESSING]: OrderStatus.SHIPPED,
      [OrderStatus.SHIPPED]: OrderStatus.IN_TRANSIT,
      [OrderStatus.IN_TRANSIT]: OrderStatus.OUT_FOR_DELIVERY,
      [OrderStatus.OUT_FOR_DELIVERY]: OrderStatus.DELIVERED
    };

    return statusFlow[currentStatus] || null;
  }

  getEstimatedDeliveryTime(orderId: string): Date | null {
    const tracking = this.trackingData.get(orderId);
    return tracking?.estimatedDelivery || null;
  }

  isDelivered(orderId: string): boolean {
    const status = this.getOrderStatus(orderId);
    return status === OrderStatus.DELIVERED;
  }

  canCancel(orderId: string): boolean {
    const status = this.getOrderStatus(orderId);
    return status === OrderStatus.PENDING || status === OrderStatus.CONFIRMED;
  }

  canReturn(orderId: string): boolean {
    const status = this.getOrderStatus(orderId);
    const tracking = this.trackingData.get(orderId);
    
    if (status !== OrderStatus.DELIVERED || !tracking) return false;
    
    // Allow returns within 30 days
    const deliveryEvent = tracking.events.find(e => e.status === OrderStatus.DELIVERED);
    if (!deliveryEvent) return false;
    
    const daysSinceDelivery = (Date.now() - deliveryEvent.timestamp.getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceDelivery <= 30;
  }

  getTrackingHistory(orderId: string): TrackingEvent[] {
    const tracking = this.trackingData.get(orderId);
    return tracking?.events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()) || [];
  }

  simulateStatusUpdate(orderId: string): void {
    const currentStatus = this.getOrderStatus(orderId);
    if (!currentStatus) return;

    const nextStatus = this.getNextExpectedStatus(currentStatus);
    if (nextStatus) {
      const locations = ['São Paulo, SP', 'Rio de Janeiro, RJ', 'Belo Horizonte, MG', 'Centro de Distribuição'];
      const randomLocation = locations[Math.floor(Math.random() * locations.length)];
      
      this.updateOrderStatus(
        orderId,
        nextStatus,
        this.getStatusDescription(nextStatus),
        randomLocation
      );
    }
  }

  private generateTrackingNumber(): string {
    return 'BR' + Math.random().toString().substr(2, 9) + 'BR';
  }

  private generateEventId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private initializeMockData(): void {
    // Initialize some mock tracking data
    this.updateOrderStatus('1', OrderStatus.CONFIRMED, 'Pedido confirmado', 'São Paulo, SP');
    this.updateOrderStatus('2', OrderStatus.SHIPPED, 'Pedido enviado', 'Centro de Distribuição');
    this.updateOrderStatus('3', OrderStatus.DELIVERED, 'Pedido entregue', 'Endereço do cliente');
  }
}