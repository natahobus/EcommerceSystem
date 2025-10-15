import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';

interface Product {
  id: number;
  name: string;
  price: number;
  category: string;
  tags: string;
  rating?: number;
  views?: number;
}

interface UserBehavior {
  userId: string;
  productId: number;
  action: 'view' | 'cart' | 'purchase' | 'like' | 'share';
  timestamp: Date;
  sessionId: string;
}

interface RecommendationResult {
  productId: number;
  score: number;
  reason: string;
  type: 'collaborative' | 'content' | 'trending' | 'personalized';
}

@Injectable({
  providedIn: 'root'
})
export class RecommendationService {
  private apiUrl = 'http://localhost:5000/api';
  private userBehaviors: UserBehavior[] = [];
  private productSimilarity = new Map<number, Map<number, number>>();
  private userPreferences = new Map<string, Map<string, number>>();

  constructor(private http: HttpClient) {
    this.initializeRecommendationEngine();
  }

  trackUserBehavior(userId: string, productId: number, action: string): void {
    const behavior: UserBehavior = {
      userId,
      productId,
      action: action as any,
      timestamp: new Date(),
      sessionId: this.getSessionId()
    };

    this.userBehaviors.push(behavior);
    this.updateUserPreferences(userId, productId, action);
    
    // Keep only last 1000 behaviors for performance
    if (this.userBehaviors.length > 1000) {
      this.userBehaviors = this.userBehaviors.slice(-1000);
    }
  }

  getRecommendations(userId: string, limit: number = 10): Observable<RecommendationResult[]> {
    const recommendations: RecommendationResult[] = [];
    
    // Get collaborative filtering recommendations
    const collaborative = this.getCollaborativeRecommendations(userId, limit / 2);
    recommendations.push(...collaborative);
    
    // Get content-based recommendations
    const contentBased = this.getContentBasedRecommendations(userId, limit / 2);
    recommendations.push(...contentBased);
    
    // Get trending products
    const trending = this.getTrendingRecommendations(limit / 4);
    recommendations.push(...trending);
    
    // Sort by score and return top results
    const sortedRecommendations = recommendations
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
    
    return new Observable(observer => {
      observer.next(sortedRecommendations);
      observer.complete();
    });
  }

  getProductRecommendations(productId: number, limit: number = 5): RecommendationResult[] {
    const recommendations: RecommendationResult[] = [];
    
    // Get similar products based on category and tags
    const similarProducts = this.findSimilarProducts(productId);
    
    similarProducts.forEach(([id, similarity]) => {
      if (recommendations.length < limit) {
        recommendations.push({
          productId: id,
          score: similarity,
          reason: 'Produtos similares',
          type: 'content'
        });
      }
    });
    
    return recommendations.sort((a, b) => b.score - a.score);
  }

  getFrequentlyBoughtTogether(productId: number): number[] {
    const productPairs = new Map<number, number>();
    
    // Find products frequently bought together
    const purchaseBehaviors = this.userBehaviors.filter(b => b.action === 'purchase');
    const userPurchases = new Map<string, number[]>();
    
    purchaseBehaviors.forEach(behavior => {
      if (!userPurchases.has(behavior.userId)) {
        userPurchases.set(behavior.userId, []);
      }
      userPurchases.get(behavior.userId)!.push(behavior.productId);
    });
    
    userPurchases.forEach(products => {
      if (products.includes(productId)) {
        products.forEach(otherProductId => {
          if (otherProductId !== productId) {
            productPairs.set(otherProductId, (productPairs.get(otherProductId) || 0) + 1);
          }
        });
      }
    });
    
    return Array.from(productPairs.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([productId]) => productId);
  }

  getPersonalizedRecommendations(userId: string, limit: number = 10): RecommendationResult[] {
    const userPrefs = this.userPreferences.get(userId);
    if (!userPrefs) return [];
    
    const recommendations: RecommendationResult[] = [];
    
    // Get user's favorite categories
    const sortedCategories = Array.from(userPrefs.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3);
    
    sortedCategories.forEach(([category, score]) => {
      // Simulate getting products from this category
      for (let i = 1; i <= limit / 3; i++) {
        recommendations.push({
          productId: Math.floor(Math.random() * 100) + 1,
          score: score * 0.8 + Math.random() * 0.2,
          reason: `Baseado no seu interesse em ${category}`,
          type: 'personalized'
        });
      }
    });
    
    return recommendations
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  getRecommendationExplanation(productId: number, userId: string): string {
    const userPrefs = this.userPreferences.get(userId);
    const userBehavior = this.userBehaviors.filter(b => b.userId === userId);
    
    if (userBehavior.length === 0) {
      return 'Produto em destaque';
    }
    
    const viewedCategories = userBehavior
      .map(b => this.getCategoryForProduct(b.productId))
      .filter(Boolean);
    
    const mostViewedCategory = this.getMostFrequent(viewedCategories);
    
    if (mostViewedCategory) {
      return `Recomendado porque você tem interesse em ${mostViewedCategory}`;
    }
    
    return 'Baseado no seu histórico de navegação';
  }

  private getCollaborativeRecommendations(userId: string, limit: number): RecommendationResult[] {
    const recommendations: RecommendationResult[] = [];
    const userBehavior = this.userBehaviors.filter(b => b.userId === userId);
    
    if (userBehavior.length === 0) return recommendations;
    
    // Find similar users
    const similarUsers = this.findSimilarUsers(userId);
    
    similarUsers.forEach(([similarUserId, similarity]) => {
      const similarUserBehavior = this.userBehaviors.filter(b => 
        b.userId === similarUserId && 
        b.action === 'purchase' &&
        !userBehavior.some(ub => ub.productId === b.productId)
      );
      
      similarUserBehavior.forEach(behavior => {
        if (recommendations.length < limit) {
          recommendations.push({
            productId: behavior.productId,
            score: similarity * 0.8,
            reason: 'Usuários com gostos similares também compraram',
            type: 'collaborative'
          });
        }
      });
    });
    
    return recommendations;
  }

  private getContentBasedRecommendations(userId: string, limit: number): RecommendationResult[] {
    const recommendations: RecommendationResult[] = [];
    const userBehavior = this.userBehaviors.filter(b => b.userId === userId);
    
    if (userBehavior.length === 0) return recommendations;
    
    // Get user's preferred categories
    const categories = userBehavior.map(b => this.getCategoryForProduct(b.productId));
    const preferredCategory = this.getMostFrequent(categories);
    
    if (preferredCategory) {
      // Simulate getting products from preferred category
      for (let i = 0; i < limit; i++) {
        recommendations.push({
          productId: Math.floor(Math.random() * 100) + 1,
          score: 0.7 + Math.random() * 0.3,
          reason: `Baseado no seu interesse em ${preferredCategory}`,
          type: 'content'
        });
      }
    }
    
    return recommendations;
  }

  private getTrendingRecommendations(limit: number): RecommendationResult[] {
    const recommendations: RecommendationResult[] = [];
    const productViews = new Map<number, number>();
    
    // Count views for each product
    this.userBehaviors
      .filter(b => b.action === 'view')
      .forEach(behavior => {
        productViews.set(behavior.productId, (productViews.get(behavior.productId) || 0) + 1);
      });
    
    // Get top viewed products
    const trending = Array.from(productViews.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, limit);
    
    trending.forEach(([productId, views]) => {
      recommendations.push({
        productId,
        score: views / 100, // Normalize score
        reason: 'Produto em alta',
        type: 'trending'
      });
    });
    
    return recommendations;
  }

  private findSimilarUsers(userId: string): Array<[string, number]> {
    const userBehavior = this.userBehaviors.filter(b => b.userId === userId);
    const userProducts = new Set(userBehavior.map(b => b.productId));
    
    const similarities: Array<[string, number]> = [];
    const otherUsers = new Set(this.userBehaviors.map(b => b.userId));
    
    otherUsers.forEach(otherUserId => {
      if (otherUserId !== userId) {
        const otherUserBehavior = this.userBehaviors.filter(b => b.userId === otherUserId);
        const otherUserProducts = new Set(otherUserBehavior.map(b => b.productId));
        
        const similarity = this.calculateJaccardSimilarity(userProducts, otherUserProducts);
        if (similarity > 0.1) {
          similarities.push([otherUserId, similarity]);
        }
      }
    });
    
    return similarities.sort(([,a], [,b]) => b - a).slice(0, 5);
  }

  private findSimilarProducts(productId: number): Array<[number, number]> {
    const similarities: Array<[number, number]> = [];
    const productCategory = this.getCategoryForProduct(productId);
    
    // Simulate finding similar products
    for (let i = 1; i <= 100; i++) {
      if (i !== productId) {
        const otherCategory = this.getCategoryForProduct(i);
        if (otherCategory === productCategory) {
          similarities.push([i, 0.8 + Math.random() * 0.2]);
        }
      }
    }
    
    return similarities.sort(([,a], [,b]) => b - a).slice(0, 10);
  }

  private calculateJaccardSimilarity(setA: Set<number>, setB: Set<number>): number {
    const intersection = new Set([...setA].filter(x => setB.has(x)));
    const union = new Set([...setA, ...setB]);
    
    return union.size > 0 ? intersection.size / union.size : 0;
  }

  private updateUserPreferences(userId: string, productId: number, action: string): void {
    const category = this.getCategoryForProduct(productId);
    if (!category) return;
    
    if (!this.userPreferences.has(userId)) {
      this.userPreferences.set(userId, new Map());
    }
    
    const userPrefs = this.userPreferences.get(userId)!;
    const currentScore = userPrefs.get(category) || 0;
    
    const actionWeights = {
      view: 1,
      cart: 2,
      purchase: 5,
      like: 3,
      share: 2
    };
    
    const weight = actionWeights[action as keyof typeof actionWeights] || 1;
    userPrefs.set(category, currentScore + weight);
  }

  private getCategoryForProduct(productId: number): string {
    // Simulate getting category for product
    const categories = ['Electronics', 'Clothing', 'Books', 'Home', 'Sports'];
    return categories[productId % categories.length];
  }

  private getMostFrequent<T>(array: T[]): T | null {
    if (array.length === 0) return null;
    
    const frequency = new Map<T, number>();
    array.forEach(item => {
      frequency.set(item, (frequency.get(item) || 0) + 1);
    });
    
    return Array.from(frequency.entries())
      .sort(([,a], [,b]) => b - a)[0][0];
  }

  private getSessionId(): string {
    let sessionId = sessionStorage.getItem('sessionId');
    if (!sessionId) {
      sessionId = Date.now().toString(36) + Math.random().toString(36);
      sessionStorage.setItem('sessionId', sessionId);
    }
    return sessionId;
  }

  private initializeRecommendationEngine(): void {
    // Initialize with some mock data
    this.trackUserBehavior('user1', 1, 'view');
    this.trackUserBehavior('user1', 2, 'cart');
    this.trackUserBehavior('user1', 3, 'purchase');
    this.trackUserBehavior('user2', 1, 'view');
    this.trackUserBehavior('user2', 4, 'purchase');
  }
}