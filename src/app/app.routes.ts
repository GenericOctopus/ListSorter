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
    path: '',
    loadComponent: () => import('./components/list-sorter/list-sorter.component').then(m => m.ListSorterComponent),
  },
  {
    path: '**',
    redirectTo: '',
  },
];
