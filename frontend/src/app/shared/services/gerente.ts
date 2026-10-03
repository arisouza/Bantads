import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, switchMap, throwError } from 'rxjs';
import { filter, take } from 'rxjs/operators';

import { environment } from '../../../environments/environment';
import { Cliente } from '../models/cliente';
import { JobAcceptedResponse } from '../models/job';
import { JobService } from './job';

@Injectable({
  providedIn: 'root'
})
export class GerenteService {

  private readonly API_URL = environment.apiUrl;

  constructor(
    private http: HttpClient,
    private jobService: JobService
  ) {}

  aprovarCliente(cpf: string): Observable<Cliente> {
    return this.http.post<JobAcceptedResponse>(
      `${this.API_URL}/solicitacoes/${encodeURIComponent(cpf)}/aprovacao`,
      null
    ).pipe(
      switchMap(({ jobId }) => this.jobService.pollStatus(jobId).pipe(
        filter(job => job.status !== 'PENDENTE'),
        take(1)
      )),
      switchMap(job => {
        if (
          job.status !== 'CONCLUIDO' ||
          job.resultType !== 'resource' ||
          job.dominio !== 'clientes' ||
          !job.resourceId
        ) {
          return throwError(() => new Error(
            'Resposta incompatível ao concluir a aprovação do cliente.'
          ));
        }

        return this.http.get<Cliente>(
          `${this.API_URL}/clientes/${encodeURIComponent(job.resourceId)}`
        );
      })
    );
  }
}
