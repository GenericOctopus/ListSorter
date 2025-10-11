import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = async (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated) {
    router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
    return false;
  }

  // Verify token is still valid
  const isValid = await authService.verifyToken();
  if (!isValid) {
    router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
    return false;
  }

  return true;
};

export const publicOnlyGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated) {
    router.navigate(['/']);
    return false;
  }

  return true;
};
