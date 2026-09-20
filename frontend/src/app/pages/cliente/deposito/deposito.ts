import { Component, OnInit } from '@angular/core';
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

@Component({
  imports: [AuthenticatedLayoutComponent, ReactiveFormsModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatIconModule, RouterLink],
  selector: 'app-deposito',
  styleUrl: './deposito.css',
  templateUrl: './deposito.html',
})
export class Deposito implements OnInit {
  conta: Conta | null = null;
  carregando = true;
  mensagemErro = '';
  readonly formatarMoeda = formatarMoeda;
  readonly menuItems = CLIENTE_MENU_ITEMS;
  readonly formulario;

  constructor(private formBuilder: FormBuilder, private authService: AuthService, private contaService: ContaService) {
    this.formulario = this.formBuilder.nonNullable.group({
      valor: ['', [Validators.required, Validators.pattern(/^\d+(?:[.,]\d{1,2})?$/)]]
    });
  }

  ngOnInit(): void {
    const usuario = this.authService.getUsuario();
    if (!usuario?.cpf) { this.mensagemErro = 'Não foi possível identificar o cliente.'; this.carregando = false; return; }
    this.contaService.buscarPorCpf(usuario.cpf).subscribe({
      next: conta => { this.conta = conta; this.carregando = false; },
      error: () => { this.mensagemErro = 'Não foi possível carregar os dados da conta.'; this.carregando = false; }
    });
  }
}
