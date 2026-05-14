import { CommonModule } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { DashboardDataService } from '../../core/services/dashboard-data.service';
import { OperationTask, TaskPriority, TaskStatus } from '../../models/dashboard.models';
import { Badge } from '../../shared/badge/badge';
import { EmptyState } from '../../shared/empty-state/empty-state';

@Component({
  selector: 'app-tasks',
  imports: [CommonModule, FormsModule, Badge, EmptyState],
  templateUrl: './tasks.html',
})
export class Tasks {
  private readonly data = inject(DashboardDataService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(true);
  readonly tasks = signal<OperationTask[]>([]);
  readonly query = signal('');
  readonly owner = signal('All');
  readonly priority = signal<TaskPriority | 'All'>('All');
  readonly statuses: TaskStatus[] = ['Queued', 'In progress', 'Blocked', 'Done'];
  readonly priorities: (TaskPriority | 'All')[] = ['All', 'Critical', 'High', 'Medium', 'Low'];
  readonly owners = computed(() => ['All', ...Array.from(new Set(this.tasks().map((task) => task.owner)))]);

  readonly filteredTasks = computed(() => {
    const query = this.query().trim().toLowerCase();
    const owner = this.owner();
    const priority = this.priority();

    return this.tasks().filter((task) => {
      const matchesQuery = `${task.title} ${task.customer} ${task.type}`.toLowerCase().includes(query);
      const matchesOwner = owner === 'All' || task.owner === owner;
      const matchesPriority = priority === 'All' || task.priority === priority;
      return matchesQuery && matchesOwner && matchesPriority;
    });
  });

  constructor() {
    this.data.getTasks().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((tasks) => {
      this.tasks.set(tasks);
      this.loading.set(false);
    });
  }

  tasksForStatus(status: TaskStatus): OperationTask[] {
    return this.filteredTasks().filter((task) => task.status === status);
  }

  priorityTone(priority: TaskPriority): 'danger' | 'warning' | 'accent' | 'neutral' {
    if (priority === 'Critical') {
      return 'danger';
    }
    if (priority === 'High') {
      return 'warning';
    }
    if (priority === 'Medium') {
      return 'accent';
    }
    return 'neutral';
  }
}
