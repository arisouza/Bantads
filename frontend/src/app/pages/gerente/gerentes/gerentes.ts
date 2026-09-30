import { Component, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';

import { AuthenticatedLayoutComponent } from '../../../shared/components/authenticated-layout/authenticated-layout';
import { GERENTE_MENU_ITEMS } from '../../../shared/config/menu-items';

type GerenteResumo = {
  cpf: string;
  nome: string;
  email: string;
  ativo: boolean;
  totalClientes: number;
};

@Component({
  selector: 'app-gerentes',
  imports: [
    MatButtonModule,
    AuthenticatedLayoutComponent
  ],
  templateUrl: './gerentes.html',
  styleUrl: './gerentes.css'
})
export class Gerentes {
  readonly menuItems = GERENTE_MENU_ITEMS;

  readonly gerentes = signal<GerenteResumo[]>([]);
  readonly carregando = signal(false);
  readonly mensagemErro = signal('');

  ngOnInit(): void {
    this.carregarGerentes();
  }

  carregarGerentes(): void {
    if (this.carregando()) {
      return;
    }

    this.carregando.set(true);
    this.mensagemErro.set('');

    // Mock temporário até o backend da listagem real existir
    const dados: GerenteResumo[] = [
      {
        cpf: '12345678901',
        nome: 'Maria Souza',
        email: 'maria@bantads.com',
        ativo: true,
        totalClientes: 12
      },
      {
        cpf: '98765432109',
        nome: 'João Pereira',
        email: 'joao@bantads.com',
        ativo: true,
        totalClientes: 9
      },
      {
        cpf: '45678912345',
        nome: 'Ana Costa',
        email: 'ana@bantads.com',
        ativo: false,
        totalClientes: 3
      }
    ];

    setTimeout(() => {
      this.gerentes.set(dados);
      this.carregando.set(false);
    }, 300);
  }

  formatarCpf(cpf: string): string {
    return cpf.replace(
      /^(\d{3})(\d{3})(\d{3})(\d{2})$/,
      '$1.$2.$3-$4'
    );
  }
}