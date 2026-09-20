import { Component } from '@angular/core';
import { AuthenticatedLayoutComponent } from '../../../shared/components/authenticated-layout/authenticated-layout';
import { GERENTE_MENU_ITEMS } from '../../../shared/config/menu-items';

@Component({
  imports: [AuthenticatedLayoutComponent],
  selector: 'app-relatorio',
  styleUrl: './relatorio.css',
  templateUrl: './relatorio.html',
})
export class Relatorio {
  readonly menuItems = GERENTE_MENU_ITEMS;
}
