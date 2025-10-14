import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

export interface RecommendationScore {
  productId: number;
  score: number;
  reason: string;
}

@Injectable({
  providedIn: 'root'
})
export class AIRecommendationsService {
  private userBehavior: { [userId: string]: any[] } = {};
  private productSimilarity: { [productId: number]: number[] } = {};

  trackUserBehavior(userId: string, action: string, productId: number, data?: any) {
    if (!this.userBehavior[userId]) {
      this.userBehavior[userId] = [];
    }

    this.userBehavior[userId].push({
      action,
      productId,
      timestamp: Date.now(),
      data
    });

    // Keep only last 100 actions
    if (this.userBehavior[userId].length > 100) {
      this.userBehavior[userId] = this.userBehavior[userId].slice(-100);
    }
  }

  getPersonalizedRecommendations(userId: string, products: any[]): Observable<RecommendationScore[]> {
    const userHistory = this.userBehavior[userId] || [];
    const recommendations: RecommendationScore[] = [];

    // Collaborative filtering simulation
    for (const product of products) {
      let score = 0;
      let reason = 'Produto popular';

      // Check if user viewed similar products
      const viewedProducts = userHistory
        .filter(h => h.action === 'view')
        .map(h => h.productId);

      if (viewedProducts.length > 0) {
        const categoryMatch = this.calculateCategoryMatch(product, viewedProducts, products);
        score += categoryMatch * 0.4;

        if (categoryMatch > 0.5) {
          reason = 'Baseado em produtos que você visualizou';
        }
      }

      // Check cart abandonment
      const cartProducts = userHistory
        .filter(h => h.action === 'add_to_cart')
        .map(h => h.productId);

      if (cartProducts.includes(product.id)) {
        score += 0.8;
        reason = 'Produto no seu carrinho';
      }

      // Price preference
      const pricePreference = this.calculatePricePreference(userId, product.price);
      score += pricePreference * 0.2;

      // Trending products
      if (product.isFeatured) {
        score += 0.3;
        if (score < 0.5) {
          reason = 'Produto em destaque';
        }
      }

      // Stock availability
      if (product.stock > 0) {
        score += 0.1;
      } else {
        score = 0; // Don't recommend out of stock
      }

      if (score > 0.3) {
        recommendations.push({
          productId: product.id,
          score: Math.min(score, 1),
          reason
        });
      }
    }

    // Sort by score and return top 10
    return of(recommendations
      .sort((a, b) => b.score - a.score)
      .slice(0, 10));
  }

  getSimilarProducts(productId: number, products: any[]): Observable<RecommendationScore[]> {
    const targetProduct = products.find(p => p.id === productId);
    if (!targetProduct) {
      return of([]);
    }

    const similarities: RecommendationScore[] = [];

    for (const product of products) {
      if (product.id === productId) continue;

      let similarity = 0;

      // Category similarity
      if (product.category === targetProduct.category) {
        similarity += 0.6;
      }

      // Price similarity (within 20% range)
      const priceDiff = Math.abs(product.price - targetProduct.price) / targetProduct.price;
      if (priceDiff <= 0.2) {
        similarity += 0.3;
      }

      // Tags similarity
      const targetTags = targetProduct.tags?.split(',') || [];
      const productTags = product.tags?.split(',') || [];
      const commonTags = targetTags.filter(tag => productTags.includes(tag));
      similarity += (commonTags.length / Math.max(targetTags.length, 1)) * 0.1;

      if (similarity > 0.4) {
        similarities.push({
          productId: product.id,
          score: similarity,
          reason: 'Produto similar'
        });
      }
    }

    return of(similarities
      .sort((a, b) => b.score - a.score)
      .slice(0, 8));
  }

  private calculateCategoryMatch(product: any, viewedProducts: number[], allProducts: any[]): number {
    const viewedCategories = viewedProducts
      .map(id => allProducts.find(p => p.id === id)?.category)
      .filter(Boolean);

    const categoryCount = viewedCategories.filter(cat => cat === product.category).length;
    return Math.min(categoryCount / viewedCategories.length, 1);
  }

  private calculatePricePreference(userId: string, productPrice: number): number {
    const userHistory = this.userBehavior[userId] || [];
    const purchasedPrices = userHistory
      .filter(h => h.action === 'purchase')
      .map(h => h.data?.price)
      .filter(Boolean);

    if (purchasedPrices.length === 0) return 0.5;

    const avgPrice = purchasedPrices.reduce((sum, price) => sum + price, 0) / purchasedPrices.length;
    const priceDiff = Math.abs(productPrice - avgPrice) / avgPrice;

    return Math.max(0, 1 - priceDiff);
  }
}