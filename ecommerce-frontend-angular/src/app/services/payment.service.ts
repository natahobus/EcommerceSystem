import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PaymentService {
  private apiUrl = 'http://localhost:8081/api';

  constructor(private http: HttpClient) {}

  processPayment(payment: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/payments`, payment);
  }
}