import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { tap } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const token = localStorage.getItem('token');

  // Clona a requisição injetando o header x-access-token exigido pelo Gateway
  let authReq = req;
  if (token) {
    authReq = req.clone({
      headers: req.headers.set('x-access-token', token)
    });
  }

  return next(authReq).pipe(
    tap({
      next: (event) => {
        // Trata o retorno 202 Accepted para chamadas assíncronas (SAGAs / Jobs)[cite: 1]
        if (event instanceof HttpResponse && event.status === 202) {
          console.log('Operação aceita de forma assíncrona (Job/SAGA iniciada):', event.body);
        }
      },
      error: (error) => {
        // Caso o token expire ou a sessão seja revogada[cite: 1]
        if (error.status === 401) {
          localStorage.clear();
          router.navigate(['/login']);
        }
      }
    })
  );
};