import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { CircleAlert, LucideAngularModule } from 'lucide-angular';
import { DashboardDataService } from '../../core/services/dashboard-data.service';
import { AnalyticsPoint } from '../../core/models/dashboard.models';
import { EmptyState } from '../../shared/components/empty-state/empty-state';

type AnalyticsRange = 'Last 30 days' | 'Last 90 days' | 'Last 6 months';

interface RevenueMixItem {
  label: string;
  value: number;
}

@Component({
  selector: 'app-analytics',
  imports: [FormsModule, EmptyState, LucideAngularModule],
  templateUrl: './analytics.html',
  styleUrl: './analytics.scss',
})
export class Analytics {
  readonly CircleAlert = CircleAlert;
  private readonly data = inject(DashboardDataService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(true);
  readonly error = signal(false);
  private readonly sourcePoints = signal<AnalyticsPoint[]>([]);
  readonly range = signal<AnalyticsRange>('Last 6 months');
  readonly ranges: readonly AnalyticsRange[] = ['Last 30 days', 'Last 90 days', 'Last 6 months'];
  private readonly shortRangeSeries: Record<Exclude<AnalyticsRange, 'Last 6 months'>, AnalyticsPoint[]> = {
    'Last 30 days': [
      { label: 'Wk 1', revenue: 96, conversion: 79.4, workload: 66 },
      { label: 'Wk 2', revenue: 94, conversion: 77.8, workload: 71 },
      { label: 'Wk 3', revenue: 99, conversion: 80.2, workload: 73 },
      { label: 'Wk 4', revenue: 101, conversion: 81.0, workload: 69 },
    ],
    'Last 90 days': [
      { label: 'Apr', revenue: 96, conversion: 79.3, workload: 64 },
      { label: 'May', revenue: 94, conversion: 77.6, workload: 72 },
      { label: 'Jun', revenue: 101, conversion: 81.0, workload: 69 },
    ],
  };
  private readonly revenueMixByRange: Record<AnalyticsRange, RevenueMixItem[]> = {
    'Last 30 days': [
      { label: 'Enterprise', value: 61 },
      { label: 'Growth', value: 31 },
      { label: 'Starter', value: 8 },
    ],
    'Last 90 days': [
      { label: 'Enterprise', value: 62 },
      { label: 'Growth', value: 29 },
      { label: 'Starter', value: 9 },
    ],
    'Last 6 months': [
      { label: 'Enterprise', value: 63 },
      { label: 'Growth', value: 28 },
      { label: 'Starter', value: 9 },
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
      delta: index === 0 ? 'Baseline month' : `${point.revenue - points[index - 1].revenue > 0 ? '+' : ''}${point.revenue - points[index - 1].revenue} vs previous month`,
      isLatest: index === points.length - 1,
    })),
  );
  readonly chartPath = computed(() => this.buildChartPath(this.points().map((point) => point.revenue)));
  readonly chartSummary = computed(() => {
    const first = this.first();
    const latest = this.latest();
    if (!first || !latest) {
      return 'No expansion attainment data available for the selected range.';
    }
    return `Expansion attainment moved from ${first.revenue} to ${latest.revenue}, a net change of ${this.revenuePointGain()} points across ${this.points().length} periods.`;
  });

  readonly insights = computed(() => {
    const latest = this.latest();
    const previous = this.previous();
    if (!latest || !previous) {
      return [];
    }

    return [
      `Expansion attainment changed ${latest.revenue - previous.revenue} points versus the previous month.`,
      `On-time activation is ${latest.conversion}% while queue load sits at ${latest.workload}%.`,
      latest.workload >= 69
        ? 'Implementation load remains elevated after delayed handoffs and reopened migration work.'
        : 'Queue load has eased, but blocked approvals still need follow-up.',
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
