import {
  ChangeDetectorRef,
  Component,
  OnInit
} from '@angular/core';

import {
  FormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';

import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import Decimal from 'decimal.js';
import { finalize } from 'rxjs';

import { Conta } from '../../../shared/models/conta';
import { AuthService } from '../../../shared/services/auth';
import { RouterLink } from '@angular/router';
import {
  ContaService
} from '../../../shared/services/conta';

import {
  formatarMoeda as formatarMoedaUtil
} from '../../../shared/utils/formatar-moeda';

@Component({
  selector: 'app-transferencia',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    RouterLink
  ],
  styleUrl: './transferencia.css',
  templateUrl: './transferencia.html'
})
export class Transferencia implements OnInit {

  readonly formatarMoeda = formatarMoedaUtil;

  conta: Conta | null = null;

  carregandoConta = false;
  processando = false;

  mensagemSucesso = '';
  mensagemErro = '';

  readonly formulario;

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private contaService: ContaService,
    private changeDetector: ChangeDetectorRef
  ) {
    this.formulario = this.formBuilder.nonNullable.group({
      contaDestino: [
        '',
        [
          Validators.required,
          Validators.pattern(/^\d{4}$/)
        ]
      ],

      valor: [
        '',
        [
          Validators.required,
          Validators.pattern(/^\d+(?:[.,]\d{1,2})?$/)
        ]
      ]
    });
  }

  ngOnInit(): void {
    this.buscarContaDoCliente();
  }

  transferir(): void {
    this.mensagemSucesso = '';
    this.mensagemErro = '';

    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    if (!this.conta) {
      this.mensagemErro =
        'Não foi possível identificar a conta de origem.';
      return;
    }

    const dados = this.formulario.getRawValue();
    const contaDestino = dados.contaDestino.trim();

    if (contaDestino === this.conta.numeroConta) {
      this.mensagemErro =
        'A conta de destino deve ser diferente da conta de origem.';
      return;
    }

    const valor = new Decimal(
      dados.valor.replace(',', '.')
    );

    if (valor.lessThanOrEqualTo(0)) {
      this.mensagemErro =
        'O valor da transferência deve ser maior que zero.';
      return;
    }

    if (valor.greaterThan(new Decimal(this.conta.saldo))) {
      this.mensagemErro =
        'Saldo insuficiente para realizar a transferência.';
      return;
    }

    this.processando = true;

    this.contaService.transferir(
      this.conta.numeroConta,
      {
        contaDestino,
        valor: valor.toFixed(2)
      }
    ).pipe(
      finalize(() => {
        this.processando = false;
        this.changeDetector.detectChanges();
      })
    ).subscribe({
      next: resposta => {
        this.mensagemSucesso =
          resposta.mensagem ??
          'Transferência realizada com sucesso.';

        this.formulario.reset();
        this.buscarContaDoCliente();
      },

      error: erro => {
        if (erro.status === 404) {
          this.mensagemErro =
            'Conta de destino não encontrada.';
          return;
        }

        if (erro.status === 403) {
          this.mensagemErro =
            'Você não possui permissão para movimentar esta conta.';
          return;
        }

        if (erro.status === 422) {
          this.mensagemErro =
            erro.error?.mensagem ??
            erro.error?.message ??
            'Saldo insuficiente ou valor inválido.';
          return;
        }

        this.mensagemErro =
          'Não foi possível realizar a transferência.';
      }
    });
  }

  private buscarContaDoCliente(): void {
    const usuario = this.authService.getUsuario();

    if (!usuario?.cpf) {
      this.mensagemErro =
        'Não foi possível identificar o cliente logado.';
      return;
    }

    this.carregandoConta = true;
    this.mensagemErro = '';

    this.contaService.buscarPorCpf(usuario.cpf).pipe(
      finalize(() => {
        this.carregandoConta = false;
        this.changeDetector.detectChanges();
      })
    ).subscribe({
      next: conta => {
        this.conta = conta;
      },

      error: () => {
        this.mensagemErro =
          'Não foi possível carregar os dados da conta.';
      }
    });
  }
}   