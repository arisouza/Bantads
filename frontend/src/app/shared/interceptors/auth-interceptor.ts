import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { tap } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {

  const router = inject(Router);
  const token = localStorage.getItem('token');

  let authReq = req;

  if (token) {
    authReq = req.clone({
      headers: req.headers.set('x-access-token', token)
    });
  }

  return next(authReq).pipe(
    tap({
      next: (event) => {

        if (event instanceof HttpResponse && event.status === 202) {
          console.log(
            'Operação aceita de forma assíncrona (Job/SAGA iniciada):',
            event.body
          );
        }

      },

      error: (error) => {

        if (error.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('tipo');
          localStorage.removeItem('usuario');

          router.navigate(['/login']);
        }

      }
    })
  );
};