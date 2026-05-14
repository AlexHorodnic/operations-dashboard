import { CommonModule } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { DashboardDataService } from '../../core/services/dashboard-data.service';
import { Customer, CustomerPlan, CustomerStatus } from '../../models/dashboard.models';
import { Badge } from '../../shared/badge/badge';
import { EmptyState } from '../../shared/empty-state/empty-state';
import { Drawer } from '../../shared/ui/drawer/drawer';

type SortKey = 'name' | 'company' | 'plan' | 'status' | 'revenue' | 'lastActivity' | 'healthScore';
type SortDirection = 'asc' | 'desc';

@Component({
  selector: 'app-customers',
  imports: [CommonModule, FormsModule, Badge, EmptyState, Drawer],
  templateUrl: './customers.html',
})
export class Customers {
  private readonly data = inject(DashboardDataService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(true);
  readonly error = signal(false);
  readonly customers = signal<Customer[]>([]);
  readonly search = signal('');
  readonly status = signal<CustomerStatus | 'All'>('All');
  readonly plan = signal<CustomerPlan | 'All'>('All');
  readonly sortKey = signal<SortKey>('lastActivity');
  readonly sortDirection = signal<SortDirection>('desc');
  readonly selectedIds = signal<Set<number>>(new Set());
  readonly page = signal(1);
  readonly pageSize = 6;
  readonly selectedCustomer = signal<Customer | null>(null);

  readonly statuses: (CustomerStatus | 'All')[] = ['All', 'Active', 'At risk', 'Paused'];
  readonly plans: (CustomerPlan | 'All')[] = ['All', 'Starter', 'Growth', 'Enterprise'];

  readonly filteredCustomers = computed(() => {
    const query = this.search().trim().toLowerCase();
    const selectedStatus = this.status();
    const selectedPlan = this.plan();

    return [...this.customers()]
      .filter((customer) => {
        const matchesQuery =
          customer.name.toLowerCase().includes(query) ||
          customer.email.toLowerCase().includes(query) ||
          customer.company.toLowerCase().includes(query) ||
          customer.owner.toLowerCase().includes(query);
        const matchesStatus = selectedStatus === 'All' || customer.status === selectedStatus;
        const matchesPlan = selectedPlan === 'All' || customer.plan === selectedPlan;
        return matchesQuery && matchesStatus && matchesPlan;
      })
      .sort((a, b) => this.compareCustomers(a, b));
  });

  readonly pageCount = computed(() => Math.max(1, Math.ceil(this.filteredCustomers().length / this.pageSize)));
  readonly pagedCustomers = computed(() => {
    const start = (Math.min(this.page(), this.pageCount()) - 1) * this.pageSize;
    return this.filteredCustomers().slice(start, start + this.pageSize);
  });
  readonly selectedCount = computed(() => this.selectedIds().size);
  readonly allPageSelected = computed(() => {
    const pageRows = this.pagedCustomers();
    return pageRows.length > 0 && pageRows.every((customer) => this.selectedIds().has(customer.id));
  });

  constructor() {
    this.load();
  }

  load(shouldFail = false): void {
    this.loading.set(true);
    this.error.set(false);
    this.data.getCustomers(shouldFail).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (customers) => {
        this.customers.set(customers);
        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }

  setSort(key: SortKey): void {
    if (this.sortKey() === key) {
      this.sortDirection.update((direction) => (direction === 'asc' ? 'desc' : 'asc'));
      return;
    }

    this.sortKey.set(key);
    this.sortDirection.set('asc');
  }

  sortIndicator(key: SortKey): string {
    if (this.sortKey() !== key) {
      return '';
    }

    return this.sortDirection() === 'asc' ? '↑' : '↓';
  }

  updateSearch(value: string): void {
    this.search.set(value);
    this.page.set(1);
  }

  updateStatus(value: CustomerStatus | 'All'): void {
    this.status.set(value);
    this.page.set(1);
  }

  updatePlan(value: CustomerPlan | 'All'): void {
    this.plan.set(value);
    this.page.set(1);
  }

  toggleCustomer(customerId: number, checked: boolean): void {
    const next = new Set(this.selectedIds());
    checked ? next.add(customerId) : next.delete(customerId);
    this.selectedIds.set(next);
  }

  togglePage(checked: boolean): void {
    const next = new Set(this.selectedIds());
    for (const customer of this.pagedCustomers()) {
      checked ? next.add(customer.id) : next.delete(customer.id);
    }
    this.selectedIds.set(next);
  }

  clearSelection(): void {
    this.selectedIds.set(new Set());
  }

  nextPage(): void {
    this.page.update((page) => Math.min(page + 1, this.pageCount()));
  }

  previousPage(): void {
    this.page.update((page) => Math.max(page - 1, 1));
  }

  openCustomer(customer: Customer): void {
    this.selectedCustomer.set(customer);
  }

  statusTone(status: CustomerStatus): 'success' | 'warning' | 'neutral' {
    if (status === 'Active') {
      return 'success';
    }
    if (status === 'At risk') {
      return 'warning';
    }
    return 'neutral';
  }

  private compareCustomers(a: Customer, b: Customer): number {
    const key = this.sortKey();
    const modifier = this.sortDirection() === 'asc' ? 1 : -1;
    const left = a[key];
    const right = b[key];

    if (typeof left === 'number' && typeof right === 'number') {
      return (left - right) * modifier;
    }

    return String(left).localeCompare(String(right)) * modifier;
  }
}
