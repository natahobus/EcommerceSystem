import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';

export interface UploadProgress {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
}

@Injectable({
  providedIn: 'root'
})
export class FileUploadService {
  private uploadSubject = new Subject<UploadProgress>();
  public upload$ = this.uploadSubject.asObservable();

  uploadFile(file: File, url: string): Observable<any> {
    return new Observable(observer => {
      const formData = new FormData();
      formData.append('file', file);

      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          this.uploadSubject.next({
            file,
            progress,
            status: 'uploading'
          });
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          this.uploadSubject.next({
            file,
            progress: 100,
            status: 'completed'
          });
          observer.next(JSON.parse(xhr.responseText));
          observer.complete();
        } else {
          this.uploadSubject.next({
            file,
            progress: 0,
            status: 'error'
          });
          observer.error(xhr.statusText);
        }
      });

      xhr.addEventListener('error', () => {
        this.uploadSubject.next({
          file,
          progress: 0,
          status: 'error'
        });
        observer.error('Upload failed');
      });

      xhr.open('POST', url);
      xhr.send(formData);
    });
  }

  validateFile(file: File, maxSize: number = 5 * 1024 * 1024, allowedTypes: string[] = []): boolean {
    if (file.size > maxSize) {
      return false;
    }

    if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
      return false;
    }

    return true;
  }
}