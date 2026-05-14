import { Injectable, inject } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { inject as injectVercelAnalytics, pageview } from '@vercel/analytics';
import { filter } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class VercelAnalyticsService {
  private readonly router = inject(Router);
  private initialized = false;

  initialize(): void {
    if (this.initialized || typeof window === 'undefined') {
      return;
    }

    injectVercelAnalytics({
      framework: 'angular',
      disableAutoTrack: true,
    });

    pageview({ path: window.location.pathname, route: window.location.pathname });
    this.router.events.pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd)).subscribe((event) => {
      pageview({ path: event.urlAfterRedirects, route: event.urlAfterRedirects });
    });

    this.initialized = true;
  }
}
