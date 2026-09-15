import { Component, computed, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { formatarMoeda } from '../../shared/utils/formatar-moeda';

import { AuthenticatedLayoutComponent } from '../../shared/components/authenticated-layout/authenticated-layout';
import { SidebarItem } from '../../shared/components/sidebar/sidebar';
import { Conta } from '../../shared/models/conta';
import { AuthService, LoginResponse } from '../../shared/services/auth';
import { ContaService } from '../../shared/services/conta';
import { RouterLink } from '@angular/router';

@Component({
  imports: [
    AuthenticatedLayoutComponent,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    RouterLink
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
    return conta?.saldo ? formatarMoeda(conta.saldo) : null;
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
}
