import { Component, input } from '@angular/core';
import { Kpi } from '../../models/dashboard.models';

@Component({
  selector: 'app-kpi-card',
  template: `
    <article class="kpi-card">
      <p>{{ kpi().label }}</p>
      <div class="kpi-card__value">{{ kpi().value }}</div>
      <div class="kpi-card__footer">
        <span [class]="kpi().trendDirection === 'up' ? 'trend trend--up' : 'trend trend--down'">
          {{ kpi().trendDirection === 'up' ? 'Up' : 'Down' }} {{ kpi().trend }}
        </span>
        <span>{{ kpi().detail }}</span>
      </div>
    </article>
  `,
})
export class KpiCard {
  readonly kpi = input.required<Kpi>();
}
