import { CommonModule } from '@angular/common';
import { Component, DestroyRef, computed, inject, isDevMode, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { DashboardDataService } from '../../core/services/dashboard-data.service';
import {
  CUSTOMER_OWNERS,
  CUSTOMER_PLANS,
  CUSTOMER_REGIONS,
  CUSTOMER_STATUSES,
  Customer,
  CustomerPlan,
  CustomerStatus,
} from '../../models/dashboard.models';
import { Badge } from '../../shared/badge/badge';
import { EmptyState } from '../../shared/empty-state/empty-state';
import { Drawer } from '../../shared/ui/drawer/drawer';
import { exportCsv } from '../../shared/utils/csv-export';

type SortKey = 'name' | 'company' | 'plan' | 'status' | 'revenue' | 'lastActivity' | 'healthScore';
type SortDirection = 'asc' | 'desc';

interface AccountDraft {
  name: string;
  email: string;
  company: string;
  plan: CustomerPlan;
  status: CustomerStatus;
  revenue: number;
  owner: string;
  region: string;
  phone: string;
  seats: number;
  healthScore: number;
  renewalDate: string;
  notes: string;
}

@Component({
  selector: 'app-customers',
  imports: [CommonModule, FormsModule, Badge, EmptyState, Drawer],
  templateUrl: './customers.html',
  styleUrl: './customers.scss',
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
  readonly exportMessage = signal('');
  readonly assignmentOpen = signal(false);
  readonly selectedOwner = signal('Avery');
  readonly addAccountOpen = signal(false);
  readonly accountDraft = signal<AccountDraft>(this.createAccountDraft());
  readonly accountDraftError = signal('');

  readonly showDemoControls = isDevMode();
  readonly statuses: readonly (CustomerStatus | 'All')[] = ['All', ...CUSTOMER_STATUSES];
  readonly plans: readonly (CustomerPlan | 'All')[] = ['All', ...CUSTOMER_PLANS];
  readonly ownerOptions = CUSTOMER_OWNERS;
  readonly regionOptions = CUSTOMER_REGIONS;
  readonly sortOptions: readonly { key: SortKey; label: string }[] = [
    { key: 'lastActivity', label: 'Last activity' },
    { key: 'name', label: 'Contact' },
    { key: 'company', label: 'Company' },
    { key: 'plan', label: 'Plan' },
    { key: 'status', label: 'Status' },
    { key: 'healthScore', label: 'Health' },
    { key: 'revenue', label: 'Revenue' },
  ];

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
  readonly somePageSelected = computed(() => {
    const pageRows = this.pagedCustomers();
    const selectedOnPage = pageRows.filter((customer) => this.selectedIds().has(customer.id)).length;
    return selectedOnPage > 0 && selectedOnPage < pageRows.length;
  });
  readonly hasActiveFilters = computed(() => !!this.search().trim() || this.status() !== 'All' || this.plan() !== 'All');

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

    return this.sortDirection() === 'asc' ? '?' : '?';
  }

  ariaSort(key: SortKey): 'ascending' | 'descending' | null {
    if (this.sortKey() !== key) {
      return null;
    }

    return this.sortDirection() === 'asc' ? 'ascending' : 'descending';
  }

  updateSearch(value: string): void {
    this.search.set(value);
    this.resetFilteredView();
  }

  updateStatus(value: CustomerStatus | 'All'): void {
    this.status.set(value);
    this.resetFilteredView();
  }

  updatePlan(value: CustomerPlan | 'All'): void {
    this.plan.set(value);
    this.resetFilteredView();
  }

  clearFilters(): void {
    this.search.set('');
    this.status.set('All');
    this.plan.set('All');
    this.resetFilteredView();
  }

  updateSort(key: SortKey): void {
    this.setSort(key);
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
    this.assignmentOpen.set(false);
  }

  openAssignment(): void {
    this.assignmentOpen.set(true);
  }

  assignOwner(): void {
    const selectedIds = this.selectedIds();
    const owner = this.selectedOwner();

    if (!selectedIds.size) {
      return;
    }

    this.customers.set(this.data.updateCustomerOwners([...selectedIds], owner));
    this.exportMessage.set(`${selectedIds.size} account${selectedIds.size === 1 ? '' : 's'} assigned to ${owner}`);
    this.assignmentOpen.set(false);
    window.setTimeout(() => this.exportMessage.set(''), 2400);
  }

  exportAccounts(): void {
    const selectedIds = this.selectedIds();
    const rows = selectedIds.size
      ? this.filteredCustomers().filter((customer) => selectedIds.has(customer.id))
      : this.filteredCustomers();

    exportCsv('accounts.csv', rows, [
      { header: 'Name', value: (customer) => customer.name },
      { header: 'Email', value: (customer) => customer.email },
      { header: 'Company', value: (customer) => customer.company },
      { header: 'Plan', value: (customer) => customer.plan },
      { header: 'Status', value: (customer) => customer.status },
      { header: 'HealthScore', value: (customer) => customer.healthScore },
      { header: 'Revenue', value: (customer) => customer.revenue },
      { header: 'Owner', value: (customer) => customer.owner },
      { header: 'Region', value: (customer) => customer.region },
      { header: 'LastActivity', value: (customer) => customer.lastActivity },
      { header: 'RenewalDate', value: (customer) => customer.renewalDate },
    ]);

    this.exportMessage.set(selectedIds.size ? 'Selected accounts exported' : 'Accounts exported');
    window.setTimeout(() => this.exportMessage.set(''), 2400);
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

  openAddAccount(): void {
    this.accountDraft.set(this.createAccountDraft());
    this.accountDraftError.set('');
    this.addAccountOpen.set(true);
  }

  closeAddAccount(): void {
    this.addAccountOpen.set(false);
    this.accountDraftError.set('');
  }

  updateAccountDraft(key: keyof AccountDraft, value: string | number): void {
    this.accountDraft.update((draft) => ({ ...draft, [key]: value }));
  }

  createAccount(): void {
    const draft = this.accountDraft();
    if (!draft.name.trim() || !draft.email.trim() || !draft.company.trim()) {
      this.accountDraftError.set('Name, email, and company are required.');
      return;
    }

    const today = new Date().toISOString().slice(0, 10);
    const customer: Customer = {
      id: this.nextCustomerId(),
      name: draft.name.trim(),
      email: draft.email.trim(),
      company: draft.company.trim(),
      plan: draft.plan,
      status: draft.status,
      revenue: Number(draft.revenue) || 0,
      lastActivity: today,
      phone: draft.phone.trim() || 'Not provided',
      owner: draft.owner,
      region: draft.region,
      seats: Number(draft.seats) || 1,
      createdAt: today,
      renewalDate: draft.renewalDate || today,
      healthScore: Math.max(0, Math.min(100, Number(draft.healthScore) || 75)),
      notes: draft.notes.trim() || 'New account created from the account directory.',
      recentActivity: ['Account created manually', `Owner assigned to ${draft.owner}`],
    };

    this.customers.set(this.data.addCustomer(customer));
    this.error.set(false);
    this.exportMessage.set(`${customer.company} added`);
    this.addAccountOpen.set(false);
    this.clearFilters();
    window.setTimeout(() => this.exportMessage.set(''), 2400);
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

  private nextCustomerId(): number {
    return Math.max(...this.customers().map((customer) => customer.id), 0) + 1;
  }

  private resetFilteredView(): void {
    this.page.set(1);
    this.clearSelection();
  }

  private createAccountDraft(): AccountDraft {
    return {
      name: '',
      email: '',
      company: '',
      plan: 'Growth',
      status: 'Active',
      revenue: 0,
      owner: 'Avery',
      region: 'North America',
      phone: '',
      seats: 10,
      healthScore: 75,
      renewalDate: '2026-12-31',
      notes: '',
    };
  }
}
