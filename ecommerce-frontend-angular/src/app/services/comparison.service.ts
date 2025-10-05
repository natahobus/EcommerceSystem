import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ComparisonService {
  private comparisonSubject = new BehaviorSubject<number[]>([]);
  public comparison$ = this.comparisonSubject.asObservable();
  private maxItems = 3;

  constructor() {
    this.loadComparison();
  }

  addProduct(productId: number): boolean {
    const current = this.comparisonSubject.value;
    
    if (current.length >= this.maxItems) {
      return false;
    }
    
    if (!current.includes(productId)) {
      const updated = [...current, productId];
      this.updateComparison(updated);
      return true;
    }
    
    return false;
  }

  removeProduct(productId: number) {
    const current = this.comparisonSubject.value;
    const updated = current.filter(id => id !== productId);
    this.updateComparison(updated);
  }

  clear() {
    this.updateComparison([]);
  }

  getCount(): number {
    return this.comparisonSubject.value.length;
  }

  private updateComparison(products: number[]) {
    this.comparisonSubject.next(products);
    localStorage.setItem('comparison', JSON.stringify(products));
  }

  private loadComparison() {
    const stored = localStorage.getItem('comparison');
    if (stored) {
      this.comparisonSubject.next(JSON.parse(stored));
    }
  }
}