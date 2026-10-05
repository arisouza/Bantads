import {
  Component,
  DestroyRef,
  OnInit,
  inject,
  signal
} from '@angular/core';

import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize, switchMap } from 'rxjs';

import { MatButtonModule } from '@angular/material/button';

import { AuthenticatedLayoutComponent } from '../../../shared/components/authenticated-layout/authenticated-layout';
import { GERENTE_MENU_ITEMS } from '../../../shared/config/menu-items';

import {
  JobService
} from '../../../shared/services/job';

import {
  RelatorioCliente
} from '../../../shared/models/job';

@Component({
  selector: 'app-relatorio',
  imports: [
    MatButtonModule,
    AuthenticatedLayoutComponent
  ],
  templateUrl: './relatorio.html',
  styleUrl: './relatorio.css'
})
export class Relatorio implements OnInit {

  private readonly jobService = inject(JobService);

  private readonly destroyRef = inject(DestroyRef);

  readonly menuItems = GERENTE_MENU_ITEMS;

  readonly clientes = signal<RelatorioCliente[]>([]);

  readonly carregando = signal(false);

  readonly mensagemErro = signal('');

  readonly mensagemSucesso = signal('');

  readonly status = signal('');

  ngOnInit(): void {
    // O relatório é gerado somente quando o gerente solicitar.
  }

  gerarRelatorio(): void {

    if (this.carregando()) {
      return;
    }

    this.carregando.set(true);

    this.mensagemErro.set('');

    this.mensagemSucesso.set('');

    this.clientes.set([]);

    this.status.set('Gerando relatório...');

    this.jobService.gerarRelatorioClientes()
      .pipe(

        takeUntilDestroyed(this.destroyRef),

        switchMap(job => {

          this.status.set(
            'Relatório em processamento...'
          );

          return this.jobService.pollStatus(job.jobId);
        }),

        switchMap(status => {

          if (status.status !== 'CONCLUIDO') {

            throw new Error(
              'Não foi possível concluir o relatório.'
            );
          }

          this.status.set(
            'Relatório concluído. Carregando dados...'
          );

          return this.jobService.getResult(status.jobId);
        }),

        finalize(() => {

          this.carregando.set(false);

        })

      )
      .subscribe({

        next: resultado => {

          this.clientes.set(
            resultado.clientes ?? []
          );

          this.status.set('');

          this.mensagemSucesso.set(
            'Relatório gerado com sucesso.'
          );
        },

        error: erro => {

          this.status.set('');

          this.clientes.set([]);

          this.mensagemErro.set(
            erro?.error?.mensagem ||
            erro?.error?.message ||
            erro?.message ||
            'Não foi possível gerar o relatório.'
          );
        }

      });
  }

  formatarCpf(cpf: string | null): string {

    if (!cpf) {
      return '—';
    }

    return cpf.replace(
      /^(\d{3})(\d{3})(\d{3})(\d{2})$/,
      '$1.$2.$3-$4'
    );
  }

  formatarMoeda(
    valor: string | number | null
  ): string {

    if (valor === null || valor === undefined) {
      return '—';
    }

    const numero = Number(valor);

    if (Number.isNaN(numero)) {
      return '—';
    }

    return numero.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  }
}