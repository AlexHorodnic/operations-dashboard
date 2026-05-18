export type TrendDirection = 'up' | 'down';

export interface Kpi {
  label: string;
  value: string;
  trend: string;
  trendDirection: TrendDirection;
  detail: string;
}

export type CustomerStatus = 'Active' | 'At risk' | 'Paused';
export type CustomerPlan = 'Starter' | 'Growth' | 'Enterprise';
export const CUSTOMER_STATUSES: readonly CustomerStatus[] = ['Active', 'At risk', 'Paused'];
export const CUSTOMER_PLANS: readonly CustomerPlan[] = ['Starter', 'Growth', 'Enterprise'];
export const CUSTOMER_OWNERS = ['Avery', 'Mina', 'Sam', 'Iris', 'Leo'] as const;
export const CUSTOMER_REGIONS = ['North America', 'EMEA', 'APAC', 'LATAM'] as const;

export interface Customer {
  id: number;
  name: string;
  email: string;
  company: string;
  plan: CustomerPlan;
  status: CustomerStatus;
  revenue: number;
  lastActivity: string;
  phone: string;
  owner: string;
  region: string;
  seats: number;
  createdAt: string;
  renewalDate: string;
  healthScore: number;
  notes: string;
  recentActivity: string[];
}

export type TaskStatus = 'Queued' | 'In progress' | 'Blocked' | 'Done';
export type TaskPriority = 'Low' | 'Medium' | 'High' | 'Critical';

export interface OperationTask {
  id: number;
  title: string;
  owner: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string;
  customer: string;
  type: 'Onboarding' | 'Incident' | 'Renewal' | 'Risk' | 'Migration';
}

export interface Activity {
  id: number;
  title: string;
  detail: string;
  time: string;
  tone: 'success' | 'warning' | 'info';
}

export interface AnalyticsPoint {
  label: string;
  revenue: number;
  conversion: number;
  workload: number;
}
