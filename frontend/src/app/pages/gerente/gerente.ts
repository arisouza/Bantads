import {
  Component,
  DestroyRef,
  OnInit,
  inject,
  signal
} from '@angular/core';

import { DatePipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';

import {
  AuthenticatedLayoutComponent
} from '../../shared/components/authenticated-layout/authenticated-layout';

import {
  GERENTE_MENU_ITEMS
} from '../../shared/config/menu-items';

import {
  Solicitacao,
  StatusSolicitacao
} from '../../shared/models/solicitacao';

import {
  SolicitacaoService
} from '../../shared/services/solicitacao';

import {
  formatarMoeda
} from '../../shared/utils/formatar-moeda';

@Component({
  selector: 'app-gerente',
  imports: [
    DatePipe,
    MatButtonModule,
    AuthenticatedLayoutComponent
  ],
  templateUrl: './gerente.html',
  styleUrl: './gerente.css'
})
export class Gerente implements OnInit {
  private readonly solicitacaoService =
    inject(SolicitacaoService);

  private readonly destroyRef = inject(DestroyRef);

  readonly menuItems = GERENTE_MENU_ITEMS;
  readonly formatarMoeda = formatarMoeda;

  readonly solicitacoes = signal<Solicitacao[]>([]);
  readonly carregando = signal(false);
  readonly mensagemErro = signal('');

  readonly rotulosStatus: Record<StatusSolicitacao, string> = {
    PENDENTE: 'Pendente',
    APROVADO: 'Aprovado',
    NAO_APROVADO: 'Não aprovado'
  };

  ngOnInit(): void {
    this.carregarSolicitacoes();
  }

  carregarSolicitacoes(): void {
    if (this.carregando()) {
      return;
    }

    this.carregando.set(true);
    this.mensagemErro.set('');

    this.solicitacaoService.listar()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.carregando.set(false))
      )
      .subscribe({
        next: solicitacoes => {
          this.solicitacoes.set(solicitacoes);
        },

        error: erro => {
          this.solicitacoes.set([]);

          if (erro.status === 401) {
            this.mensagemErro.set(
              'Sua sessão expirou. Entre novamente.'
            );
            return;
          }

          if (erro.status === 403) {
            this.mensagemErro.set(
              'Você não possui permissão para consultar as solicitações.'
            );
            return;
          }

          this.mensagemErro.set(
            'Não foi possível carregar as solicitações. Tente novamente.'
          );
        }
      });
  }

  formatarCpf(cpf: string): string {
    return cpf.replace(
      /^(\d{3})(\d{3})(\d{3})(\d{2})$/,
      '$1.$2.$3-$4'
    );
  }
}