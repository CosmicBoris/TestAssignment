import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { guestGuard } from './guards/guest.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/app', pathMatch: 'full' },
  { 
    path: 'signin', 
    loadComponent: () => import('./components/signin/signin.component').then(m => m.SigninComponent),
    canActivate: [guestGuard]
  },
  { 
    path: 'signup', 
    loadComponent: () => import('./components/signup/signup.component').then(m => m.SignupComponent),
    canActivate: [guestGuard]
  },
  { 
    path: 'app', 
    loadComponent: () => import('./components/dashboard/dashboard.component').then(m => m.DashboardComponent),
    canActivate: [authGuard]
  },
  { path: '**', redirectTo: '/app' }
];
