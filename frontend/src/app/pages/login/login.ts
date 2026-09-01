import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../shared/services/auth';

@Component({
  imports: [
    RouterLink,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule
  ],
  selector: 'app-login',
  styleUrl: './login.css',
  templateUrl: './login.html',
})
export class Login {

  email = '';
  senha = '';
  erro = '';

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  entrar(): void {
    this.erro = '';

    this.authService.login({
      email: this.email,
      senha: this.senha
    }).subscribe({
      next: (res) => {
        if (res.tipo === 'CLIENTE') {
          this.router.navigate(['/cliente']);
          return;
        }

        if (res.tipo === 'GERENTE') {
          this.router.navigate(['/gerente']);
        }
      },

      error: (error) => {
        if (error.status === 401) {
          this.erro = 'E-mail ou senha inválidos.';
          return;
        }

        this.erro = 'Não foi possível realizar o login.';
      }
    });
  }
}