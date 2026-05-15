import { Component, HostListener, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { BarChart3, Bell, ChevronLeft, ChevronRight, CircleAlert, CircleCheck, Clock, LayoutDashboard, ListTodo, LucideAngularModule, Search, UsersRound, X } from 'lucide-angular';
import { filter } from 'rxjs';
import { VercelAnalyticsService } from './core/services/vercel-analytics.service';
import { CommandPalette } from './shared/ui/command-palette/command-palette';

interface AppNotification {
  id: number;
  title: string;
  detail: string;
  time: string;
  tone: string;
  read: boolean;
}

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, FormsModule, LucideAngularModule, CommandPalette],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  private readonly router = inject(Router);
  private readonly analytics = inject(VercelAnalyticsService);
  protected readonly commandOpen = signal(false);
  protected readonly notificationsOpen = signal(false);
  private readonly notificationsKey = 'operations-dashboard-notifications';
  private readonly sidebarCollapsedKey = 'operations-dashboard-sidebar-collapsed';
  protected readonly sidebarCollapsed = signal(this.readSidebarCollapsed());
  protected readonly mobileTopbarHidden = signal(false);
  protected readonly Bell = Bell;
  protected readonly ChevronLeft = ChevronLeft;
  protected readonly ChevronRight = ChevronRight;
  protected readonly Search = Search;
  protected readonly CircleAlert = CircleAlert;
  protected readonly CircleCheck = CircleCheck;
  protected readonly Clock = Clock;
  protected readonly LayoutDashboard = LayoutDashboard;
  protected readonly UsersRound = UsersRound;
  protected readonly ListTodo = ListTodo;
  protected readonly BarChart3 = BarChart3;
  protected readonly X = X;
  protected readonly notifications = signal<AppNotification[]>(this.readNotifications() ?? [
    {
      id: 1,
      title: 'Billing sync blocked',
      detail: 'Atlas Retail needs finance approval before the workflow can continue.',
      time: '18m ago',
      tone: 'danger',
      read: false,
    },
    {
      id: 2,
      title: 'Security review due today',
      detail: 'Apex Energy has a pending security questionnaire in the workflow queue.',
      time: '1h ago',
      tone: 'warning',
      read: false,
    },
    {
      id: 3,
      title: 'Workspace migration completed',
      detail: 'Verdant HQ migration was closed and moved to Done.',
      time: '2h ago',
      tone: 'success',
      read: true,
    },
  ]);
  protected readonly unreadNotifications = computed(() => this.notifications().filter((notification) => !notification.read).length);
  protected readonly currentPath = signal(this.router.url);
  protected readonly navItems = [
    { route: '/overview', label: 'Overview', description: 'Operating snapshot', metric: '4 core KPIs', icon: this.LayoutDashboard },
    { route: '/customers', label: 'Accounts', description: 'Account management workspace', metric: '12 matching accounts', icon: this.UsersRound },
    { route: '/tasks', label: 'Workflow queue', description: 'Operations coordination workspace', metric: '10 active items', icon: this.ListTodo },
    { route: '/analytics', label: 'Analytics', description: 'Revenue and conversion reporting', metric: '6 month trend', icon: this.BarChart3 },
  ];
  protected readonly activePage = computed(() => {
    const active = this.navItems.find((item) => this.currentPath().startsWith(item.route));
    return active ?? this.navItems[0];
  });
  private lastScrollY = 0;

  protected notificationIcon(tone: string) {
    if (tone === 'danger') {
      return this.CircleAlert;
    }
    if (tone === 'success') {
      return this.CircleCheck;
    }
    return this.Clock;
  }

  protected toggleNotifications(): void {
    this.notificationsOpen.update((open) => !open);
  }

  protected markNotificationRead(id: number): void {
    this.notifications.update((notifications) =>
      notifications.map((notification) => (notification.id === id ? { ...notification, read: true } : notification)),
    );
    this.writeNotifications();
  }

  protected markAllNotificationsRead(): void {
    this.notifications.update((notifications) => notifications.map((notification) => ({ ...notification, read: true })));
    this.writeNotifications();
  }

  constructor() {
    this.analytics.initialize();
    this.router.events.pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd)).subscribe((event) => {
      this.currentPath.set(event.urlAfterRedirects);
    });
  }

  protected toggleSidebar(): void {
    this.sidebarCollapsed.update((collapsed) => !collapsed);
    try {
      localStorage.setItem(this.sidebarCollapsedKey, JSON.stringify(this.sidebarCollapsed()));
    } catch {
      // Persistence is best-effort for local mock data.
    }
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
      this.notificationsOpen.set(false);
    }
  }

  @HostListener('document:click', ['$event'])
  protected closeCommandPaletteOnOutsideClick(event: MouseEvent): void {
    const target = event.target as HTMLElement | null;

    if (this.commandOpen() && !target?.closest('.topbar__search')) {
      this.commandOpen.set(false);
    }

    if (this.notificationsOpen() && !target?.closest('.notification-menu')) {
      this.notificationsOpen.set(false);
    }
  }

  private readNotifications(): AppNotification[] | null {
    try {
      const raw = localStorage.getItem(this.notificationsKey);
      const parsed = raw ? JSON.parse(raw) : null;
      return Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }

  private writeNotifications(): void {
    try {
      localStorage.setItem(this.notificationsKey, JSON.stringify(this.notifications()));
    } catch {
      // Persistence is best-effort for local mock data.
    }
  }

  private readSidebarCollapsed(): boolean {
    try {
      return JSON.parse(localStorage.getItem(this.sidebarCollapsedKey) ?? 'false') === true;
    } catch {
      return false;
    }
  }

  @HostListener('window:scroll')
  protected updateMobileTopbarVisibility(): void {
    if (window.innerWidth > 720) {
      this.mobileTopbarHidden.set(false);
      this.lastScrollY = window.scrollY;
      return;
    }

    const currentScrollY = window.scrollY;
    const delta = currentScrollY - this.lastScrollY;

    if (currentScrollY < 24) {
      this.mobileTopbarHidden.set(false);
    } else if (delta > 8) {
      this.mobileTopbarHidden.set(true);
    } else if (delta < -8) {
      this.mobileTopbarHidden.set(false);
    }

    this.lastScrollY = currentScrollY;
  }
}
