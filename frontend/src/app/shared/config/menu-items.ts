import { SidebarItem } from '../components/sidebar/sidebar';

export const CLIENTE_MENU_ITEMS: SidebarItem[] = [
  { label: 'Início', route: '/cliente', icon: 'home' },
  { label: 'Depósito', route: '/cliente/deposito', icon: 'add_circle' },
  { label: 'Saque', route: '/cliente/saque', icon: 'remove_circle' },
  { label: 'Transferência', route: '/cliente/transferencia', icon: 'swap_horiz' },
  { label: 'Extrato', route: '/cliente/extrato', icon: 'receipt_long' }
];

export const GERENTE_MENU_ITEMS: SidebarItem[] = [
  { label: 'Início', route: '/gerente', icon: 'home' },
  { label: 'Clientes', route: '/gerente/clientes', icon: 'people' },
  { label: 'Gerentes', route: '/gerente/gerentes', icon: 'manage_accounts' },
  { label: 'Relatórios', route: '/gerente/relatorios', icon: 'assessment' }
];
