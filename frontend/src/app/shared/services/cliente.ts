import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';

export interface SolicitacaoAutocadastro {
  nome: string;
  email: string;
  cpf: string;
  telefone: string;
  salario: string;
  logradouro: string;
  numero: string;
  complemento: string;
  cep: string;
  cidade: string;
  uf: string;
}

export interface AutocadastroResponse {
  mensagem?: string;
  status?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ClienteService {

  private readonly API_URL = environment.apiUrl;

  constructor(private http: HttpClient) {}

  solicitarAutocadastro(
    solicitacao: SolicitacaoAutocadastro
  ): Observable<AutocadastroResponse> {

    return this.http.post<AutocadastroResponse>(
      `${this.API_URL}/clientes`,
      solicitacao
    );
  }
}