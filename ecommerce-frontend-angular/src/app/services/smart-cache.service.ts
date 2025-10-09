import { Injectable } from '@angular/core';

interface CacheItem {
  data: any;
  expiry: number;
  hits: number;
  lastAccessed: number;
}

@Injectable({
  providedIn: 'root'
})
export class SmartCacheService {
  private cache = new Map<string, CacheItem>();
  private maxSize = 100;

  set(key: string, data: any, ttlMinutes: number = 5) {
    if (this.cache.size >= this.maxSize) {
      this.evictLeastUsed();
    }

    const expiry = Date.now() + (ttlMinutes * 60 * 1000);
    this.cache.set(key, {
      data,
      expiry,
      hits: 0,
      lastAccessed: Date.now()
    });
  }

  get(key: string): any | null {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }

    item.hits++;
    item.lastAccessed = Date.now();
    return item.data;
  }

  has(key: string): boolean {
    const item = this.cache.get(key);
    if (!item) return false;

    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  delete(key: string) {
    this.cache.delete(key);
  }

  clear() {
    this.cache.clear();
  }

  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: this.calculateHitRate()
    };
  }

  private evictLeastUsed() {
    let leastUsedKey = '';
    let leastHits = Infinity;
    let oldestAccess = Infinity;

    for (const [key, item] of this.cache) {
      if (item.hits < leastHits || (item.hits === leastHits && item.lastAccessed < oldestAccess)) {
        leastUsedKey = key;
        leastHits = item.hits;
        oldestAccess = item.lastAccessed;
      }
    }

    if (leastUsedKey) {
      this.cache.delete(leastUsedKey);
    }
  }

  private calculateHitRate(): number {
    let totalHits = 0;
    for (const item of this.cache.values()) {
      totalHits += item.hits;
    }
    return this.cache.size > 0 ? totalHits / this.cache.size : 0;
  }
}