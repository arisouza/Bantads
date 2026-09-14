import { Component, computed, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import Decimal from 'decimal.js';

import { AuthenticatedLayoutComponent } from '../../shared/components/authenticated-layout/authenticated-layout';
import { SidebarItem } from '../../shared/components/sidebar/sidebar';
import { Conta } from '../../shared/models/conta';
import { AuthService, LoginResponse } from '../../shared/services/auth';
import { ContaService } from '../../shared/services/conta';

@Component({
  imports: [
    AuthenticatedLayoutComponent,
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
  readonly conta = signal<Conta | null>(null);
  readonly saldoFormatado = computed(() => {
    const conta = this.conta();
    return conta?.saldo ? this.formatarSaldo(conta.saldo) : null;
  });
  readonly erro = signal<string | null>(null);
  readonly menuItems: SidebarItem[] = [
    { label: 'Início', route: '/cliente', icon: 'home' },
    { label: 'Depositar', route: '/cliente/deposito', icon: 'add_circle' },
    { label: 'Sacar', route: '/cliente/saque', icon: 'remove_circle' },
    { label: 'Transferir', route: '/cliente/transferencia', icon: 'swap_horiz' },
    { label: 'Extrato', route: '/cliente/extrato', icon: 'receipt_long' }
  ];

  constructor(
    private authService: AuthService,
    private contaService: ContaService
  ) {}

  ngOnInit(): void {
    this.usuario = this.authService.getUsuario();

    if (!this.usuario?.cpf) {
      this.erro.set('Não foi possível identificar o usuário autenticado.');
      return;
    }

    this.contaService.buscarPorCpf(this.usuario.cpf).subscribe({
      next: (conta) => {
        this.conta.set(conta);
      },
      error: () => {
        this.erro.set('Não foi possível carregar os dados da conta.');
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
