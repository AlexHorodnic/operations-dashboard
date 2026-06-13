import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { Customer } from '../../core/models/dashboard.models';
import { DashboardDataService } from '../../core/services/dashboard-data.service';
import { customers } from '../../mock-data/mock-dashboard-data';
import { Accounts } from './accounts';

class FakeDashboardDataService {
  getCustomers(shouldFail = false) {
    return shouldFail
      ? throwError(() => new Error('Account data unavailable'))
      : of(customers.map((customer) => ({ ...customer })));
  }

  updateCustomerOwners(customerIds: readonly number[], owner: string): Customer[] {
    return customers.map((customer) =>
      customerIds.includes(customer.id) ? { ...customer, owner } : { ...customer },
    );
  }

  addCustomer(customer: Customer): Customer[] {
    return [...customers.map((item) => ({ ...item })), customer];
  }
}

describe('Accounts', () => {
  beforeEach(async () => {
    Object.defineProperty(window, 'scrollTo', {
      value: () => undefined,
      configurable: true,
    });

    await TestBed.configureTestingModule({
      imports: [Accounts],
      providers: [{ provide: DashboardDataService, useClass: FakeDashboardDataService }],
    }).compileComponents();
  });

  it('combines search, status, and plan filters', () => {
    const fixture = TestBed.createComponent(Accounts);
    const component = fixture.componentInstance;

    component.updateSearch('atlas');
    expect(component.filteredCustomers().map((customer) => customer.company)).toEqual([
      'Atlas Retail',
    ]);

    component.updateSearch('');
    component.updateStatus('At risk');
    component.updatePlan('Enterprise');

    expect(component.filteredCustomers().map((customer) => customer.company)).toEqual([
      'Atlas Retail',
      'Apex Energy',
    ]);
  });

  it('sorts numeric columns and toggles sort direction', () => {
    const fixture = TestBed.createComponent(Accounts);
    const component = fixture.componentInstance;

    component.setSort('revenue');
    expect(component.filteredCustomers().at(0)?.company).toBe('Brightpath Labs');
    expect(component.ariaSort('revenue')).toBe('ascending');

    component.setSort('revenue');
    expect(component.filteredCustomers().at(0)?.company).toBe('Verdant HQ');
    expect(component.ariaSort('revenue')).toBe('descending');
  });

  it('selects only the current page and clears selection when filters change', () => {
    const fixture = TestBed.createComponent(Accounts);
    const component = fixture.componentInstance;

    component.togglePage(true);
    expect(component.selectedCount()).toBe(component.pageSize);
    expect(component.allPageSelected()).toBe(true);

    component.nextPage();
    expect(component.allPageSelected()).toBe(false);

    component.updateSearch('northstar');
    expect(component.page()).toBe(1);
    expect(component.selectedCount()).toBe(0);
  });

  it('exposes an error state and recovers when the request is retried', () => {
    const fixture = TestBed.createComponent(Accounts);
    const component = fixture.componentInstance;

    component.load(true);
    expect(component.error()).toBe(true);
    expect(component.loading()).toBe(false);

    component.load();
    expect(component.error()).toBe(false);
    expect(component.loading()).toBe(false);
    expect(component.customers()).toHaveLength(customers.length);
  });
});
