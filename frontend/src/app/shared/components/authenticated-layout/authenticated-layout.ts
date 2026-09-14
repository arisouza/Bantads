import { Component, Input } from '@angular/core';

import { SidebarComponent, SidebarItem } from '../sidebar/sidebar';

@Component({
  selector: 'app-authenticated-layout',
  standalone: true,
  imports: [SidebarComponent],
  templateUrl: './authenticated-layout.html',
  styleUrl: './authenticated-layout.css'
})
export class AuthenticatedLayoutComponent {
  @Input() menuItems: SidebarItem[] = [];
}
