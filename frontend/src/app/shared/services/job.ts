import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, throwError, timer } from 'rxjs';
import { concatMap, filter, take, takeWhile, timeout } from 'rxjs/operators';

import { environment } from '../../../environments/environment';
import { JobStatusResponse } from '../models/job';

@Injectable({
  providedIn: 'root'
})
export class JobService {

  private readonly API_URL = environment.apiUrl;
  private readonly POLLING_INTERVAL_MS = 1000;
  private readonly MAX_POLLING_ATTEMPTS = 120;

  constructor(private http: HttpClient) {}

  getStatus(jobId: string): Observable<JobStatusResponse> {
    return this.http.get<JobStatusResponse>(
      `${this.API_URL}/jobs/${encodeURIComponent(jobId)}/status`
    );
  }

  pollStatus(jobId: string): Observable<JobStatusResponse> {
    return timer(0, this.POLLING_INTERVAL_MS).pipe(
      take(this.MAX_POLLING_ATTEMPTS + 1),
      concatMap((_, attempt) => {
        if (attempt === this.MAX_POLLING_ATTEMPTS) {
          return throwError(() => new Error(
            'Tempo limite excedido ao aguardar a conclusão do job.'
          ));
        }

        return this.getStatus(jobId);
      }),
      timeout({ each: this.POLLING_INTERVAL_MS * 5 }),
      concatMap(status => {
        if (status.status === 'FALHA') {
          return throwError(() => new Error(status.erro || 'O job falhou.'));
        }

        return [status];
      }),
      takeWhile(status => status.status === 'PENDENTE', true),
      filter(status => status.status !== 'PENDENTE')
    );
  }
}
