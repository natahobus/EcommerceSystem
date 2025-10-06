import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface UserSettings {
  language: string;
  currency: string;
  itemsPerPage: number;
  notifications: boolean;
  autoSave: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class UserSettingsService {
  private defaultSettings: UserSettings = {
    language: 'pt-BR',
    currency: 'BRL',
    itemsPerPage: 10,
    notifications: true,
    autoSave: true
  };

  private settingsSubject = new BehaviorSubject<UserSettings>(this.defaultSettings);
  public settings$ = this.settingsSubject.asObservable();

  constructor() {
    this.loadSettings();
  }

  updateSettings(settings: Partial<UserSettings>) {
    const current = this.settingsSubject.value;
    const updated = { ...current, ...settings };
    this.settingsSubject.next(updated);
    localStorage.setItem('userSettings', JSON.stringify(updated));
  }

  resetSettings() {
    this.settingsSubject.next(this.defaultSettings);
    localStorage.removeItem('userSettings');
  }

  private loadSettings() {
    const stored = localStorage.getItem('userSettings');
    if (stored) {
      const settings = { ...this.defaultSettings, ...JSON.parse(stored) };
      this.settingsSubject.next(settings);
    }
  }
}