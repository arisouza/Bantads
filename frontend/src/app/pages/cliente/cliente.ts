import { Component, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import Decimal from 'decimal.js';

import { Conta } from '../../shared/models/conta';
import { AuthService, LoginResponse } from '../../shared/services/auth';
import { ContaService } from '../../shared/services/conta';

@Component({
  imports: [
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatIconModule
  ],
  selector: 'app-cliente',
  styleUrl: './cliente.css',
  templateUrl: './cliente.html',
})
export class Cliente implements OnInit {

  usuario: LoginResponse['usuario'] | null = null;
  conta: Conta | null = null;
  saldoFormatado: string | null = null;
  erro = '';

  constructor(
    private authService: AuthService,
    private contaService: ContaService
  ) {}

  ngOnInit(): void {
    this.usuario = this.authService.getUsuario();

    if (!this.usuario?.cpf) {
      this.erro = 'Não foi possível identificar o usuário autenticado.';
      return;
    }

    this.contaService.buscarPorCpf(this.usuario.cpf).subscribe({
      next: (conta) => {
        this.conta = conta;
        this.saldoFormatado = this.formatarSaldo(conta.saldo);
      },
      error: () => {
        this.erro = 'Não foi possível carregar os dados da conta.';
      }
    });
  }

  private formatarSaldo(saldo: string | null | undefined): string | null {
    try {
      if (typeof saldo !== 'string' || !saldo.trim()) {
        return null;
      }

      const valor = new Decimal(saldo);
      if (!valor.isFinite()) {
        return null;
      }

      const [parteInteira, parteDecimal] = valor.toFixed(2).split('.');
      const parteInteiraFormatada = parteInteira.replace(
        /\B(?=(\d{3})+(?!\d))/g,
        '.'
      );

      return `R$ ${parteInteiraFormatada},${parteDecimal}`;
    } catch {
      return null;
    }
  }
}
