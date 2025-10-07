import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface Location {
  latitude: number;
  longitude: number;
  accuracy: number;
}

@Injectable({
  providedIn: 'root'
})
export class GeolocationService {

  getCurrentPosition(): Observable<Location> {
    return new Observable(observer => {
      if (!navigator.geolocation) {
        observer.error('Geolocation not supported');
        return;
      }

      navigator.geolocation.getCurrentPosition(
        position => {
          observer.next({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          });
          observer.complete();
        },
        error => observer.error(error),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      );
    });
  }

  calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI/180);
  }
}