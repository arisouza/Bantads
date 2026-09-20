import { Component } from '@angular/core';
import { AuthenticatedLayoutComponent } from '../../../shared/components/authenticated-layout/authenticated-layout';
import { GERENTE_MENU_ITEMS } from '../../../shared/config/menu-items';

@Component({
  imports: [AuthenticatedLayoutComponent],
  selector: 'app-clientes',
  styleUrl: './clientes.css',
  templateUrl: './clientes.html',
})
export class Clientes {
  readonly menuItems = GERENTE_MENU_ITEMS;
}
