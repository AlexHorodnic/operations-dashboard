import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DashboardDataService } from '../../core/services/dashboard-data.service';
import { KpiCard } from '../../shared/kpi-card/kpi-card';
import { Activity, Kpi } from '../../models/dashboard.models';

@Component({
  selector: 'app-overview',
  imports: [KpiCard],
  templateUrl: './overview.html',
})
export class Overview {
  private readonly data = inject(DashboardDataService);
  private readonly destroyRef = inject(DestroyRef);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly kpis = signal<Kpi[]>([]);
  readonly activities = signal<Activity[]>([]);
  readonly revenueTrend = [
    { month: 'Jan', value: '$318K', height: 34 },
    { month: 'Feb', value: '$346K', height: 48 },
    { month: 'Mar', value: '$371K', height: 56 },
    { month: 'Apr', value: '$396K', height: 72 },
    { month: 'May', value: '$429K', height: 84 },
    { month: 'Jun', value: '$448K', height: 96 },
  ];

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(false);
    this.data.getOverview().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (overview) => {
        this.kpis.set(overview.kpis);
        this.activities.set(overview.activities);
        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }
}
