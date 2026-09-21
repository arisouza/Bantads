import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { AuthenticatedLayoutComponent } from '../../../shared/components/authenticated-layout/authenticated-layout';
import { CLIENTE_MENU_ITEMS } from '../../../shared/config/menu-items';
import { Conta } from '../../../shared/models/conta';
import { AuthService } from '../../../shared/services/auth';
import { ContaService } from '../../../shared/services/conta';
import { formatarMoeda } from '../../../shared/utils/formatar-moeda';
import { concatMap, finalize, take, takeWhile, timer } from 'rxjs';
import Decimal from 'decimal.js';
import { ModalComponent } from '../../../shared/components/modal/modal';

@Component({
  imports: [AuthenticatedLayoutComponent, ReactiveFormsModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatIconModule, RouterLink, ModalComponent],
  selector: 'app-saque',
  styleUrl: './saque.css',
  templateUrl: './saque.html',
})
export class Saque implements OnInit {
  conta: Conta | null = null;
  carregando = true;
  mensagemErro = '';
  mensagemSucesso = '';
  mensagemInfo = '';
  processando = false;
  modalAberto = false;
  valorPendente = '';
  readonly formatarMoeda = formatarMoeda;
  readonly menuItems = CLIENTE_MENU_ITEMS;
  readonly formulario;

  constructor(private formBuilder: FormBuilder, private authService: AuthService, private contaService: ContaService, private changeDetector: ChangeDetectorRef) {
    this.formulario = this.formBuilder.nonNullable.group({
      valor: ['', [Validators.required, Validators.pattern(/^\d+(?:[.,]\d{1,2})?$/)]]
    });
  }

  ngOnInit(): void {
    this.buscarConta();
  }

  sacar(): void {
    this.mensagemErro = '';
    this.mensagemSucesso = '';
    this.mensagemInfo = '';

    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    if (!this.conta) {
      this.mensagemErro = 'Não foi possível identificar a conta.';
      return;
    }

    this.valorPendente = this.formulario.controls.valor.value.replace(',', '.');
    this.modalAberto = true;
    this.changeDetector.detectChanges();
  }

  cancelarConfirmacao(): void {
    if (!this.processando) {
      this.modalAberto = false;
      this.changeDetector.detectChanges();
    }
  }

  confirmarSaque(): void {
    if (this.processando || !this.conta || !this.valorPendente) return;

    this.modalAberto = false;
    this.processando = true;
    const saldoAnterior = new Decimal(this.conta.saldo);
    const valor = new Decimal(this.valorPendente);
    const saldoEsperado = saldoAnterior.minus(valor).toFixed(4);
    this.changeDetector.detectChanges();

    this.contaService.sacar(this.conta.numeroConta, valor.toFixed(2)).subscribe({
      next: resposta => {
        this.formulario.reset();
        this.mensagemSucesso = resposta.mensagem || 'Saque realizado com sucesso.';
        this.changeDetector.detectChanges();
        this.reconsultarConta(saldoEsperado);
      },
      error: erro => {
        this.processando = false;
        this.mensagemErro = this.mensagemParaErro(erro);
        this.changeDetector.detectChanges();
      }
    });
  }

  private buscarConta(): void {
    const usuario = this.authService.getUsuario();
    if (!usuario?.cpf) { this.mensagemErro = 'Não foi possível identificar o cliente.'; this.carregando = false; return; }
    this.contaService.buscarPorCpf(usuario.cpf).subscribe({
      next: conta => { this.conta = conta; this.carregando = false; this.changeDetector.detectChanges(); },
      error: () => { this.mensagemErro = 'Não foi possível carregar os dados da conta.'; this.carregando = false; this.changeDetector.detectChanges(); }
    });
  }

  private reconsultarConta(saldoEsperado: string): void {
    const usuario = this.authService.getUsuario();
    if (!usuario?.cpf) { this.processando = false; this.changeDetector.detectChanges(); return; }

    let saldoAtualizado = false;

    timer(0, 300).pipe(
      take(5),
      concatMap(() => this.contaService.buscarPorCpf(usuario.cpf)),
      takeWhile(conta => {
        this.conta = conta;
        saldoAtualizado = new Decimal(conta.saldo).equals(new Decimal(saldoEsperado));
        this.changeDetector.detectChanges();
        return !saldoAtualizado;
      }, true),
      finalize(() => {
        this.processando = false;
        if (!saldoAtualizado) this.mensagemInfo = 'O saldo pode levar alguns instantes para atualizar.';
        this.changeDetector.detectChanges();
      })
    ).subscribe({
      error: () => { this.mensagemInfo = 'O saldo pode levar alguns instantes para atualizar.'; this.changeDetector.detectChanges(); }
    });
  }

  private mensagemParaErro(erro: { status?: number; error?: { mensagem?: string } }): string {
    if (erro.status === 422) return 'Saldo insuficiente para realizar o saque.';
    if (erro.status === 403) return 'Você não possui permissão para movimentar esta conta.';
    if (erro.status === 404) return 'Conta não encontrada.';
    return erro.error?.mensagem || 'Não foi possível realizar o saque.';
  }
}
