import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { DashboardDataService } from '../../core/services/dashboard-data.service';
import { AnalyticsPoint } from '../../models/dashboard.models';

@Component({
  selector: 'app-analytics',
  imports: [FormsModule],
  templateUrl: './analytics.html',
})
export class Analytics {
  private readonly data = inject(DashboardDataService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(true);
  private readonly sourcePoints = signal<AnalyticsPoint[]>([]);
  readonly range = signal('Last 6 months');
  readonly ranges = ['Last 30 days', 'Last 90 days', 'Last 6 months'];
  private readonly shortRangeSeries: Record<'Last 30 days' | 'Last 90 days', AnalyticsPoint[]> = {
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
  readonly points = computed(() => {
    const range = this.range();
    return range === 'Last 6 months' ? this.sourcePoints() : this.shortRangeSeries[range as 'Last 30 days' | 'Last 90 days'];
  });
  readonly maxRevenue = computed(() => Math.max(...this.points().map((point) => point.revenue), 1));
  readonly latest = computed(() => this.points().at(-1));
  readonly previous = computed(() => this.points().at(-2));
  readonly revenuePointGain = computed(() => {
    const points = this.points();
    return points.length ? points.at(-1)!.revenue - points[0].revenue : 0;
  });
  readonly targetMonths = computed(() => this.points().filter((point) => point.revenue >= 100).length);
  readonly chartPoints = computed(() =>
    this.points().map((point, index, points) => ({
      ...point,
      delta: index === 0 ? 'Baseline month' : `${point.revenue - points[index - 1].revenue > 0 ? '+' : ''}${point.revenue - points[index - 1].revenue} vs prior month`,
      isLatest: index === points.length - 1,
    })),
  );

  readonly insights = computed(() => {
    const latest = this.latest();
    const previous = this.previous();
    if (!latest || !previous) {
      return [];
    }

    return [
      `Revenue index increased ${latest.revenue - previous.revenue} points month over month.`,
      `Trial conversion is ${latest.conversion}% with workload at ${latest.workload}%.`,
      'Enterprise accounts remain the largest expansion segment this period.',
    ];
  });

  constructor() {
    this.data.getAnalytics().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((points) => {
      this.sourcePoints.set(points);
      this.loading.set(false);
    });
  }
}
