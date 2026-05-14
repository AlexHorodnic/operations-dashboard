import { Routes } from '@angular/router';
import { Analytics } from './features/analytics/analytics';
import { Customers } from './features/customers/customers';
import { Overview } from './features/overview/overview';
import { Tasks } from './features/tasks/tasks';

export const routes: Routes = [
  { path: 'overview', component: Overview, title: 'Overview' },
  { path: 'customers', component: Customers, title: 'Accounts' },
  { path: 'tasks', component: Tasks, title: 'Workflow Queue' },
  { path: 'analytics', component: Analytics, title: 'Analytics' },
  { path: '', pathMatch: 'full', redirectTo: 'overview' },
  { path: '**', redirectTo: 'overview' },
];
