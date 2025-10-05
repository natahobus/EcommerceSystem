import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class VoiceSearchService {
  private recognition: any;
  private searchSubject = new Subject<string>();
  public searchResult$ = this.searchSubject.asObservable();

  constructor() {
    if ('webkitSpeechRecognition' in window) {
      this.recognition = new (window as any).webkitSpeechRecognition();
      this.recognition.continuous = false;
      this.recognition.interimResults = false;
      this.recognition.lang = 'pt-BR';
      
      this.recognition.onresult = (event: any) => {
        const result = event.results[0][0].transcript;
        this.searchSubject.next(result);
      };
    }
  }

  isSupported(): boolean {
    return !!this.recognition;
  }

  startListening() {
    if (this.recognition) {
      this.recognition.start();
    }
  }

  stopListening() {
    if (this.recognition) {
      this.recognition.stop();
    }
  }
}