import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { DashboardDataService } from '../../core/services/dashboard-data.service';
import { analytics } from '../../mock-data/mock-dashboard-data';
import { Analytics } from './analytics';

class FakeDashboardDataService {
  getAnalytics() {
    return of(analytics.map((point) => ({ ...point })));
  }
}

describe('Analytics', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Analytics],
      providers: [{ provide: DashboardDataService, useClass: FakeDashboardDataService }],
    }).compileComponents();
  });

  it('derives six-month performance metrics from loaded data', () => {
    const fixture = TestBed.createComponent(Analytics);
    const component = fixture.componentInstance;

    expect(component.points()).toHaveLength(6);
    expect(component.latest()?.label).toBe('Jun');
    expect(component.revenuePointGain()).toBe(13);
    expect(component.targetPeriods()).toBe(2);
    expect(component.chartSummary()).toContain('net change of 13 points');
  });

  it('recomputes metrics and insight data when the range changes', () => {
    const fixture = TestBed.createComponent(Analytics);
    const component = fixture.componentInstance;

    component.range.set('Last 30 days');

    expect(component.points()).toHaveLength(4);
    expect(component.revenuePointGain()).toBe(5);
    expect(component.conversionDelta()).toBe(0.8);
    expect(component.targetPeriods()).toBe(1);
    expect(component.revenueMix().find((item) => item.label === 'Enterprise')?.value).toBe(61);
  });
});
