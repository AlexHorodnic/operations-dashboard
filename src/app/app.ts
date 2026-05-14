import { Component, HostListener, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { VercelAnalyticsService } from './core/services/vercel-analytics.service';
import { CommandPalette } from './shared/ui/command-palette/command-palette';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, FormsModule, CommandPalette],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  private readonly router = inject(Router);
  private readonly analytics = inject(VercelAnalyticsService);
  protected readonly commandOpen = signal(false);
  protected readonly sidebarCollapsed = signal(false);
  protected readonly currentPath = signal(this.router.url);
  protected readonly navItems = [
    { route: '/overview', label: 'Overview', description: 'Operating snapshot', metric: '4 core KPIs' },
    { route: '/customers', label: 'Accounts', description: 'Account management workspace', metric: '12 matching accounts' },
    { route: '/tasks', label: 'Workflow queue', description: 'Operations coordination workspace', metric: '10 active items' },
    { route: '/analytics', label: 'Analytics', description: 'Revenue and conversion reporting', metric: '6 month trend' },
  ];
  protected readonly activePage = computed(() => {
    const active = this.navItems.find((item) => this.currentPath().startsWith(item.route));
    return active ?? this.navItems[0];
  });

  constructor() {
    this.analytics.initialize();
    this.router.events.pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd)).subscribe((event) => {
      this.currentPath.set(event.urlAfterRedirects);
    });
  }

  @HostListener('document:keydown', ['$event'])
  protected openCommandPalette(event: KeyboardEvent): void {
    const target = event.target as HTMLElement | null;
    const isTyping = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable;

    if (!isTyping && (event.key === '/' || (event.ctrlKey && event.key.toLowerCase() === 'k'))) {
      event.preventDefault();
      this.commandOpen.set(true);
    }

    if (event.key === 'Escape') {
      this.commandOpen.set(false);
    }
  }
}
