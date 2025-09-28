import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { finalize, timeout, catchError, retry } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { LoadingService } from './loading.service';
import { NotificationService } from './notification.service';

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private apiUrl = 'http://localhost:5000/api';

  constructor(
    private http: HttpClient, 
    private loadingService: LoadingService,
    private notificationService: NotificationService
  ) {}

  getProducts(): Observable<any[]> {
    this.loadingService.show();
    return this.http.get<any[]>(`${this.apiUrl}/products`)
      .pipe(
        timeout(10000),
        retry(2),
        catchError(error => {
          this.notificationService.error('Erro ao carregar produtos');
          return throwError(() => error);
        }),
        finalize(() => this.loadingService.hide())
      );
  }

  createOrder(order: any): Observable<any> {
    this.loadingService.show();
    return this.http.post<any>(`${this.apiUrl}/orders`, order)
      .pipe(
        timeout(15000),
        catchError(error => {
          this.notificationService.error('Erro ao criar pedido');
          return throwError(() => error);
        }),
        finalize(() => this.loadingService.hide())
      );
  }
}