import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class FavoritesService {
  private favoritesSubject = new BehaviorSubject<number[]>([]);
  public favorites$ = this.favoritesSubject.asObservable();

  constructor() {
    this.loadFavorites();
  }

  addFavorite(productId: number) {
    const favorites = this.favoritesSubject.value;
    if (!favorites.includes(productId)) {
      const updated = [...favorites, productId];
      this.updateFavorites(updated);
    }
  }

  removeFavorite(productId: number) {
    const favorites = this.favoritesSubject.value;
    const updated = favorites.filter(id => id !== productId);
    this.updateFavorites(updated);
  }

  isFavorite(productId: number): boolean {
    return this.favoritesSubject.value.includes(productId);
  }

  private updateFavorites(favorites: number[]) {
    this.favoritesSubject.next(favorites);
    localStorage.setItem('favorites', JSON.stringify(favorites));
  }

  private loadFavorites() {
    const stored = localStorage.getItem('favorites');
    if (stored) {
      this.favoritesSubject.next(JSON.parse(stored));
    }
  }
}