import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

interface LoyaltyMember {
  id: string;
  email: string;
  points: number;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  totalSpent: number;
  joinDate: Date;
}

interface PointsTransaction {
  id: string;
  memberId: string;
  points: number;
  type: 'earned' | 'redeemed';
  description: string;
  date: Date;
}

@Injectable({
  providedIn: 'root'
})
export class LoyaltyService {
  private members = new Map<string, LoyaltyMember>();
  private transactions: PointsTransaction[] = [];
  
  private tierThresholds = {
    bronze: 0,
    silver: 1000,
    gold: 5000,
    platinum: 15000
  };

  private pointsRates = {
    purchase: 1, // 1 point per R$1
    review: 50,
    referral: 500,
    birthday: 100
  };

  addMember(email: string): LoyaltyMember {
    const member: LoyaltyMember = {
      id: this.generateId(),
      email,
      points: 0,
      tier: 'bronze',
      totalSpent: 0,
      joinDate: new Date()
    };
    
    this.members.set(member.id, member);
    this.addPoints(member.id, 100, 'Bônus de boas-vindas');
    return member;
  }

  getMember(id: string): LoyaltyMember | undefined {
    return this.members.get(id);
  }

  addPoints(memberId: string, points: number, description: string): boolean {
    const member = this.members.get(memberId);
    if (!member) return false;

    member.points += points;
    this.updateTier(member);
    
    this.transactions.push({
      id: this.generateId(),
      memberId,
      points,
      type: 'earned',
      description,
      date: new Date()
    });

    return true;
  }

  redeemPoints(memberId: string, points: number, description: string): boolean {
    const member = this.members.get(memberId);
    if (!member || member.points < points) return false;

    member.points -= points;
    
    this.transactions.push({
      id: this.generateId(),
      memberId,
      points: -points,
      type: 'redeemed',
      description,
      date: new Date()
    });

    return true;
  }

  calculatePointsForPurchase(amount: number): number {
    return Math.floor(amount * this.pointsRates.purchase);
  }

  getAvailableRewards(memberId: string): any[] {
    const member = this.members.get(memberId);
    if (!member) return [];

    const rewards = [
      { id: 1, name: 'Desconto 5%', points: 500, type: 'discount' },
      { id: 2, name: 'Frete Grátis', points: 200, type: 'shipping' },
      { id: 3, name: 'Produto Grátis', points: 1000, type: 'product' },
      { id: 4, name: 'Desconto 10%', points: 1500, type: 'discount' },
      { id: 5, name: 'Acesso VIP', points: 2000, type: 'access' }
    ];

    return rewards.filter(reward => member.points >= reward.points);
  }

  getTierBenefits(tier: string): string[] {
    const benefits = {
      bronze: ['Pontos em compras', 'Ofertas especiais'],
      silver: ['Pontos em compras', 'Ofertas especiais', 'Frete grátis acima de R$100'],
      gold: ['Pontos em compras', 'Ofertas especiais', 'Frete grátis acima de R$50', 'Suporte prioritário'],
      platinum: ['Pontos em compras', 'Ofertas especiais', 'Frete grátis sempre', 'Suporte prioritário', 'Acesso antecipado']
    };

    return benefits[tier as keyof typeof benefits] || [];
  }

  getMemberTransactions(memberId: string): PointsTransaction[] {
    return this.transactions
      .filter(t => t.memberId === memberId)
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  }

  getLoyaltyStats(): any {
    const totalMembers = this.members.size;
    const totalPoints = Array.from(this.members.values()).reduce((sum, m) => sum + m.points, 0);
    
    const tierCounts = Array.from(this.members.values()).reduce((acc, member) => {
      acc[member.tier] = (acc[member.tier] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalMembers,
      totalPoints,
      tierDistribution: tierCounts,
      averagePoints: totalMembers > 0 ? Math.round(totalPoints / totalMembers) : 0
    };
  }

  private updateTier(member: LoyaltyMember): void {
    const spent = member.totalSpent;
    
    if (spent >= this.tierThresholds.platinum) {
      member.tier = 'platinum';
    } else if (spent >= this.tierThresholds.gold) {
      member.tier = 'gold';
    } else if (spent >= this.tierThresholds.silver) {
      member.tier = 'silver';
    } else {
      member.tier = 'bronze';
    }
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}