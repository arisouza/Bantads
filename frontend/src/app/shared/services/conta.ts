import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Conta } from '../models/conta';

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
}
