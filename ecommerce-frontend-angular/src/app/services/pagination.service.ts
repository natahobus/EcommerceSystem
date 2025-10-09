import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface PaginationConfig {
  currentPage: number;
  itemsPerPage: number;
  totalItems: number;
  totalPages: number;
}

@Injectable({
  providedIn: 'root'
})
export class PaginationService {
  private paginationSubject = new BehaviorSubject<PaginationConfig>({
    currentPage: 1,
    itemsPerPage: 10,
    totalItems: 0,
    totalPages: 0
  });

  public pagination$ = this.paginationSubject.asObservable();

  updatePagination(config: Partial<PaginationConfig>) {
    const current = this.paginationSubject.value;
    const updated = { ...current, ...config };
    updated.totalPages = Math.ceil(updated.totalItems / updated.itemsPerPage);
    this.paginationSubject.next(updated);
  }

  nextPage() {
    const current = this.paginationSubject.value;
    if (current.currentPage < current.totalPages) {
      this.updatePagination({ currentPage: current.currentPage + 1 });
    }
  }

  previousPage() {
    const current = this.paginationSubject.value;
    if (current.currentPage > 1) {
      this.updatePagination({ currentPage: current.currentPage - 1 });
    }
  }

  goToPage(page: number) {
    const current = this.paginationSubject.value;
    if (page >= 1 && page <= current.totalPages) {
      this.updatePagination({ currentPage: page });
    }
  }

  getPageNumbers(): number[] {
    const current = this.paginationSubject.value;
    const pages: number[] = [];
    const start = Math.max(1, current.currentPage - 2);
    const end = Math.min(current.totalPages, current.currentPage + 2);
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    
    return pages;
  }
}