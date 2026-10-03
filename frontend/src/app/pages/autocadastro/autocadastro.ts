import { Component } from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators, AbstractControl, ValidationErrors
} from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { RouterLink } from '@angular/router';
import Decimal from 'decimal.js';

import {
  ClienteService,
  SolicitacaoAutocadastro
} from '../../shared/services/cliente';

@Component({
  selector: 'app-autocadastro',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule
  ],
  templateUrl: './autocadastro.html',
  styleUrl: './autocadastro.css'
})
export class Autocadastro {

  readonly estados = [
    'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF',
    'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA',
    'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS',
    'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
  ];

  enviando = false;
  mensagemSucesso = '';
  mensagemErro = '';

  readonly formulario;

  constructor(
    private formBuilder: FormBuilder,
    private clienteService: ClienteService,
    private http: HttpClient
  ) {
    this.formulario = this.formBuilder.nonNullable.group({
      nome: [
        '',
        [Validators.required, Validators.minLength(3), this.nomeValidator]
      ],

      email: [
        '',
        [Validators.required, Validators.email]
      ],

      cpf: [
        '',
        [Validators.required, this.cpfValidator]
      ],

      telefone: [
        '',
        [Validators.required, this.telefoneValidator]
      ],

      salario: [
        '',
        [
          Validators.required,
          this.salarioValidator
        ]
      ],

      logradouro: ['', [Validators.required, this.naoVazio]],
      numero: ['', [Validators.required, this.naoVazio, Validators.pattern(/^[\p{L}\d]+(?:[\s-][\p{L}\d]+)*$/u)]],
      complemento: [''],

      cep: [
        '', [Validators.required, this.cepValidator]
      ],

      cidade: ['', [Validators.required, this.naoVazio]],

      uf: [
        '',
        [
          Validators.required,
          Validators.pattern(/^[A-Z]{2}$/)
        ]
      ]
    });
  }

  private readonly naoVazio = (control: AbstractControl): ValidationErrors | null =>
    typeof control.value === 'string' && control.value.trim() === '' ? { blank: true } : null;

  private readonly nomeValidator = (control: AbstractControl): ValidationErrors | null =>
    /^[\p{L}]+(?:[\s'’-][\p{L}]+)*$/u.test(String(control.value).trim()) ? null : { nome: true };

  private readonly cpfValidator = (control: AbstractControl): ValidationErrors | null => {
    const cpf = String(control.value).replace(/\D/g, '');
    if (!/^\d{11}$/.test(cpf) || /^(\d)\1{10}$/.test(cpf)) return { cpf: true };
    const calc = (length: number) => { let sum = 0; for (let i = 0; i < length; i++) sum += +cpf[i] * (length + 1 - i); const d = (sum * 10) % 11; return d === 10 ? 0 : d; };
    return calc(9) === +cpf[9] && calc(10) === +cpf[10] ? null : { cpf: true };
  };

  private readonly salarioValidator = (control: AbstractControl): ValidationErrors | null => {
    const value = Number(String(control.value).replace(',', '.'));
    return Number.isFinite(value) && value >= 0.01 ? null : { salario: true };
  };

  private readonly telefoneValidator = (control: AbstractControl): ValidationErrors | null => {
    const digits = String(control.value).replace(/\D/g, '');
    return /^\d{10,11}$/.test(digits) ? null : { telefone: true };
  };

  private readonly cepValidator = (control: AbstractControl): ValidationErrors | null => {
    const digits = String(control.value).replace(/\D/g, '');
    return /^\d{8}$/.test(digits) ? null : { cep: true };
  };

  private ultimoCep = '';
  private cepEmConsulta = false;

  solicitarCadastro(): void {
    if (this.enviando) return;
    this.mensagemSucesso = '';
    this.mensagemErro = '';

    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    const dados = this.formulario.getRawValue();

    const solicitacao: SolicitacaoAutocadastro = {
      ...dados,
      cpf: dados.cpf.replace(/\D/g, ''),
      telefone: dados.telefone.replace(/\D/g, ''),
      cep: dados.cep.replace(/\D/g, ''),

      nome: dados.nome.trim(),

      email: dados.email
        .trim()
        .toLowerCase(),

      salario: new Decimal(
        dados.salario.replace(',', '.')
      ).toFixed(2),

      logradouro: dados.logradouro.trim(),
      numero: dados.numero.trim(),
      complemento: dados.complemento.trim(),
      cidade: dados.cidade.trim(),
      uf: dados.uf.toUpperCase()
    };

    this.enviando = true;
    this.formulario.disable();

    this.clienteService
      .solicitarAutocadastro(solicitacao)
      .subscribe({
        next: (resposta) => {
          this.mensagemSucesso =
            resposta.mensagem ??
            'Solicitação enviada com sucesso! Aguarde a análise de um gerente.';

          this.formulario.reset();
        },

        error: (erro) => {
          if (erro.status === 409) {
            this.mensagemErro =
              erro.error?.message ??
              erro.error?.mensagem ??
              'CPF ou e-mail já cadastrado.';
          } else {
            this.mensagemErro =
              'Não foi possível enviar a solicitação. Tente novamente.';
          }

          this.finalizarEnvio();
        },

        complete: () => {
          this.finalizarEnvio();
        }
      });
  }

  formatarCpf(): void { const c = this.formulario.controls.cpf; const d = c.value.replace(/\D/g, '').slice(0, 11); c.setValue(d.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2')); }
  formatarTelefone(): void { const c = this.formulario.controls.telefone; const d = c.value.replace(/\D/g, '').slice(0, 11); c.setValue(d.length > 10 ? d.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3') : d.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')); }
  formatarCep(): void {
    const c = this.formulario.controls.cep; const d = c.value.replace(/\D/g, '').slice(0, 8); c.setValue(d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d);
    if (d.length < 8) this.ultimoCep = '';
    if (d.length !== 8 || d === this.ultimoCep || this.cepEmConsulta) return;
    this.ultimoCep = d; this.cepEmConsulta = true;
    this.http.get<{ erro?: boolean; logradouro?: string; localidade?: string; uf?: string }>(`https://viacep.com.br/ws/${d}/json/`).subscribe({ next: a => { if (a.erro) { this.mensagemErro = 'CEP não encontrado. Preencha o endereço manualmente.'; return; } this.formulario.patchValue({ logradouro: a.logradouro ?? '', cidade: a.localidade ?? '', uf: a.uf ?? '' }); this.mensagemErro = ''; }, error: () => { this.mensagemErro = 'Não foi possível consultar o CEP. Preencha o endereço manualmente.'; }, complete: () => { this.cepEmConsulta = false; } });
  }

  private finalizarEnvio(): void {
    this.enviando = false;
    this.formulario.enable();
  }
}
