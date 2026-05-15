import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { DashboardDataService } from '../../core/services/dashboard-data.service';
import { AnalyticsPoint } from '../../models/dashboard.models';
import { EmptyState } from '../../shared/empty-state/empty-state';

type AnalyticsRange = 'Last 30 days' | 'Last 90 days' | 'Last 6 months';

interface RevenueMixItem {
  label: string;
  value: number;
}

@Component({
  selector: 'app-analytics',
  imports: [FormsModule, EmptyState],
  templateUrl: './analytics.html',
  styleUrl: './analytics.scss',
})
export class Analytics {
  private readonly data = inject(DashboardDataService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(true);
  readonly error = signal(false);
  private readonly sourcePoints = signal<AnalyticsPoint[]>([]);
  readonly range = signal<AnalyticsRange>('Last 6 months');
  readonly ranges: readonly AnalyticsRange[] = ['Last 30 days', 'Last 90 days', 'Last 6 months'];
  private readonly shortRangeSeries: Record<Exclude<AnalyticsRange, 'Last 6 months'>, AnalyticsPoint[]> = {
    'Last 30 days': [
      { label: 'Wk 1', revenue: 91, conversion: 7.1, workload: 53 },
      { label: 'Wk 2', revenue: 95, conversion: 7.4, workload: 55 },
      { label: 'Wk 3', revenue: 100, conversion: 7.8, workload: 58 },
      { label: 'Wk 4', revenue: 104, conversion: 8.2, workload: 61 },
    ],
    'Last 90 days': [
      { label: 'Apr', revenue: 86, conversion: 6.6, workload: 49 },
      { label: 'May', revenue: 96, conversion: 7.8, workload: 57 },
      { label: 'Jun', revenue: 104, conversion: 8.2, workload: 61 },
    ],
  };
  private readonly revenueMixByRange: Record<AnalyticsRange, RevenueMixItem[]> = {
    'Last 30 days': [
      { label: 'Enterprise', value: 64 },
      { label: 'Growth', value: 27 },
      { label: 'Starter', value: 9 },
    ],
    'Last 90 days': [
      { label: 'Enterprise', value: 63 },
      { label: 'Growth', value: 27 },
      { label: 'Starter', value: 10 },
    ],
    'Last 6 months': [
      { label: 'Enterprise', value: 62 },
      { label: 'Growth', value: 28 },
      { label: 'Starter', value: 10 },
    ],
  };

  readonly points = computed<AnalyticsPoint[]>(() => {
    const range = this.range();
    return range === 'Last 6 months' ? this.sourcePoints() : this.shortRangeSeries[range];
  });
  readonly hasData = computed(() => this.points().length > 0);
  readonly targetRevenueIndex = 100;
  readonly maxRevenue = computed(() => Math.max(...this.points().map((point) => point.revenue), this.targetRevenueIndex, 1));
  readonly latest = computed(() => this.points().at(-1));
  readonly previous = computed(() => this.points().at(-2));
  readonly first = computed(() => this.points().at(0));
  readonly revenuePointGain = computed(() => {
    const first = this.first();
    const latest = this.latest();
    return first && latest ? latest.revenue - first.revenue : 0;
  });
  readonly revenueGrowthRate = computed(() => {
    const first = this.first();
    const latest = this.latest();
    return first && latest ? Math.round(((latest.revenue - first.revenue) / first.revenue) * 100) : 0;
  });
  readonly targetPeriods = computed(() => this.points().filter((point) => point.revenue >= this.targetRevenueIndex).length);
  readonly targetLineTop = computed(() => 100 - (this.targetRevenueIndex / this.maxRevenue()) * 100);
  readonly targetZoneHeight = computed(() => (this.targetRevenueIndex / this.maxRevenue()) * 100);
  readonly conversionDelta = computed(() => {
    const latest = this.latest();
    const previous = this.previous();
    return latest && previous ? +(latest.conversion - previous.conversion).toFixed(1) : 0;
  });
  readonly workloadDelta = computed(() => {
    const latest = this.latest();
    const previous = this.previous();
    return latest && previous ? latest.workload - previous.workload : 0;
  });
  readonly revenueMix = computed(() => this.revenueMixByRange[this.range()]);
  readonly chartPoints = computed(() =>
    this.points().map((point, index, points) => ({
      ...point,
      delta: index === 0 ? 'Baseline period' : `${point.revenue - points[index - 1].revenue > 0 ? '+' : ''}${point.revenue - points[index - 1].revenue} vs prior period`,
      isLatest: index === points.length - 1,
    })),
  );
  readonly chartPath = computed(() => this.buildChartPath(this.points().map((point) => point.revenue)));
  readonly chartSummary = computed(() => {
    const first = this.first();
    const latest = this.latest();
    if (!first || !latest) {
      return 'No revenue data available for the selected range.';
    }
    return `Revenue index rose from ${first.revenue} to ${latest.revenue}, a gain of ${this.revenuePointGain()} points across ${this.points().length} periods.`;
  });

  readonly insights = computed(() => {
    const latest = this.latest();
    const previous = this.previous();
    if (!latest || !previous) {
      return [];
    }

    return [
      `Revenue index increased ${latest.revenue - previous.revenue} points versus the prior period.`,
      `Trial conversion is ${latest.conversion}% with workload at ${latest.workload}%.`,
      'Enterprise accounts remain the largest expansion segment this period.',
    ];
  });

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(false);
    this.data.getAnalytics().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (points) => {
        this.sourcePoints.set(points);
        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }

  private buildChartPath(values: readonly number[]): string {
    if (!values.length) {
      return '';
    }

    const width = 600;
    const height = 180;
    const paddingX = 20;
    const paddingY = 18;
    const max = Math.max(...values, 1);
    const min = Math.min(...values, 0);
    const span = Math.max(max - min, 1);
    const points = values.map((value, index) => {
      const x = values.length === 1 ? width / 2 : paddingX + ((width - paddingX * 2) * index) / (values.length - 1);
      const y = height - paddingY - ((value - min) / span) * (height - paddingY * 2);
      return `${x.toFixed(1)} ${y.toFixed(1)}`;
    });

    return `M ${points.join(' L ')}`;
  }
}
