import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { OperationTask } from '../../core/models/dashboard.models';
import { DashboardDataService } from '../../core/services/dashboard-data.service';
import { tasks } from '../../mock-data/mock-dashboard-data';
import { installStorageMock } from '../../../testing/storage.mock';
import { Workflow } from './workflow';

class FakeDashboardDataService {
  private storedTasks = tasks.map((task) => ({ ...task }));

  getTasks() {
    return of(this.copy());
  }

  updateTasks(nextTasks: readonly OperationTask[]): OperationTask[] {
    this.storedTasks = nextTasks.map((task) => ({ ...task }));
    return this.copy();
  }

  updateTask(taskId: number, changes: Partial<OperationTask>): OperationTask[] {
    return this.updateTasks(
      this.storedTasks.map((task) => (task.id === taskId ? { ...task, ...changes } : task)),
    );
  }

  addTask(task: OperationTask): OperationTask[] {
    return this.updateTasks([...this.storedTasks, task]);
  }

  deleteTask(taskId: number): OperationTask[] {
    return this.updateTasks(this.storedTasks.filter((task) => task.id !== taskId));
  }

  private copy(): OperationTask[] {
    return this.storedTasks.map((task) => ({ ...task }));
  }
}

describe('Workflow', () => {
  beforeEach(async () => {
    installStorageMock('localStorage');
    installStorageMock('sessionStorage');
    Object.defineProperty(window, 'scrollTo', {
      value: () => undefined,
      configurable: true,
    });

    await TestBed.configureTestingModule({
      imports: [Workflow],
      providers: [
        provideRouter([]),
        { provide: DashboardDataService, useClass: FakeDashboardDataService },
      ],
    }).compileComponents();
  });

  it('filters tasks by query, owner, and priority', () => {
    const fixture = TestBed.createComponent(Workflow);
    const component = fixture.componentInstance;

    component.query.set('atlas retail');
    expect(component.filteredTasks().map((task) => task.id)).toEqual([2]);

    component.query.set('');
    component.owner.set('Avery');
    component.priority.set('High');
    expect(component.filteredTasks().map((task) => task.id)).toEqual([1, 6, 10]);
  });

  it('moves a task to a new status and records the transition', () => {
    const fixture = TestBed.createComponent(Workflow);
    const component = fixture.componentInstance;
    const task = component.workflowTasks().find((item) => item.id === 2)!;

    component.moveSheetTaskId.set(task.id);
    component.moveTaskToStatus(task, 'Done');

    expect(component.workflowTasks().find((item) => item.id === task.id)?.status).toBe('Done');
    expect(component.statusUpdates().get(task.id)?.update).toBe('Closed just now');
    expect(component.moveSheetTaskId()).toBeNull();
  });

  it('deletes and restores a task without losing its core data', () => {
    const fixture = TestBed.createComponent(Workflow);
    const component = fixture.componentInstance;
    const task = component.workflowTasks().find((item) => item.id === 3)!;

    component.deleteTask(task);
    expect(component.workflowTasks().some((item) => item.id === task.id)).toBe(false);
    expect(component.deletedTask()?.id).toBe(task.id);

    component.restoreDeletedTask();
    expect(component.workflowTasks().some((item) => item.id === task.id)).toBe(true);
    expect(component.deletedTask()).toBeNull();
  });
});
