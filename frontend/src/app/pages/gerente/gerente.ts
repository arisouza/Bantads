import { Component } from '@angular/core';
import { AuthenticatedLayoutComponent } from '../../shared/components/authenticated-layout/authenticated-layout';
import { GERENTE_MENU_ITEMS } from '../../shared/config/menu-items';

@Component({
  imports: [AuthenticatedLayoutComponent],
  selector: 'app-gerente',
  styleUrl: './gerente.css',
  templateUrl: './gerente.html',
})
export class Gerente {
  readonly menuItems = GERENTE_MENU_ITEMS;
}
