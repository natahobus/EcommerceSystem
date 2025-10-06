import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private themeSubject = new BehaviorSubject<string>('light');
  public theme$ = this.themeSubject.asObservable();

  constructor() {
    this.loadTheme();
  }

  toggleTheme() {
    const currentTheme = this.themeSubject.value;
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    this.setTheme(newTheme);
  }

  setTheme(theme: string) {
    this.themeSubject.next(theme);
    document.body.className = theme;
    localStorage.setItem('theme', theme);
  }

  getCurrentTheme(): string {
    return this.themeSubject.value;
  }

  private loadTheme() {
    const stored = localStorage.getItem('theme') || 'light';
    this.setTheme(stored);
  }
}