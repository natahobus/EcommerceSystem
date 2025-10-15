import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

interface Translation {
  [key: string]: string | Translation;
}

@Injectable({
  providedIn: 'root'
})
export class I18nService {
  private currentLanguage = new BehaviorSubject<string>('pt-BR');
  private translations: Record<string, Translation> = {
    'pt-BR': {
      common: {
        loading: 'Carregando...',
        error: 'Erro',
        success: 'Sucesso',
        cancel: 'Cancelar',
        confirm: 'Confirmar',
        save: 'Salvar',
        delete: 'Excluir',
        edit: 'Editar',
        search: 'Pesquisar'
      },
      products: {
        title: 'Produtos',
        name: 'Nome',
        price: 'Preço',
        stock: 'Estoque',
        category: 'Categoria',
        addToCart: 'Adicionar ao Carrinho',
        outOfStock: 'Fora de Estoque',
        inStock: 'Em Estoque'
      },
      cart: {
        title: 'Carrinho',
        empty: 'Carrinho vazio',
        total: 'Total',
        checkout: 'Finalizar Compra',
        quantity: 'Quantidade',
        remove: 'Remover'
      },
      orders: {
        title: 'Pedidos',
        status: 'Status',
        date: 'Data',
        total: 'Total',
        pending: 'Pendente',
        confirmed: 'Confirmado',
        shipped: 'Enviado',
        delivered: 'Entregue'
      }
    },
    'en-US': {
      common: {
        loading: 'Loading...',
        error: 'Error',
        success: 'Success',
        cancel: 'Cancel',
        confirm: 'Confirm',
        save: 'Save',
        delete: 'Delete',
        edit: 'Edit',
        search: 'Search'
      },
      products: {
        title: 'Products',
        name: 'Name',
        price: 'Price',
        stock: 'Stock',
        category: 'Category',
        addToCart: 'Add to Cart',
        outOfStock: 'Out of Stock',
        inStock: 'In Stock'
      },
      cart: {
        title: 'Cart',
        empty: 'Cart is empty',
        total: 'Total',
        checkout: 'Checkout',
        quantity: 'Quantity',
        remove: 'Remove'
      },
      orders: {
        title: 'Orders',
        status: 'Status',
        date: 'Date',
        total: 'Total',
        pending: 'Pending',
        confirmed: 'Confirmed',
        shipped: 'Shipped',
        delivered: 'Delivered'
      }
    },
    'es-ES': {
      common: {
        loading: 'Cargando...',
        error: 'Error',
        success: 'Éxito',
        cancel: 'Cancelar',
        confirm: 'Confirmar',
        save: 'Guardar',
        delete: 'Eliminar',
        edit: 'Editar',
        search: 'Buscar'
      },
      products: {
        title: 'Productos',
        name: 'Nombre',
        price: 'Precio',
        stock: 'Stock',
        category: 'Categoría',
        addToCart: 'Añadir al Carrito',
        outOfStock: 'Agotado',
        inStock: 'En Stock'
      },
      cart: {
        title: 'Carrito',
        empty: 'Carrito vacío',
        total: 'Total',
        checkout: 'Finalizar Compra',
        quantity: 'Cantidad',
        remove: 'Eliminar'
      },
      orders: {
        title: 'Pedidos',
        status: 'Estado',
        date: 'Fecha',
        total: 'Total',
        pending: 'Pendiente',
        confirmed: 'Confirmado',
        shipped: 'Enviado',
        delivered: 'Entregado'
      }
    }
  };

  getCurrentLanguage(): Observable<string> {
    return this.currentLanguage.asObservable();
  }

  setLanguage(language: string): void {
    if (this.translations[language]) {
      this.currentLanguage.next(language);
      localStorage.setItem('language', language);
    }
  }

  translate(key: string, params?: Record<string, any>): string {
    const lang = this.currentLanguage.value;
    const translation = this.getNestedTranslation(this.translations[lang], key);
    
    if (!translation) {
      return key; // Return key if translation not found
    }

    if (params) {
      return this.interpolate(translation, params);
    }

    return translation;
  }

  getAvailableLanguages(): Array<{code: string, name: string}> {
    return [
      { code: 'pt-BR', name: 'Português (Brasil)' },
      { code: 'en-US', name: 'English (US)' },
      { code: 'es-ES', name: 'Español (España)' }
    ];
  }

  formatCurrency(amount: number): string {
    const lang = this.currentLanguage.value;
    const formatters = {
      'pt-BR': new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }),
      'en-US': new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }),
      'es-ES': new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' })
    };

    return formatters[lang as keyof typeof formatters]?.format(amount) || `$${amount}`;
  }

  formatDate(date: Date): string {
    const lang = this.currentLanguage.value;
    const formatters = {
      'pt-BR': new Intl.DateTimeFormat('pt-BR'),
      'en-US': new Intl.DateTimeFormat('en-US'),
      'es-ES': new Intl.DateTimeFormat('es-ES')
    };

    return formatters[lang as keyof typeof formatters]?.format(date) || date.toLocaleDateString();
  }

  private getNestedTranslation(obj: Translation, key: string): string {
    const keys = key.split('.');
    let current: any = obj;

    for (const k of keys) {
      if (current && typeof current === 'object' && k in current) {
        current = current[k];
      } else {
        return '';
      }
    }

    return typeof current === 'string' ? current : '';
  }

  private interpolate(template: string, params: Record<string, any>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return params[key] !== undefined ? String(params[key]) : match;
    });
  }

  loadLanguageFromStorage(): void {
    const savedLanguage = localStorage.getItem('language');
    if (savedLanguage && this.translations[savedLanguage]) {
      this.currentLanguage.next(savedLanguage);
    }
  }
}