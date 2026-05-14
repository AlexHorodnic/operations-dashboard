import { Component, HostListener, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { ThemeService } from './core/services/theme.service';
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
  protected readonly theme = inject(ThemeService);
  protected readonly commandOpen = signal(false);
  protected readonly currentPath = signal(this.router.url);
  protected readonly navItems = [
    { route: '/overview', label: 'Overview' },
    { route: '/customers', label: 'Accounts' },
    { route: '/tasks', label: 'Workflow queue' },
    { route: '/analytics', label: 'Analytics' },
  ];
  protected readonly breadcrumbs = computed(() => {
    const active = this.navItems.find((item) => this.currentPath().startsWith(item.route));
    return active?.label ?? 'Overview';
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
