import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class PushNotificationService {
  private swRegistration: ServiceWorkerRegistration | null = null;

  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      return false;
    }

    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  async showNotification(title: string, options?: NotificationOptions) {
    if (await this.requestPermission()) {
      new Notification(title, options);
    }
  }

  async registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        this.swRegistration = await navigator.serviceWorker.register('/sw.js');
      } catch (error) {
        console.error('SW registration failed');
      }
    }
  }
}