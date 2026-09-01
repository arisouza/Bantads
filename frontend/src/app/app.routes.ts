import { Routes } from '@angular/router';
import { authGuard } from './shared/guards/auth.guard';

// Autenticação / público
import { Login } from './pages/login/login';
import { Autocadastro } from './pages/autocadastro/autocadastro';

// Cliente 
import { Cliente } from './pages/cliente/cliente';
import { Deposito } from './pages/cliente/deposito/deposito';
import { Saque } from './pages/cliente/saque/saque';
import { Transferencia } from './pages/cliente/transferencia/transferencia';
import { Extrato } from './pages/cliente/extrato/extrato';

// Gerente
import { Gerente } from './pages/gerente/gerente';
import { Clientes } from './pages/gerente/clientes/clientes';
import { Gerentes } from './pages/gerente/gerentes/gerentes';
import { Relatorio } from './pages/gerente/relatorio/relatorio';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: Login },
  { path: 'autocadastro', component: Autocadastro },

  // Rotas do cliente
  { path: 'cliente', component: Cliente, canActivate: [authGuard], data: { roles: ['CLIENTE'] } }, // tela inicial com saldo (R3)
  { path: 'cliente/deposito', component: Deposito, canActivate: [authGuard], data: { roles: ['CLIENTE'] } }, // R4
  { path: 'cliente/saque', component: Saque, canActivate: [authGuard], data: { roles: ['CLIENTE'] } }, // R5
  { path: 'cliente/transferencia', component: Transferencia, canActivate: [authGuard], data: { roles: ['CLIENTE'] } }, // R6
  { path: 'cliente/extrato', component: Extrato, canActivate: [authGuard], data: { roles: ['CLIENTE'] } }, // R7
   
  // Rotas do gerente
  { path: 'gerente', component: Gerente, canActivate: [authGuard], data: { roles: ['GERENTE'] } }, // tela inicial / solicitações (R8, R9, R10)
  { path: 'gerente/clientes', component: Clientes, canActivate: [authGuard], data: { roles: ['GERENTE'] } }, // consultar todos (R11)
  { path: 'gerente/gerentes', component: Gerentes, canActivate: [authGuard], data: { roles: ['GERENTE'] } }, // CRUD gerentes (R12, R13, R14, R15)
  { path: 'gerente/relatorios', component: Relatorio, canActivate: [authGuard], data: { roles: ['GERENTE'] } }, // relatório de clientes (R16)

  { path: '**', redirectTo: 'login' }
];
