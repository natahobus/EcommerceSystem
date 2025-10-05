import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface CartItem {
  productId: number;
  name: string;
  price: number;
  quantity: number;
}

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private cartSubject = new BehaviorSubject<CartItem[]>([]);
  public cart$ = this.cartSubject.asObservable();

  constructor() {
    this.loadCart();
  }

  addItem(item: CartItem) {
    const cart = this.cartSubject.value;
    const existingItem = cart.find(i => i.productId === item.productId);
    
    if (existingItem) {
      existingItem.quantity += item.quantity;
    } else {
      cart.push(item);
    }
    
    this.updateCart(cart);
  }

  removeItem(productId: number) {
    const cart = this.cartSubject.value.filter(i => i.productId !== productId);
    this.updateCart(cart);
  }

  getTotal(): number {
    return this.cartSubject.value.reduce((total, item) => total + (item.price * item.quantity), 0);
  }

  clear() {
    this.updateCart([]);
  }

  private updateCart(cart: CartItem[]) {
    this.cartSubject.next(cart);
    localStorage.setItem('cart', JSON.stringify(cart));
  }

  private loadCart() {
    const stored = localStorage.getItem('cart');
    if (stored) {
      this.cartSubject.next(JSON.parse(stored));
    }
  }
}