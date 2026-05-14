import { Injectable } from '@angular/core';
import { Observable, delay, of, throwError } from 'rxjs';
import { analytics, customers, kpis, recentActivities, tasks } from '../../data/mock-dashboard-data';
import { Activity, AnalyticsPoint, Customer, Kpi, OperationTask } from '../../models/dashboard.models';

@Injectable({ providedIn: 'root' })
export class DashboardDataService {
  private readonly ownerOverridesKey = 'operations-dashboard-owner-overrides';
  private readonly customCustomersKey = 'operations-dashboard-custom-customers';

  getOverview(): Observable<{ kpis: Kpi[]; activities: Activity[] }> {
    return this.withLatency({ kpis, activities: recentActivities }, 360);
  }

  getCustomers(shouldFail = false): Observable<Customer[]> {
    if (shouldFail) {
      return throwError(() => new Error('Account data unavailable')).pipe(delay(420));
    }

    return this.withLatency(this.getStoredCustomers(), 420);
  }

  updateCustomerOwners(customerIds: readonly number[], owner: string): Customer[] {
    const overrides = this.readOwnerOverrides();

    for (const customerId of customerIds) {
      overrides[customerId] = owner;
    }

    this.writeOwnerOverrides(overrides);
    return this.getStoredCustomers();
  }

  addCustomer(customer: Customer): Customer[] {
    const customCustomers = this.readCustomCustomers();
    this.writeCustomCustomers([...customCustomers, customer]);
    return this.getStoredCustomers();
  }

  getTasks(): Observable<OperationTask[]> {
    return this.withLatency(tasks, 340);
  }

  getAnalytics(): Observable<AnalyticsPoint[]> {
    return this.withLatency(analytics, 380);
  }

  private withLatency<T>(payload: T, ms: number): Observable<T> {
    return of(payload).pipe(delay(ms));
  }

  private getStoredCustomers(): Customer[] {
    return this.applyOwnerOverrides([...customers, ...this.readCustomCustomers()]);
  }

  private applyOwnerOverrides(source: readonly Customer[]): Customer[] {
    const overrides = this.readOwnerOverrides();
    return source.map((customer) => {
      const owner = overrides[customer.id];
      return owner ? { ...customer, owner } : { ...customer };
    });
  }

  private readOwnerOverrides(): Record<number, string> {
    try {
      const raw = localStorage.getItem(this.ownerOverridesKey);
      const parsed = raw ? JSON.parse(raw) : {};
      return this.isOwnerOverrideRecord(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }

  private writeOwnerOverrides(overrides: Record<number, string>): void {
    try {
      localStorage.setItem(this.ownerOverridesKey, JSON.stringify(overrides));
    } catch {
      // Persistence is best-effort for local mock data.
    }
  }

  private readCustomCustomers(): Customer[] {
    try {
      const raw = localStorage.getItem(this.customCustomersKey);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed.filter((customer): customer is Customer => this.isCustomer(customer)) : [];
    } catch {
      return [];
    }
  }

  private writeCustomCustomers(customCustomers: readonly Customer[]): void {
    try {
      localStorage.setItem(this.customCustomersKey, JSON.stringify(customCustomers));
    } catch {
      // Persistence is best-effort for local mock data.
    }
  }

  private isOwnerOverrideRecord(value: unknown): value is Record<number, string> {
    return (
      typeof value === 'object' &&
      value !== null &&
      Object.values(value).every((owner) => typeof owner === 'string')
    );
  }

  private isCustomer(value: unknown): value is Customer {
    return (
      typeof value === 'object' &&
      value !== null &&
      typeof (value as Customer).id === 'number' &&
      typeof (value as Customer).name === 'string' &&
      typeof (value as Customer).email === 'string' &&
      typeof (value as Customer).company === 'string'
    );
  }
}
