import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccessed: number;
}

@Injectable({
  providedIn: 'root'
})
export class AdvancedCacheService {
  private cache = new Map<string, CacheItem<any>>();
  private maxSize = 100;
  private defaultTTL = 5 * 60 * 1000; // 5 minutes
  private cacheStats = new BehaviorSubject({
    hits: 0,
    misses: 0,
    size: 0,
    hitRate: 0
  });

  private hits = 0;
  private misses = 0;

  set<T>(key: string, data: T, ttl?: number): void {
    const now = Date.now();
    
    // Remove expired items if cache is full
    if (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }

    this.cache.set(key, {
      data,
      timestamp: now,
      ttl: ttl || this.defaultTTL,
      accessCount: 0,
      lastAccessed: now
    });

    this.updateStats();
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item) {
      this.misses++;
      this.updateStats();
      return null;
    }

    const now = Date.now();
    
    // Check if expired
    if (now - item.timestamp > item.ttl) {
      this.cache.delete(key);
      this.misses++;
      this.updateStats();
      return null;
    }

    // Update access info
    item.accessCount++;
    item.lastAccessed = now;
    
    this.hits++;
    this.updateStats();
    return item.data;
  }

  has(key: string): boolean {
    const item = this.cache.get(key);
    if (!item) return false;
    
    const now = Date.now();
    if (now - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  delete(key: string): boolean {
    const result = this.cache.delete(key);
    this.updateStats();
    return result;
  }

  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
    this.updateStats();
  }

  getStats(): Observable<any> {
    return this.cacheStats.asObservable();
  }

  private evictLRU(): void {
    let oldestKey = '';
    let oldestTime = Date.now();
    
    for (const [key, item] of this.cache.entries()) {
      if (item.lastAccessed < oldestTime) {
        oldestTime = item.lastAccessed;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  private updateStats(): void {
    const total = this.hits + this.misses;
    const hitRate = total > 0 ? (this.hits / total) * 100 : 0;
    
    this.cacheStats.next({
      hits: this.hits,
      misses: this.misses,
      size: this.cache.size,
      hitRate: Math.round(hitRate * 100) / 100
    });
  }

  // Preload data
  preload(keys: string[], dataLoader: (key: string) => Promise<any>): Promise<void[]> {
    const promises = keys.map(async (key) => {
      if (!this.has(key)) {
        try {
          const data = await dataLoader(key);
          this.set(key, data);
        } catch (error) {
          console.error(`Failed to preload ${key}:`, error);
        }
      }
    });
    
    return Promise.all(promises);
  }

  // Batch operations
  setMany(items: Array<{key: string, data: any, ttl?: number}>): void {
    items.forEach(item => {
      this.set(item.key, item.data, item.ttl);
    });
  }

  getMany<T>(keys: string[]): Map<string, T> {
    const result = new Map<string, T>();
    keys.forEach(key => {
      const data = this.get<T>(key);
      if (data !== null) {
        result.set(key, data);
      }
    });
    return result;
  }
}