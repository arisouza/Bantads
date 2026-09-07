import { Component } from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
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
    private clienteService: ClienteService
  ) {
    this.formulario = this.formBuilder.nonNullable.group({
      nome: [
        '',
        [Validators.required, Validators.minLength(3)]
      ],

      email: [
        '',
        [Validators.required, Validators.email]
      ],

      cpf: [
        '',
        [Validators.required, Validators.pattern(/^\d{11}$/)]
      ],

      telefone: [
        '',
        [Validators.required, Validators.pattern(/^\d{10,11}$/)]
      ],

      salario: [
        '',
        [
          Validators.required,
          Validators.pattern(/^\d+(?:[.,]\d{1,2})?$/)
        ]
      ],

      logradouro: ['', Validators.required],
      numero: ['', Validators.required],
      complemento: [''],

      cep: [
        '',
        [Validators.required, Validators.pattern(/^\d{8}$/)]
      ],

      cidade: ['', Validators.required],

      uf: [
        '',
        [
          Validators.required,
          Validators.pattern(/^[A-Z]{2}$/)
        ]
      ]
    });
  }

  solicitarCadastro(): void {
    this.mensagemSucesso = '';
    this.mensagemErro = '';

    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    const dados = this.formulario.getRawValue();

    const solicitacao: SolicitacaoAutocadastro = {
      ...dados,

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

  private finalizarEnvio(): void {
    this.enviando = false;
    this.formulario.enable();
  }
}