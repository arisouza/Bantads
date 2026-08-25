import { Routes } from '@angular/router';

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
  { path: 'cliente', component: Cliente }, // tela inicial com saldo (R3)
  { path: 'cliente/deposito', component: Deposito }, // R4
  { path: 'cliente/saque', component: Saque }, // R5
  { path: 'cliente/transferencia', component: Transferencia }, // R6
  { path: 'cliente/extrato', component: Extrato }, // R7
   
  // Rotas do gerente
  { path: 'gerente', component: Gerente }, // tela inicial / solicitações (R8, R9, R10)
  { path: 'gerente/clientes', component: Clientes }, // consultar todos (R11)
  { path: 'gerente/gerentes', component: Gerentes }, // CRUD gerentes (R12, R13, R14, R15)
  { path: 'gerente/relatorios', component: Relatorio }, // relatório de clientes (R16)

  { path: '**', redirectTo: 'login' }
];