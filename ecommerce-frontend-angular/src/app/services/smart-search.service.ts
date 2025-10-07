import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class SmartSearchService {
  private searchHistory: string[] = [];

  constructor() {
    this.loadHistory();
  }

  addToHistory(query: string) {
    if (query.trim() && !this.searchHistory.includes(query)) {
      this.searchHistory.unshift(query);
      if (this.searchHistory.length > 10) {
        this.searchHistory.pop();
      }
      this.saveHistory();
    }
  }

  getHistory(): string[] {
    return [...this.searchHistory];
  }

  getSuggestions(query: string): string[] {
    if (!query.trim()) return [];
    
    return this.searchHistory
      .filter(item => item.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 5);
  }

  clearHistory() {
    this.searchHistory = [];
    localStorage.removeItem('searchHistory');
  }

  private saveHistory() {
    localStorage.setItem('searchHistory', JSON.stringify(this.searchHistory));
  }

  private loadHistory() {
    const stored = localStorage.getItem('searchHistory');
    if (stored) {
      this.searchHistory = JSON.parse(stored);
    }
  }
}