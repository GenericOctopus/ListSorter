import { Routes } from '@angular/router';
import { publicOnlyGuard, connectivityGuard } from './guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./components/login/login.component').then(m => m.LoginComponent),
    canActivate: [publicOnlyGuard, connectivityGuard],
  },
  {
    path: 'register',
    loadComponent: () => import('./components/register/register.component').then(m => m.RegisterComponent),
    canActivate: [publicOnlyGuard, connectivityGuard],
  },
  {
    path: 'forgot-password',
    loadComponent: () => import('./components/forgot-password/forgot-password.component').then(m => m.ForgotPasswordComponent),
    canActivate: [publicOnlyGuard, connectivityGuard],
  },
  {
    path: 'reset-password',
    loadComponent: () => import('./components/reset-password/reset-password.component').then(m => m.ResetPasswordComponent),
  },
  {
    path: '',
    loadComponent: () => import('./components/list-sorter/list-sorter.component').then(m => m.ListSorterComponent),
  },
  {
    path: '**',
    redirectTo: '',
  },
];
