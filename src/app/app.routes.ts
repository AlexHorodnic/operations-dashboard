import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'overview',
    loadComponent: () => import('./features/overview/overview').then((module) => module.Overview),
    title: 'Overview',
  },
  {
    path: 'accounts',
    loadComponent: () => import('./features/accounts/accounts').then((module) => module.Accounts),
    title: 'Accounts',
  },
  {
    path: 'workflow',
    loadComponent: () => import('./features/workflow/workflow').then((module) => module.Workflow),
    title: 'Workflow Queue',
  },
  {
    path: 'analytics',
    loadComponent: () =>
      import('./features/analytics/analytics').then((module) => module.Analytics),
    title: 'Analytics',
  },
  { path: 'customers', redirectTo: 'accounts', pathMatch: 'full' },
  { path: 'tasks', redirectTo: 'workflow', pathMatch: 'full' },
  { path: '', pathMatch: 'full', redirectTo: 'overview' },
  { path: '**', redirectTo: 'overview' },
];
