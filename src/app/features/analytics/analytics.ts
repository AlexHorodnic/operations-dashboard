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
  readonly points = signal<AnalyticsPoint[]>([]);
  readonly range = signal('Last 6 months');
  readonly ranges = ['Last 30 days', 'Last 90 days', 'Last 6 months'];
  readonly maxRevenue = computed(() => Math.max(...this.points().map((point) => point.revenue), 1));
  readonly latest = computed(() => this.points().at(-1));
  readonly previous = computed(() => this.points().at(-2));

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
      this.points.set(points);
      this.loading.set(false);
    });
  }
}
