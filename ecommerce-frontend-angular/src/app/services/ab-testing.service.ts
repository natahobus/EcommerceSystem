import { Injectable } from '@angular/core';

export interface ABTest {
  id: string;
  name: string;
  variants: string[];
  traffic: number;
  active: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ABTestingService {
  private tests: ABTest[] = [
    {
      id: 'checkout_button',
      name: 'Checkout Button Color',
      variants: ['blue', 'green', 'red'],
      traffic: 100,
      active: true
    },
    {
      id: 'product_layout',
      name: 'Product Layout',
      variants: ['grid', 'list'],
      traffic: 50,
      active: true
    }
  ];

  private userVariants = new Map<string, string>();

  getVariant(testId: string): string {
    const test = this.tests.find(t => t.id === testId);
    if (!test || !test.active) {
      return test?.variants[0] || 'default';
    }

    // Check if user already has a variant assigned
    const existingVariant = this.userVariants.get(testId);
    if (existingVariant) {
      return existingVariant;
    }

    // Assign variant based on traffic percentage
    const random = Math.random() * 100;
    if (random > test.traffic) {
      return test.variants[0]; // Control group
    }

    // Randomly assign variant
    const variantIndex = Math.floor(Math.random() * test.variants.length);
    const variant = test.variants[variantIndex];
    
    this.userVariants.set(testId, variant);
    this.trackAssignment(testId, variant);
    
    return variant;
  }

  trackConversion(testId: string, event: string) {
    const variant = this.userVariants.get(testId);
    if (variant) {
      console.log(`AB Test Conversion: ${testId} - ${variant} - ${event}`);
      // In production, send to analytics service
    }
  }

  private trackAssignment(testId: string, variant: string) {
    console.log(`AB Test Assignment: ${testId} - ${variant}`);
    // In production, send to analytics service
  }

  getActiveTests(): ABTest[] {
    return this.tests.filter(t => t.active);
  }

  addTest(test: ABTest) {
    this.tests.push(test);
  }

  updateTest(testId: string, updates: Partial<ABTest>) {
    const index = this.tests.findIndex(t => t.id === testId);
    if (index >= 0) {
      this.tests[index] = { ...this.tests[index], ...updates };
    }
  }
}