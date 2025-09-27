import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductService } from './services/product.service';
import { PaymentService } from './services/payment.service';
import { NotificationService } from './services/notification.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="container">
      <header>
        <h1>🛒 E-commerce System</h1>
        <div class="cart-info">
          Carrinho: {{cartItems.length}} itens - R$ {{cartTotal.toFixed(2)}}
        </div>
      </header>

      <div class="notifications" *ngIf="notifications.length > 0">
        <div *ngFor="let notification of notifications" 
             [class]="'notification ' + notification.type">
          {{notification.message}}
        </div>
      </div>

      <div class="main-content">
        <section class="products">
          <h2>Produtos</h2>
          <div class="product-grid">
            <div *ngFor="let product of products" class="product-card">
              <h3>{{product.name}}</h3>
              <p class="category">{{product.category}}</p>
              <p class="price">R$ {{product.price.toFixed(2)}}</p>
              <p class="stock">Estoque: {{product.stock}}</p>
              <button (click)="addToCart(product)" 
                      [disabled]="product.stock === 0">
                Adicionar ao Carrinho
              </button>
            </div>
          </div>
        </section>

        <section class="cart" *ngIf="cartItems.length > 0">
          <h2>Carrinho de Compras</h2>
          <div *ngFor="let item of cartItems" class="cart-item">
            <span>{{item.name}} - Qtd: {{item.quantity}} - R$ {{(item.price * item.quantity).toFixed(2)}}</span>
            <button (click)="removeFromCart(item)">Remover</button>
          </div>
          <div class="cart-total">
            <strong>Total: R$ {{cartTotal.toFixed(2)}}</strong>
          </div>
          <button (click)="checkout()" class="checkout-btn">Finalizar Compra</button>
        </section>
      </div>
    </div>
  `,
  styles: [`
    .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
    header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; }
    .cart-info { background: #f0f0f0; padding: 10px; border-radius: 5px; }
    .notifications { margin-bottom: 20px; }
    .notification { padding: 10px; margin: 5px 0; border-radius: 5px; }
    .notification.payment_success { background: #d4edda; color: #155724; }
    .notification.payment_failed { background: #f8d7da; color: #721c24; }
    .product-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 20px; }
    .product-card { border: 1px solid #ddd; padding: 15px; border-radius: 8px; }
    .product-card h3 { margin: 0 0 10px 0; color: #333; }
    .category { color: #666; font-size: 0.9em; }
    .price { font-size: 1.2em; font-weight: bold; color: #007bff; }
    .stock { color: #666; }
    button { background: #007bff; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; }
    button:disabled { background: #ccc; cursor: not-allowed; }
    button:hover:not(:disabled) { background: #0056b3; }
    .cart { margin-top: 30px; padding: 20px; background: #f8f9fa; border-radius: 8px; }
    .cart-item { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #ddd; }
    .cart-total { margin: 20px 0; font-size: 1.2em; }
    .checkout-btn { background: #28a745; padding: 12px 24px; font-size: 1.1em; }
    .checkout-btn:hover { background: #218838; }
  `]
})
export class AppComponent implements OnInit {
  products: any[] = [];
  cartItems: any[] = [];
  notifications: any[] = [];

  constructor(
    private productService: ProductService,
    private paymentService: PaymentService,
    private notificationService: NotificationService
  ) {}

  ngOnInit() {
    this.loadProducts();
    this.setupNotifications();
  }

  loadProducts() {
    this.productService.getProducts().subscribe(products => {
      this.products = products;
    });
  }

  setupNotifications() {
    this.notificationService.connect();
    this.notificationService.messages$.subscribe(message => {
      this.notifications.unshift(message);
      setTimeout(() => {
        this.notifications = this.notifications.filter(n => n !== message);
      }, 5000);
    });
  }

  addToCart(product: any) {
    const existingItem = this.cartItems.find(item => item.id === product.id);
    if (existingItem) {
      existingItem.quantity++;
    } else {
      this.cartItems.push({ ...product, quantity: 1 });
    }
  }

  removeFromCart(item: any) {
    this.cartItems = this.cartItems.filter(cartItem => cartItem.id !== item.id);
  }

  get cartTotal(): number {
    return this.cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
  }

  checkout() {
    const order = {
      items: this.cartItems.map(item => ({
        productId: item.id,
        quantity: item.quantity,
        price: item.price
      })),
      total: this.cartTotal
    };

    this.productService.createOrder(order).subscribe(createdOrder => {
      this.paymentService.processPayment({
        orderId: createdOrder.id.toString(),
        amount: this.cartTotal,
        method: 'credit_card'
      }).subscribe(payment => {
        if (payment.status === 'approved') {
          this.cartItems = [];
          this.loadProducts(); // Reload to update stock
        }
      });
    });
  }
}