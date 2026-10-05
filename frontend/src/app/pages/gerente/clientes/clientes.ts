import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';

import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';


import { AuthenticatedLayoutComponent } from '../../../shared/components/authenticated-layout/authenticated-layout';
import { GERENTE_MENU_ITEMS } from '../../../shared/config/menu-items';
import { Cliente } from '../../../shared/models/cliente';
import { ClienteService } from '../../../shared/services/cliente';

@Component({
  selector: 'app-clientes',
  imports: [
    FormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    AuthenticatedLayoutComponent
  ],
  templateUrl: './clientes.html',
  styleUrl: './clientes.css'
})
export class Clientes implements OnInit {

  private readonly clienteService = inject(ClienteService);
  private readonly destroyRef = inject(DestroyRef);

  readonly menuItems = GERENTE_MENU_ITEMS;

  readonly clientes = signal<Cliente[]>([]);
  readonly carregando = signal(false);
  readonly mensagemErro = signal('');

  busca = '';

  ngOnInit(): void {
    this.carregarClientes();
  }

  carregarClientes(): void {
    if (this.carregando()) {
      return;
    }

    this.carregando.set(true);
    this.mensagemErro.set('');

    this.clienteService.listar(this.busca)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.carregando.set(false))
      )
      .subscribe({
        next: resposta => {
          this.clientes.set(resposta.clientes ?? []);
        },

        error: erro => {
          this.clientes.set([]);

          if (erro.status === 401) {
            this.mensagemErro.set(
              'Sua sessão expirou. Entre novamente.'
            );
            return;
          }

          if (erro.status === 403) {
            this.mensagemErro.set(
              'Você não possui permissão para consultar os clientes.'
            );
            return;
          }

          this.mensagemErro.set(
            'Não foi possível carregar os clientes. Tente novamente.'
          );
        }
      });
  }

  limparBusca(): void {
    this.busca = '';
    this.carregarClientes();
  }

  formatarCpf(cpf: string): string {
    return cpf.replace(
      /^(\d{3})(\d{3})(\d{3})(\d{2})$/,
      '$1.$2.$3-$4'
    );
  }

  formatarSaldo(saldo?: string): string {
    const valor = Number(saldo ?? 0);

    return valor.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  }
}
