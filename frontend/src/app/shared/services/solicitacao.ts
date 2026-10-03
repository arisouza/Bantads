import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { environment } from '../../../environments/environment';
import { Solicitacao } from '../models/solicitacao';

@Injectable({
  providedIn: 'root'
})
export class SolicitacaoService {
  private readonly http = inject(HttpClient);

  private readonly url =
    `${environment.apiUrl}/solicitacoes`;

  listar(): Observable<Solicitacao[]> {
    return this.http.get<Solicitacao[] | { solicitacoes: Solicitacao[] }>(this.url).pipe(
      map(response => Array.isArray(response) ? response : response.solicitacoes ?? [])
    );
  }
}
