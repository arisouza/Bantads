import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth';

@Component({
  imports: [],
  selector: 'app-navbar',
  styleUrl: './navbar.css',
  templateUrl: './navbar.html',
})
export class Navbar {
  constructor(public authService: AuthService, private router: Router) {}

  mostrarNavbar(): boolean {
    return this.authService.isLoggedIn() && this.router.url.split("?")[0] !== "/login";
  }

  sair(): void {
    this.authService.logout().subscribe({
      next: () => void this.router.navigate(['/login']),
      error: () => void this.router.navigate(['/login'])
    });
  }
}
