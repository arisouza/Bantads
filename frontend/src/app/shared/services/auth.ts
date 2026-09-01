import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, finalize, map, tap } from 'rxjs';

export type UserTipo = 'CLIENTE' | 'GERENTE';

export interface LoginResponse {
  auth: boolean;
  token: string;
  tipo: UserTipo;
  usuario: {
    cpf: string;
    nome: string;
    email: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly API_URL = 'http://localhost:3000';

  constructor(private http: HttpClient) {}

  login(credentials: { email: string; senha: string }): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.API_URL}/login`, credentials).pipe(
      tap((res) => {
        if (res && res.token) {
          // Salva o token que o auth.interceptor.ts vai usar no cabeçalho x-access-token
          localStorage.setItem('token', res.token);
          localStorage.setItem('tipo', res.tipo);
          localStorage.setItem('usuario', JSON.stringify(res.usuario));
        }
      })
    );
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  getTipo(): UserTipo | null {
    const tipo = localStorage.getItem('tipo');
    return tipo === 'CLIENTE' || tipo === 'GERENTE' ? tipo : null;
  }

  getHomeRouteByTipo(): '/cliente' | '/gerente' | '/login' {
    const tipo = this.getTipo();

    if (tipo === 'CLIENTE') {
      return '/cliente';
    }

    if (tipo === 'GERENTE') {
      return '/gerente';
    }

    return '/login';
  }

  getUsuario(): any {
    const user = localStorage.getItem('usuario');
    return user ? JSON.parse(user) : null;
  }

  clearSession(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('tipo');
    localStorage.removeItem('usuario');
  }

  logout(): Observable<void> {
    return this.http.post<void>(`${this.API_URL}/logout`, {}).pipe(
      map(() => undefined),
      finalize(() => this.clearSession())
    );
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }
}
