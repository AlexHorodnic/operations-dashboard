import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DashboardDataService } from '../../core/services/dashboard-data.service';
import { KpiCard } from '../../shared/kpi-card/kpi-card';
import { Activity, Kpi } from '../../models/dashboard.models';
import { exportCsv } from '../../shared/utils/csv-export';

interface RevenueTrendPoint {
  month: string;
  revenue: number;
  value: string;
  height: number;
}

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
  readonly exportMessage = signal('');
  readonly revenueTrend: RevenueTrendPoint[] = [
    { month: 'Jan', revenue: 318000, value: '$318K', height: 34 },
    { month: 'Feb', revenue: 346000, value: '$346K', height: 48 },
    { month: 'Mar', revenue: 371000, value: '$371K', height: 56 },
    { month: 'Apr', revenue: 396000, value: '$396K', height: 72 },
    { month: 'May', revenue: 429000, value: '$429K', height: 84 },
    { month: 'Jun', revenue: 448000, value: '$448K', height: 96 },
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

  exportRevenueMomentum(): void {
    exportCsv('revenue-momentum.csv', this.revenueTrend, [
      { header: 'Month', value: (point) => point.month },
      { header: 'Revenue', value: (point) => point.revenue },
    ]);
    this.exportMessage.set('CSV exported');
    window.setTimeout(() => this.exportMessage.set(''), 2400);
  }
}
