import { Component } from '@angular/core';
import { AuthenticatedLayoutComponent } from '../../../shared/components/authenticated-layout/authenticated-layout';
import { GERENTE_MENU_ITEMS } from '../../../shared/config/menu-items';

@Component({
  imports: [AuthenticatedLayoutComponent],
  selector: 'app-gerentes',
  styleUrl: './gerentes.css',
  templateUrl: './gerentes.html',
})
export class Gerentes {
  readonly menuItems = GERENTE_MENU_ITEMS;
}
