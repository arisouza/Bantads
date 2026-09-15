import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Conta } from '../models/conta';
import { ExtratoResponse } from '../models/extrato';

export interface TransferenciaRequest {
  contaDestino: string;
  valor: string;
}

export interface OperacaoResponse {
  mensagem: string;
}

@Injectable({
  providedIn: 'root'
})
export class ContaService {

  private readonly API_URL = environment.apiUrl;

  constructor(private http: HttpClient) {}

  buscarPorCpf(cpf: string): Observable<Conta> {
    return this.http.get<Conta>(
      `${this.API_URL}/contas/cliente/${encodeURIComponent(cpf)}`
    );
  }

  buscarExtrato(
    numeroConta: string,
    inicio: string,
    fim: string
  ): Observable<ExtratoResponse> {
    return this.http.get<ExtratoResponse>(
      `${this.API_URL}/contas/${encodeURIComponent(numeroConta)}/extrato`,
      {
        params: {
          inicio, fim
      }
    }
  );
}

  transferir(
      numeroConta: string,
      transferencia: TransferenciaRequest
  ): Observable<OperacaoResponse> {

    return this.http.post<OperacaoResponse>(
     `${this.API_URL}/contas/${encodeURIComponent(numeroConta)}/transferencia`,
      transferencia
   );
  }

}
