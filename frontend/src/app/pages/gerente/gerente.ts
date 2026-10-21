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
import { GerenteService } from '../../shared/services/gerente';

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
  private readonly gerenteService = inject(GerenteService);

  private readonly destroyRef = inject(DestroyRef);

  readonly menuItems = GERENTE_MENU_ITEMS;
  readonly formatarMoeda = formatarMoeda;

  readonly solicitacoes = signal<Solicitacao[]>([]);
  readonly carregando = signal(false);
  readonly mensagemErro = signal('');
  readonly processando = signal<string | null>(null);
  readonly mensagemSucesso = signal('');

  readonly rotulosStatus: Record<StatusSolicitacao, string> = {
    PENDENTE: 'Pendente',
    APROVADO: 'Aprovado',
    NAO_APROVADO: 'Não aprovado'
  };
  
  readonly recusandoCpf = signal<string | null>(null);
  readonly motivoRecusa = signal('');

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

          if (erro.status === 500) {
            this.mensagemErro.set('O servidor não conseguiu carregar as solicitações. Tente novamente.');
            return;
          }

          this.mensagemErro.set(
            'Não foi possível carregar as solicitações. Tente novamente.'
          );
        }
      });
  }

  aprovar(solicitacao: Solicitacao): void {
    if (solicitacao.status !== 'PENDENTE' || this.processando()) return;
    this.processando.set(solicitacao.cpf);
    this.mensagemErro.set('');
    this.mensagemSucesso.set('');
    this.gerenteService.aprovarCliente(solicitacao.cpf).pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.processando.set(null))
    ).subscribe({
      next: () => {
        this.mensagemSucesso.set('Cliente aprovado com sucesso.');
        this.carregarSolicitacoes();
      },
      error: erro => this.mensagemErro.set(erro?.error?.message || erro?.message || 'Não foi possível aprovar o cliente.')
    });
  }

    
  iniciarRecusa(solicitacao: Solicitacao): void { 
  if (solicitacao.status !== 'PENDENTE' || this.processando()) return;

  this.mensagemErro.set('');
  this.mensagemSucesso.set('');
  this.motivoRecusa.set('');
  this.recusandoCpf.set(solicitacao.cpf);
  }

  cancelarRecusa(): void {
  this.recusandoCpf.set(null);
  this.motivoRecusa.set('');
  }
  
  confirmarRecusa(): void {
    const cpf = this.recusandoCpf();
    const motivo = this.motivoRecusa().trim();

    if (!cpf || !motivo || this.processando()) return;

    this.processando.set(cpf);
    this.mensagemErro.set('');
    this.mensagemSucesso.set('');

    this.gerenteService.recusarCliente(cpf, motivo).pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.processando.set(null))
    ).subscribe({
      next: resposta => {
        this.solicitacoes.update(lista => lista.map(item =>
          item.cpf === cpf
            ? { ...item, ...resposta, status: 'NAO_APROVADO', motivo: resposta.motivo?.trim() || motivo }
            : item
        ));
        this.recusandoCpf.set(null);
        this.motivoRecusa.set('');
        this.mensagemSucesso.set('Solicitação recusada com sucesso.');
      },
      error: erro => {
        const mensagens: Record<number, string> = {
          400: 'Informe um motivo válido para recusar a solicitação.',
          403: 'Você não possui permissão para recusar solicitações.',
          404: 'A solicitação não foi encontrada.',
          409: 'A solicitação já foi processada.',
          500: 'O servidor não conseguiu recusar a solicitação. Tente novamente.'
        };
        this.mensagemErro.set(
          mensagens[erro?.status] ||
          erro?.error?.mensagem ||
          erro?.error?.message ||
          'Não foi possível recusar a solicitação. Tente novamente.'
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
