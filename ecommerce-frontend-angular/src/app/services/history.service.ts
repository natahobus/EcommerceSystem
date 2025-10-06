import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface HistoryItem {
  productId: number;
  name: string;
  viewedAt: Date;
}

@Injectable({
  providedIn: 'root'
})
export class HistoryService {
  private historySubject = new BehaviorSubject<HistoryItem[]>([]);
  public history$ = this.historySubject.asObservable();
  private maxItems = 20;

  constructor() {
    this.loadHistory();
  }

  addItem(item: Omit<HistoryItem, 'viewedAt'>) {
    const history = this.historySubject.value;
    const existingIndex = history.findIndex(h => h.productId === item.productId);
    
    if (existingIndex >= 0) {
      history.splice(existingIndex, 1);
    }
    
    const newItem: HistoryItem = { ...item, viewedAt: new Date() };
    history.unshift(newItem);
    
    if (history.length > this.maxItems) {
      history.splice(this.maxItems);
    }
    
    this.updateHistory(history);
  }

  clear() {
    this.updateHistory([]);
  }

  private updateHistory(history: HistoryItem[]) {
    this.historySubject.next(history);
    localStorage.setItem('history', JSON.stringify(history));
  }

  private loadHistory() {
    const stored = localStorage.getItem('history');
    if (stored) {
      this.historySubject.next(JSON.parse(stored));
    }
  }
}