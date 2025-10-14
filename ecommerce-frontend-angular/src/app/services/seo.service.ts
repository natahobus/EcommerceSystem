import { Injectable } from '@angular/core';

export interface SEOData {
  title: string;
  description: string;
  keywords: string[];
  image?: string;
  url?: string;
}

@Injectable({
  providedIn: 'root'
})
export class SEOService {

  updatePageSEO(data: SEOData) {
    this.updateTitle(data.title);
    this.updateMetaDescription(data.description);
    this.updateMetaKeywords(data.keywords);
    
    if (data.image) {
      this.updateOpenGraph(data);
    }
  }

  private updateTitle(title: string) {
    document.title = title;
    this.updateMetaTag('property', 'og:title', title);
    this.updateMetaTag('name', 'twitter:title', title);
  }

  private updateMetaDescription(description: string) {
    this.updateMetaTag('name', 'description', description);
    this.updateMetaTag('property', 'og:description', description);
    this.updateMetaTag('name', 'twitter:description', description);
  }

  private updateMetaKeywords(keywords: string[]) {
    this.updateMetaTag('name', 'keywords', keywords.join(', '));
  }

  private updateOpenGraph(data: SEOData) {
    this.updateMetaTag('property', 'og:type', 'website');
    this.updateMetaTag('property', 'og:image', data.image!);
    
    if (data.url) {
      this.updateMetaTag('property', 'og:url', data.url);
    }
  }

  private updateMetaTag(attribute: string, value: string, content: string) {
    let element = document.querySelector(`meta[${attribute}="${value}"]`);
    
    if (!element) {
      element = document.createElement('meta');
      element.setAttribute(attribute, value);
      document.head.appendChild(element);
    }
    
    element.setAttribute('content', content);
  }

  generateProductSEO(product: any): SEOData {
    return {
      title: `${product.name} - Loja Online`,
      description: `Compre ${product.name} por R$ ${product.price}. ${product.category} com qualidade garantida.`,
      keywords: [product.name, product.category, 'comprar', 'loja online', 'e-commerce'],
      image: product.image || '/assets/default-product.jpg',
      url: `${window.location.origin}/produto/${product.id}`
    };
  }

  generateCategorySEO(category: string, productCount: number): SEOData {
    return {
      title: `${category} - ${productCount} produtos disponíveis`,
      description: `Encontre os melhores produtos de ${category}. ${productCount} opções com os melhores preços.`,
      keywords: [category, 'produtos', 'comprar', 'loja online'],
      url: `${window.location.origin}/categoria/${category}`
    };
  }

  addStructuredData(data: any) {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.text = JSON.stringify(data);
    document.head.appendChild(script);
  }

  generateProductStructuredData(product: any) {
    return {
      '@context': 'https://schema.org/',
      '@type': 'Product',
      'name': product.name,
      'description': product.description || `${product.name} - ${product.category}`,
      'image': product.image,
      'offers': {
        '@type': 'Offer',
        'price': product.price,
        'priceCurrency': 'BRL',
        'availability': product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock'
      }
    };
  }
}