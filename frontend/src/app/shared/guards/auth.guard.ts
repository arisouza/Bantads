import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService, UserTipo } from '../services/auth';

export const authGuard: CanActivateFn = (route) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isLoggedIn()) {
    return router.createUrlTree(['/login']);
  }

  const allowedRoles = route.data?.['roles'] as UserTipo[] | undefined;
  if (!allowedRoles || allowedRoles.length === 0) {
    return true;
  }

  const userTipo = authService.getTipo();
  if (userTipo && allowedRoles.includes(userTipo)) {
    return true;
  }

  return router.createUrlTree([authService.getHomeRouteByTipo()]);
};
