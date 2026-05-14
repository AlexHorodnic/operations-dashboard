import { Injectable } from '@angular/core';
import { Observable, delay, of, throwError } from 'rxjs';
import { analytics, customers, kpis, recentActivities, tasks } from '../../data/mock-dashboard-data';
import { Activity, AnalyticsPoint, Customer, Kpi, OperationTask } from '../../models/dashboard.models';

@Injectable({ providedIn: 'root' })
export class DashboardDataService {
  getOverview(): Observable<{ kpis: Kpi[]; activities: Activity[] }> {
    return this.withLatency({ kpis, activities: recentActivities }, 360);
  }

  getCustomers(shouldFail = false): Observable<Customer[]> {
    if (shouldFail) {
      return throwError(() => new Error('Account data unavailable')).pipe(delay(420));
    }

    return this.withLatency(customers, 420);
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
}
