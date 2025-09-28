import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { finalize, timeout } from 'rxjs/operators';
import { LoadingService } from './loading.service';

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private apiUrl = 'http://localhost:5000/api';

  constructor(private http: HttpClient, private loadingService: LoadingService) {}

  getProducts(): Observable<any[]> {
    this.loadingService.show();
    return this.http.get<any[]>(`${this.apiUrl}/products`)
      .pipe(
        timeout(10000),
        finalize(() => this.loadingService.hide())
      );
  }

  createOrder(order: any): Observable<any> {
    this.loadingService.show();
    return this.http.post<any>(`${this.apiUrl}/orders`, order)
      .pipe(
        timeout(15000),
        finalize(() => this.loadingService.hide())
      );
  }
}