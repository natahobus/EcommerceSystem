import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
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
      .pipe(finalize(() => this.loadingService.hide()));
  }

  createOrder(order: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/orders`, order);
  }
}