import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
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
  growth: string;
  change: string;
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
  readonly revenueRange = signal<'Monthly' | 'Quarterly' | 'Yearly'>('Monthly');
  private readonly revenueSeries: Record<'Monthly' | 'Quarterly' | 'Yearly', RevenueTrendPoint[]> = {
    Monthly: [
      { month: 'Jan', revenue: 318000, value: '$318K', height: 34, growth: '+0%', change: 'Baseline month' },
      { month: 'Feb', revenue: 346000, value: '$346K', height: 48, growth: '+8.8%', change: '+$28K vs Jan' },
      { month: 'Mar', revenue: 371000, value: '$371K', height: 56, growth: '+7.2%', change: '+$25K vs Feb' },
      { month: 'Apr', revenue: 396000, value: '$396K', height: 72, growth: '+6.7%', change: '+$25K vs Mar' },
      { month: 'May', revenue: 429000, value: '$429K', height: 84, growth: '+8.3%', change: '+$33K vs Apr' },
      { month: 'Jun', revenue: 448000, value: '$448K', height: 96, growth: '+4.4%', change: '+$19K vs May' },
    ],
    Quarterly: [
      { month: 'Q1 25', revenue: 286000, value: '$286K', height: 24, growth: '+0%', change: 'Baseline quarter' },
      { month: 'Q2 25', revenue: 314000, value: '$314K', height: 32, growth: '+9.8%', change: '+$28K vs Q1' },
      { month: 'Q3 25', revenue: 352000, value: '$352K', height: 50, growth: '+12.1%', change: '+$38K vs Q2' },
      { month: 'Q4 25', revenue: 381000, value: '$381K', height: 62, growth: '+8.2%', change: '+$29K vs Q3' },
      { month: 'Q1 26', revenue: 405000, value: '$405K', height: 76, growth: '+6.3%', change: '+$24K vs Q4' },
      { month: 'Q2 26', revenue: 448000, value: '$448K', height: 96, growth: '+10.6%', change: '+$43K vs Q1' },
    ],
    Yearly: [
      { month: '2021', revenue: 198000, value: '$198K', height: 18, growth: '+0%', change: 'Baseline year' },
      { month: '2022', revenue: 236000, value: '$236K', height: 28, growth: '+19.2%', change: '+$38K vs 2021' },
      { month: '2023', revenue: 284000, value: '$284K', height: 42, growth: '+20.3%', change: '+$48K vs 2022' },
      { month: '2024', revenue: 333000, value: '$333K', height: 58, growth: '+17.3%', change: '+$49K vs 2023' },
      { month: '2025', revenue: 389000, value: '$389K', height: 74, growth: '+16.8%', change: '+$56K vs 2024' },
      { month: '2026', revenue: 448000, value: '$448K', height: 96, growth: '+15.2%', change: '+$59K vs 2025' },
    ],
  };
  readonly revenueTrend = computed(() => this.revenueSeries[this.revenueRange()]);
  readonly latestRevenue = computed(() => this.revenueTrend().at(-1)!);
  readonly bestRevenue = computed(() => this.revenueTrend().reduce((best, point) => (point.revenue > best.revenue ? point : best)));
  readonly revenueGrowth = computed(() => {
    const first = this.revenueTrend()[0].revenue;
    const latest = this.latestRevenue().revenue;
    return `+${Math.round(((latest - first) / first) * 100)}% over period`;
  });
  readonly revenueTarget = '$425K target';

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
    const range = this.revenueRange().toLowerCase();

    exportCsv(`revenue-momentum-${range}.csv`, this.revenueTrend(), [
      { header: this.revenueRange() === 'Monthly' ? 'Month' : this.revenueRange() === 'Quarterly' ? 'Quarter' : 'Year', value: (point) => point.month },
      { header: 'Revenue', value: (point) => point.revenue },
    ]);
    this.exportMessage.set('CSV exported');
    window.setTimeout(() => this.exportMessage.set(''), 2400);
  }
}
