import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { AuthenticatedLayoutComponent } from '../../../shared/components/authenticated-layout/authenticated-layout';
import { GERENTE_MENU_ITEMS } from '../../../shared/config/menu-items';
import { Gerente, GerenteListagem } from '../../../shared/models/gerente';
import { GerenteService } from '../../../shared/services/gerente';

type ModoFormulario = 'nenhum' | 'criar' | 'editar';

const nomeValidator = (control: AbstractControl): ValidationErrors | null =>
  /^[\p{L}]+(?:[\s'’-][\p{L}]+)*$/u.test(String(control.value).trim()) ? null : { nome: true };

const cpfValidator = (control: AbstractControl): ValidationErrors | null => {
  const cpf = String(control.value).replace(/\D/g, '');
  if (!/^\d{11}$/.test(cpf) || /^(\d)\1{10}$/.test(cpf)) return { cpf: true };
  const calcularDigito = (tamanho: number) => {
    let soma = 0;
    for (let i = 0; i < tamanho; i++) soma += +cpf[i] * (tamanho + 1 - i);
    const digito = (soma * 10) % 11;
    return digito === 10 ? 0 : digito;
  };
  return calcularDigito(9) === +cpf[9] && calcularDigito(10) === +cpf[10] ? null : { cpf: true };
};

const telefoneValidator = (control: AbstractControl): ValidationErrors | null => {
  const digitos = String(control.value).replace(/\D/g, '');
  return /^\d{10,11}$/.test(digitos) ? null : { telefone: true };
};

@Component({
  selector: 'app-gerentes',
  imports: [MatButtonModule, MatFormFieldModule, MatInputModule, ReactiveFormsModule, AuthenticatedLayoutComponent],
  templateUrl: './gerentes.html',
  styleUrl: './gerentes.css'
})
export class Gerentes implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly gerenteService = inject(GerenteService);
  private readonly destroyRef = inject(DestroyRef);

  readonly menuItems = GERENTE_MENU_ITEMS;
  readonly gerentes = signal<GerenteListagem[]>([]);
  readonly carregando = signal(false);
  readonly processando = signal(false);
  readonly mensagemErro = signal('');
  readonly mensagemSucesso = signal('');
  readonly modoFormulario = signal<ModoFormulario>('nenhum');
  readonly cpfEmEdicao = signal('');

  readonly formulario = this.formBuilder.nonNullable.group({
    nome: ['', [Validators.required, Validators.minLength(3), nomeValidator]],
    cpf: ['', [Validators.required, cpfValidator]],
    email: ['', [Validators.required, Validators.email]],
    telefone: ['', [Validators.required, telefoneValidator]],
    senha: ['', [Validators.required]]
  });

  ngOnInit(): void { this.carregarGerentes(); }

  carregarGerentes(): void {
    if (this.carregando()) return;
    this.carregando.set(true);
    this.mensagemErro.set('');
    this.gerenteService.listar().pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.carregando.set(false))
    ).subscribe({
      next: gerentes => this.gerentes.set(gerentes),
      error: erro => {
        this.gerentes.set([]);
        this.mensagemErro.set(erro?.error?.mensagem || erro?.error?.message || 'Não foi possível carregar os gerentes. Tente novamente.');
      }
    });
  }

  abrirCriacao(): void {
    if (this.processando()) return;
    this.mensagemErro.set('');
    this.mensagemSucesso.set('');
    this.cpfEmEdicao.set('');
    this.formulario.reset();
    this.formulario.enable();
    this.formulario.controls.senha.setValidators([Validators.required]);
    this.formulario.controls.senha.updateValueAndValidity();
    this.modoFormulario.set('criar');
  }

  abrirEdicao(gerente: GerenteListagem): void {
    if (this.processando()) return;
    this.mensagemErro.set('');
    this.mensagemSucesso.set('');
    this.cpfEmEdicao.set(gerente.cpf);
    this.formulario.reset({
      nome: gerente.nome,
      cpf: this.formatarCpf(gerente.cpf),
      email: gerente.email,
      telefone: this.formatarTelefoneValor(gerente.telefone),
      senha: ''
    });
    this.formulario.enable();
    this.formulario.controls.cpf.disable();
    this.formulario.controls.email.disable();
    this.formulario.controls.senha.clearValidators();
    this.formulario.controls.senha.updateValueAndValidity();
    this.modoFormulario.set('editar');
  }

  fecharFormulario(): void {
    this.modoFormulario.set('nenhum');
    this.formulario.reset();
    this.formulario.enable();
  }

  salvar(): void {
    if (this.processando()) return;
    this.mensagemErro.set('');
    this.mensagemSucesso.set('');
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    const dados = this.formulario.getRawValue();
    this.processando.set(true);
    const operacao = this.modoFormulario() === 'criar'
      ? this.gerenteService.inserir({ nome: dados.nome.trim(), cpf: dados.cpf.replace(/\D/g, ''), email: dados.email.trim().toLowerCase(), telefone: dados.telefone.replace(/\D/g, ''), senha: dados.senha })
      : this.gerenteService.atualizar(this.cpfEmEdicao(), { nome: dados.nome.trim(), telefone: dados.telefone.replace(/\D/g, '') });

    operacao.pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.processando.set(false))).subscribe({
      next: () => {
        this.mensagemSucesso.set(this.modoFormulario() === 'criar' ? 'Gerente inserido com sucesso.' : 'Gerente atualizado com sucesso.');
        this.fecharFormulario();
        this.carregarGerentes();
      },
      error: erro => this.mensagemErro.set(erro?.error?.mensagem || erro?.error?.message || erro?.message || 'Não foi possível concluir a operação.')
    });
  }

  formatarCpf(cpf: string): string {
    return cpf.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
  }

  formatarCpfInput(): void {
    const controle = this.formulario.controls.cpf;
    const digitos = controle.value.replace(/\D/g, '').slice(0, 11);
    controle.setValue(digitos.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2'));
  }

  formatarTelefone(): void {
    const controle = this.formulario.controls.telefone;
    const digitos = controle.value.replace(/\D/g, '').slice(0, 11);
    controle.setValue(this.formatarTelefoneValor(digitos));
  }

  private formatarTelefoneValor(telefone: string | null | undefined): string {
    const digitos = String(telefone ?? '').replace(/\D/g, '').slice(0, 11);
    return digitos.length > 10
      ? digitos.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
      : digitos.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  }

}
