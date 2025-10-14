import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface Translation {
  [key: string]: string | Translation;
}

@Injectable({
  providedIn: 'root'
})
export class I18nService {
  private currentLanguage = 'pt-BR';
  private languageSubject = new BehaviorSubject<string>(this.currentLanguage);
  public language$ = this.languageSubject.asObservable();

  private translations: { [lang: string]: Translation } = {
    'pt-BR': {
      common: {
        add: 'Adicionar',
        edit: 'Editar',
        delete: 'Excluir',
        save: 'Salvar',
        cancel: 'Cancelar',
        search: 'Buscar',
        loading: 'Carregando...'
      },
      product: {
        name: 'Nome do Produto',
        price: 'Preço',
        stock: 'Estoque',
        category: 'Categoria',
        addToCart: 'Adicionar ao Carrinho'
      },
      cart: {
        title: 'Carrinho de Compras',
        empty: 'Seu carrinho está vazio',
        total: 'Total',
        checkout: 'Finalizar Compra'
      }
    },
    'en-US': {
      common: {
        add: 'Add',
        edit: 'Edit',
        delete: 'Delete',
        save: 'Save',
        cancel: 'Cancel',
        search: 'Search',
        loading: 'Loading...'
      },
      product: {
        name: 'Product Name',
        price: 'Price',
        stock: 'Stock',
        category: 'Category',
        addToCart: 'Add to Cart'
      },
      cart: {
        title: 'Shopping Cart',
        empty: 'Your cart is empty',
        total: 'Total',
        checkout: 'Checkout'
      }
    },
    'es-ES': {
      common: {
        add: 'Añadir',
        edit: 'Editar',
        delete: 'Eliminar',
        save: 'Guardar',
        cancel: 'Cancelar',
        search: 'Buscar',
        loading: 'Cargando...'
      },
      product: {
        name: 'Nombre del Producto',
        price: 'Precio',
        stock: 'Stock',
        category: 'Categoría',
        addToCart: 'Añadir al Carrito'
      },
      cart: {
        title: 'Carrito de Compras',
        empty: 'Tu carrito está vacío',
        total: 'Total',
        checkout: 'Finalizar Compra'
      }
    }
  };

  constructor() {
    this.loadLanguage();
  }

  setLanguage(lang: string) {
    if (this.translations[lang]) {
      this.currentLanguage = lang;
      this.languageSubject.next(lang);
      localStorage.setItem('language', lang);
    }
  }

  getCurrentLanguage(): string {
    return this.currentLanguage;
  }

  translate(key: string): string {
    const keys = key.split('.');
    let translation: any = this.translations[this.currentLanguage];

    for (const k of keys) {
      if (translation && typeof translation === 'object' && k in translation) {
        translation = translation[k];
      } else {
        return key; // Return key if translation not found
      }
    }

    return typeof translation === 'string' ? translation : key;
  }

  getAvailableLanguages(): { code: string; name: string }[] {
    return [
      { code: 'pt-BR', name: 'Português (Brasil)' },
      { code: 'en-US', name: 'English (US)' },
      { code: 'es-ES', name: 'Español (España)' }
    ];
  }

  private loadLanguage() {
    const stored = localStorage.getItem('language');
    if (stored && this.translations[stored]) {
      this.currentLanguage = stored;
      this.languageSubject.next(stored);
    }
  }
}