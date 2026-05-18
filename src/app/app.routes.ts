import { Routes } from '@angular/router';
import { Analytics } from './features/analytics/analytics';
import { Accounts } from './features/accounts/accounts';
import { Overview } from './features/overview/overview';
import { Workflow } from './features/workflow/workflow';

export const routes: Routes = [
  { path: 'overview', component: Overview, title: 'Overview' },
  { path: 'accounts', component: Accounts, title: 'Accounts' },
  { path: 'workflow', component: Workflow, title: 'Workflow Queue' },
  { path: 'analytics', component: Analytics, title: 'Analytics' },
  { path: 'customers', redirectTo: 'accounts', pathMatch: 'full' },
  { path: 'tasks', redirectTo: 'workflow', pathMatch: 'full' },
  { path: '', pathMatch: 'full', redirectTo: 'overview' },
  { path: '**', redirectTo: 'overview' },
];
