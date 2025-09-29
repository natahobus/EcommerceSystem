import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class WebSocketService {
  private socket?: WebSocket;
  private messageSubject = new Subject<any>();
  public messages$ = this.messageSubject.asObservable();

  connect() {
    this.socket = new WebSocket(environment.wsUrl);
    
    this.socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.messageSubject.next(data);
    };

    this.socket.onclose = () => {
      setTimeout(() => this.connect(), 5000);
    };
  }

  disconnect() {
    if (this.socket) {
      this.socket.close();
    }
  }
}