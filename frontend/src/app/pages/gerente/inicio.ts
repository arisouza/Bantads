
import { Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { AuthenticatedLayoutComponent } from '../../shared/components/authenticated-layout/authenticated-layout';
import { GERENTE_MENU_ITEMS } from '../../shared/config/menu-items';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-inicio-gerente',
  standalone: true,
  imports: [
    AuthenticatedLayoutComponent,
    MatIconModule,
    RouterLink
  ],
  templateUrl: './inicio.html',
  styleUrl: './inicio.css'
})
export class InicioGerente {
  readonly menuItems = GERENTE_MENU_ITEMS;
}
