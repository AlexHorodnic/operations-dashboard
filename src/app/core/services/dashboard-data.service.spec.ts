import { TestBed } from '@angular/core/testing';

import { customers, tasks } from '../../mock-data/mock-dashboard-data';
import { Customer, OperationTask } from '../models/dashboard.models';
import { installStorageMock } from '../../../testing/storage.mock';
import { DashboardDataService } from './dashboard-data.service';

describe('DashboardDataService', () => {
  let service: DashboardDataService;

  beforeEach(() => {
    installStorageMock('localStorage');
    TestBed.configureTestingModule({});
    service = TestBed.inject(DashboardDataService);
  });

  it('persists owner updates and reapplies them to customer data', () => {
    const updated = service.updateCustomerOwners([customers[0].id, customers[1].id], 'Leo');

    expect(updated.find((customer) => customer.id === customers[0].id)?.owner).toBe('Leo');
    expect(updated.find((customer) => customer.id === customers[1].id)?.owner).toBe('Leo');

    const stored = JSON.parse(
      localStorage.getItem('operations-dashboard-owner-overrides') ?? '{}',
    ) as Record<string, string>;
    expect(stored[String(customers[0].id)]).toBe('Leo');
  });

  it('adds custom customers without mutating the source customer list', () => {
    const customCustomer: Customer = {
      ...customers[0],
      id: 99,
      name: 'Taylor Reed',
      email: 'taylor@example.com',
      company: 'Example Co',
    };

    const updated = service.addCustomer(customCustomer);

    expect(updated).toHaveLength(customers.length + 1);
    expect(updated.at(-1)).toEqual(customCustomer);
    expect(customers).toHaveLength(12);
  });

  it('supports task add, update, and delete persistence', () => {
    const newTask: OperationTask = {
      id: 99,
      title: 'Validate customer handoff',
      owner: 'Avery',
      status: 'Queued',
      priority: 'High',
      dueDate: '2026-06-20',
      customer: 'Example Co',
      type: 'Onboarding',
    };

    expect(service.addTask(newTask)).toContainEqual(newTask);
    expect(service.updateTask(newTask.id, { status: 'Done' })).toContainEqual({
      ...newTask,
      status: 'Done',
    });
    expect(service.deleteTask(newTask.id).some((task) => task.id === newTask.id)).toBe(false);
  });

  it('falls back to source tasks when stored data is malformed', () => {
    localStorage.setItem('operations-dashboard-tasks', JSON.stringify([{ id: 'invalid' }]));

    const updated = service.updateTask(tasks[0].id, { owner: 'Iris' });

    expect(updated).toHaveLength(tasks.length);
    expect(updated.find((task) => task.id === tasks[0].id)?.owner).toBe('Iris');
  });
});
