import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map, switchMap, throwError } from 'rxjs';
import { filter, take } from 'rxjs/operators';

import { environment } from '../../../environments/environment';
import { Cliente } from '../models/cliente';
import {
  AtualizarGerentePayload,
  CriarGerentePayload,
  Gerente,
  GerenteListagem,
  GerentesResponse
} from '../models/gerente';
import {
  JobAcceptedResponse,
  RemoverGerenteResponse
} from '../models/job';
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

  listar(): Observable<GerenteListagem[]> {
    return this.http.get<GerentesResponse>(`${this.API_URL}/gerentes`).pipe(
      map(resposta => resposta.gerentes)
    );
  }

  buscar(cpf: string): Observable<Gerente> {
    return this.http.get<Gerente>(
      `${this.API_URL}/gerentes/${encodeURIComponent(cpf)}`
    );
  }

  inserir(payload: CriarGerentePayload): Observable<Gerente> {
    return this.http.post<JobAcceptedResponse>(
      `${this.API_URL}/gerentes`,
      payload
    ).pipe(
      switchMap(({ jobId }) => this.jobService.pollStatus(jobId)),
      filter(job => job.status !== 'PENDENTE'),
      take(1),
      switchMap(job => {
        if (
          job.status !== 'CONCLUIDO' ||
          job.resultType !== 'resource' ||
          job.dominio !== 'gerentes' ||
          !job.resourceId
        ) {
          return throwError(() => new Error(
            'Resposta incompatível ao concluir a inserção do gerente.'
          ));
        }

        return this.buscar(job.resourceId);
      })
    );
  }

  atualizar(cpf: string, payload: AtualizarGerentePayload): Observable<Gerente> {
    return this.http.put<Gerente>(
      `${this.API_URL}/gerentes/${encodeURIComponent(cpf)}`,
      payload
    );
  }

  remover(cpf: string): Observable<RemoverGerenteResponse> {
    const cpfNormalizado = cpf.replace(/\D/g, '');

    return this.http.delete<JobAcceptedResponse>(
      `${this.API_URL}/gerentes/${encodeURIComponent(cpfNormalizado)}`
    ).pipe(
      switchMap(({ jobId }) => this.jobService.pollStatus(jobId)),
      filter(job => job.status !== 'PENDENTE'),
      take(1),
      switchMap(job => {
        if (job.status !== 'CONCLUIDO' || job.resultType !== 'inline') {
          return throwError(() => new Error(
            'Resposta incompatível ao concluir a remoção do gerente.'
          ));
        }

        return this.jobService.getResult<RemoverGerenteResponse>(job.jobId);
      }),
      switchMap(resultado => {
        if (
          !resultado ||
          !resultado.resultado ||
          typeof resultado.resultado.mensagem !== 'string' ||
          typeof resultado.resultado.quantidadeContas !== 'number'
        ) {
          return throwError(() => new Error(
            'Resposta incompatível ao obter o resultado da remoção do gerente.'
          ));
        }

        return [resultado];
      })
    );
  }

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

  recusarCliente(cpf: string, motivo: string): Observable<import('../models/solicitacao').Solicitacao> {
    return this.http.post<import('../models/solicitacao').Solicitacao>(
      `${this.API_URL}/solicitacoes/${encodeURIComponent(cpf)}/rejeicao`,
      { motivo }
    );
  }
}
