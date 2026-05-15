import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DashboardDataService } from '../../core/services/dashboard-data.service';
import { KpiCard } from '../../shared/kpi-card/kpi-card';
import { EmptyState } from '../../shared/empty-state/empty-state';
import { Activity, Kpi } from '../../models/dashboard.models';
import { exportCsv } from '../../shared/utils/csv-export';
import { Download, LucideAngularModule } from 'lucide-angular';

type RevenueRange = 'Monthly' | 'Quarterly' | 'Yearly';

interface RevenueTrendPoint {
  label: string;
  revenue: number;
}

interface ChartPoint extends RevenueTrendPoint {
  value: string;
  height: number;
  growth: string;
  change: string;
  isLatest: boolean;
  isBest: boolean;
}

@Component({
  selector: 'app-overview',
  imports: [KpiCard, EmptyState, LucideAngularModule],
  templateUrl: './overview.html',
  styleUrl: './overview.scss',
})
export class Overview {
  private readonly data = inject(DashboardDataService);
  private readonly destroyRef = inject(DestroyRef);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly kpis = signal<Kpi[]>([]);
  readonly activities = signal<Activity[]>([]);
  readonly exportMessage = signal('');
  readonly revenueRange = signal<RevenueRange>('Monthly');
  readonly ranges: readonly RevenueRange[] = ['Monthly', 'Quarterly', 'Yearly'];
  readonly Download = Download;
  readonly updatedAt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date());
  readonly revenueTarget = 425000;
  private readonly revenueSeries: Record<RevenueRange, RevenueTrendPoint[]> = {
    Monthly: [
      { label: 'Jan', revenue: 318000 },
      { label: 'Feb', revenue: 346000 },
      { label: 'Mar', revenue: 371000 },
      { label: 'Apr', revenue: 396000 },
      { label: 'May', revenue: 429000 },
      { label: 'Jun', revenue: 448000 },
    ],
    Quarterly: [
      { label: 'Q1 25', revenue: 286000 },
      { label: 'Q2 25', revenue: 314000 },
      { label: 'Q3 25', revenue: 352000 },
      { label: 'Q4 25', revenue: 381000 },
      { label: 'Q1 26', revenue: 405000 },
      { label: 'Q2 26', revenue: 448000 },
    ],
    Yearly: [
      { label: '2021', revenue: 198000 },
      { label: '2022', revenue: 236000 },
      { label: '2023', revenue: 284000 },
      { label: '2024', revenue: 333000 },
      { label: '2025', revenue: 389000 },
      { label: '2026', revenue: 448000 },
    ],
  };

  readonly revenueTrend = computed(() => this.revenueSeries[this.revenueRange()]);
  readonly hasOverviewData = computed(() => this.kpis().length > 0 || this.activities().length > 0);
  readonly latestRevenue = computed(() => this.revenueTrend().at(-1)!);
  readonly firstRevenue = computed(() => this.revenueTrend()[0]);
  readonly maxRevenue = computed(() => Math.max(...this.revenueTrend().map((point) => point.revenue), this.revenueTarget));
  readonly minRevenue = computed(() => Math.min(...this.revenueTrend().map((point) => point.revenue)));
  readonly chartPoints = computed<ChartPoint[]>(() => {
    const points = this.revenueTrend();
    const bestRevenue = Math.max(...points.map((point) => point.revenue));
    const max = this.maxRevenue();
    const min = this.minRevenue();
    const span = Math.max(max - min, 1);

    return points.map((point, index) => {
      const previous = points[index - 1];
      const growth = previous ? ((point.revenue - previous.revenue) / previous.revenue) * 100 : 0;
      const delta = previous ? point.revenue - previous.revenue : 0;
      return {
        ...point,
        value: this.formatCurrency(point.revenue),
        height: ((point.revenue - min) / span) * 82 + 14,
        growth: previous ? `${growth >= 0 ? '+' : ''}${growth.toFixed(1)}%` : '+0%',
        change: previous ? `${delta >= 0 ? '+' : '-'}${this.formatCurrency(Math.abs(delta))} vs ${previous.label}` : `Baseline ${this.periodNoun()}`,
        isLatest: index === points.length - 1,
        isBest: point.revenue === bestRevenue,
      };
    });
  });
  readonly revenueGrowth = computed(() => {
    const first = this.firstRevenue().revenue;
    const latest = this.latestRevenue().revenue;
    return `+${Math.round(((latest - first) / first) * 100)}% over period`;
  });
  readonly targetLineTop = computed(() => 100 - ((this.revenueTarget - this.minRevenue()) / Math.max(this.maxRevenue() - this.minRevenue(), 1)) * 100);
  readonly chartPath = computed(() => this.buildChartPath(this.chartPoints().map((point) => point.height)));
  readonly axisLabels = computed(() => {
    const max = this.maxRevenue();
    const min = this.minRevenue();
    const middle = Math.round((max + min) / 2 / 1000) * 1000;
    return [this.formatCurrency(max), this.formatCurrency(middle), this.formatCurrency(min)];
  });
  readonly chartSummary = computed(() => {
    const first = this.firstRevenue();
    const latest = this.latestRevenue();
    return `${this.rangeLabel()} revenue increased from ${this.formatCurrency(first.revenue)} to ${this.formatCurrency(latest.revenue)}, ${this.revenueGrowth()}.`;
  });
  readonly revenueInsight = computed(() => {
    const latest = this.latestRevenue();
    const first = this.firstRevenue();
    const crossedTarget = this.revenueTrend().find((point) => point.revenue >= this.revenueTarget);
    const targetCopy = crossedTarget ? `crossed the ${this.formatCurrency(this.revenueTarget)} target in ${crossedTarget.label}` : `remains below the ${this.formatCurrency(this.revenueTarget)} target`;
    return `${this.rangeLabel()} revenue ${targetCopy} and reached ${this.formatCurrency(latest.revenue)}, up ${this.formatCurrency(latest.revenue - first.revenue)} from the start of the period.`;
  });

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
      { header: this.periodLabel(), value: (point) => point.label },
      { header: 'Revenue', value: (point) => point.revenue },
    ]);
    this.exportMessage.set('CSV exported');
    window.setTimeout(() => this.exportMessage.set(''), 2400);
  }

  periodLabel(): string {
    if (this.revenueRange() === 'Monthly') return 'Month';
    if (this.revenueRange() === 'Quarterly') return 'Quarter';
    return 'Year';
  }

  rangeLabel(): string {
    if (this.revenueRange() === 'Monthly') return 'Monthly';
    if (this.revenueRange() === 'Quarterly') return 'Quarterly';
    return 'Yearly';
  }

  private periodNoun(): string {
    return this.periodLabel().toLowerCase();
  }

  private formatCurrency(value: number): string {
    return `$${Math.round(value / 1000)}K`;
  }

  private buildChartPath(values: readonly number[]): string {
    const width = 600;
    const height = 160;
    const paddingX = 20;
    const paddingY = 8;
    const points = values.map((value, index) => {
      const x = values.length === 1 ? width / 2 : paddingX + ((width - paddingX * 2) * index) / (values.length - 1);
      const y = height - paddingY - (value / 100) * (height - paddingY * 2);
      return `${x.toFixed(1)} ${y.toFixed(1)}`;
    });
    return `M ${points.join(' L ')}`;
  }
}
