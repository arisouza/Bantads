import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';

import Decimal from 'decimal.js';
import { DateTime } from 'luxon';
import { finalize, switchMap } from 'rxjs';

import {
  ExtratoResponse,
  Movimentacao
} from '../../../shared/models/extrato';

import { AuthService } from '../../../shared/services/auth';
import { ContaService } from '../../../shared/services/conta';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AuthenticatedLayoutComponent } from '../../../shared/components/authenticated-layout/authenticated-layout';
import { CLIENTE_MENU_ITEMS } from '../../../shared/config/menu-items';

interface DiaExtrato {
  data: string;
  saldo: string;
  movimentacoes: Movimentacao[];
}

@Component({
  selector: 'app-extrato',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    MatIconModule,
    AuthenticatedLayoutComponent
  ],
  templateUrl: './extrato.html',
  styleUrl: './extrato.css'
})
export class Extrato implements OnInit {

  readonly menuItems = CLIENTE_MENU_ITEMS;

  private readonly formBuilder = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly contaService = inject(ContaService);

  extrato: ExtratoResponse | null = null;
  diasDoExtrato: DiaExtrato[] = [];

  carregando = false;
  mensagemErro = '';

  readonly formulario = this.formBuilder.nonNullable.group({
    inicio: [
      DateTime.now().minus({ days: 29 }).toISODate()!,
      Validators.required
    ],
    fim: [
      DateTime.now().toISODate()!,
      Validators.required
    ]
  });

  ngOnInit(): void {
    this.consultarExtrato();
  }

  consultarExtrato(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    const { inicio, fim } = this.formulario.getRawValue();

    const dataInicial = DateTime.fromISO(inicio);
    const dataFinal = DateTime.fromISO(fim);
    const quantidadeDias = dataFinal.diff(dataInicial, 'days').days;

    if (dataFinal < dataInicial) {
      this.mensagemErro =
        'A data final não pode ser anterior à data inicial.';
      return;
    }

    if (quantidadeDias > 365) {
      this.mensagemErro =
        'O período máximo permitido é de 365 dias.';
      return;
    }

    const usuario = this.authService.getUsuario();

    if (!usuario?.cpf) {
      this.mensagemErro =
        'Não foi possível identificar o cliente.';
      return;
    }

    this.carregando = true;
    this.mensagemErro = '';

    this.contaService.buscarPorCpf(usuario.cpf).pipe(
      switchMap(conta =>
        this.contaService.buscarExtrato(
          conta.numeroConta,
          inicio,
          fim
        )
      ),
      finalize(() => {
        this.carregando = false;
      })
    ).subscribe({
      next: resposta => {
        this.extrato = resposta;
        this.diasDoExtrato = this.montarLinhaDoTempo(resposta);
      },
      error: erro => {
        console.error('Erro ao consultar extrato:', erro);

        this.extrato = null;
        this.diasDoExtrato = [];
        this.mensagemErro =
          'Não foi possível carregar o extrato.';
      }
    });
  }

  private montarLinhaDoTempo(
    extrato: ExtratoResponse
  ): DiaExtrato[] {

    const movimentacoesPorDia =
      new Map<string, Movimentacao[]>();

    for (const movimentacao of extrato.movimentacoes) {
      const data = DateTime
        .fromISO(movimentacao.timestamp)
        .toISODate();

      if (!data) {
        continue;
      }

      const movimentacoesDoDia =
        movimentacoesPorDia.get(data) ?? [];

      movimentacoesDoDia.push(movimentacao);
      movimentacoesPorDia.set(data, movimentacoesDoDia);
    }

    const { inicio, fim } = this.formulario.getRawValue();

    let dataAtual = DateTime.fromISO(inicio);
    const dataFinal = DateTime.fromISO(fim);

    let saldoAtual = new Decimal(extrato.saldoAbertura);
    const dias: DiaExtrato[] = [];

    while (dataAtual <= dataFinal) {
      const data = dataAtual.toISODate()!;
      const movimentacoes =
        movimentacoesPorDia.get(data) ?? [];

      movimentacoes.sort((primeira, segunda) =>
        primeira.timestamp.localeCompare(segunda.timestamp)
      );

      for (const movimentacao of movimentacoes) {
        const valor = new Decimal(movimentacao.valor);

        if (this.movimentacaoAumentaSaldo(movimentacao)) {
          saldoAtual = saldoAtual.plus(valor);
        }

        if (this.movimentacaoDiminuiSaldo(movimentacao)) {
          saldoAtual = saldoAtual.minus(valor);
        }
      }

      dias.push({
        data,
        saldo: saldoAtual.toFixed(2),
        movimentacoes
      });

      dataAtual = dataAtual.plus({ days: 1 });
    }

    return dias;
  }

  movimentacaoAumentaSaldo(
    movimentacao: Movimentacao
  ): boolean {
    return movimentacao.tipo === 'Depósito' ||
      movimentacao.tipo === 'DEPOSITO' ||
      movimentacao.tipo === 'TransferênciaDestino' ||
      movimentacao.tipo === 'TRANSFERENCIA_DESTINO';
  }

  movimentacaoDiminuiSaldo(
    movimentacao: Movimentacao
  ): boolean {
    return movimentacao.tipo === 'Saque' ||
      movimentacao.tipo === 'SAQUE' ||
      movimentacao.tipo === 'TransferênciaOrigem' ||
      movimentacao.tipo === 'TRANSFERENCIA_ORIGEM';
  }

  identificarDia(
    indice: number,
    dia: DiaExtrato
  ): string {
    return dia.data;
  }

  identificarMovimentacao(
    indice: number,
    movimentacao: Movimentacao
  ): string {
    return movimentacao.id;
  }
}
