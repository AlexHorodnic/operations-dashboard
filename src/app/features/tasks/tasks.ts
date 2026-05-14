import { CommonModule } from '@angular/common';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { DashboardDataService } from '../../core/services/dashboard-data.service';
import { OperationTask, TaskPriority, TaskStatus } from '../../models/dashboard.models';
import { Badge } from '../../shared/badge/badge';
import { EmptyState } from '../../shared/empty-state/empty-state';

interface TaskMeta {
  comments: number;
  update: string;
  detail: string;
  blockedReason?: string;
}

interface WorkflowTask extends OperationTask, TaskMeta {
  isOverdue: boolean;
  isUrgent: boolean;
}

interface WorkflowKpi {
  label: string;
  value: string;
  detail: string;
  tone: 'neutral' | 'warning' | 'danger' | 'success';
}

@Component({
  selector: 'app-tasks',
  imports: [CommonModule, FormsModule, DragDropModule, Badge, EmptyState],
  templateUrl: './tasks.html',
})
export class Tasks {
  private readonly data = inject(DashboardDataService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly today = new Date('2026-05-14T00:00:00');
  private readonly taskMeta = new Map<number, TaskMeta>([
    [1, { comments: 4, update: 'Updated 2m ago', detail: 'Waiting on workspace admin' }],
    [2, { comments: 8, update: 'Escalated 18m ago', detail: 'Finance sync blocked', blockedReason: 'Waiting on finance approval' }],
    [3, { comments: 2, update: 'Updated 1h ago', detail: 'Draft packet in review' }],
    [4, { comments: 3, update: 'Updated 34m ago', detail: 'Mapping review in progress' }],
    [5, { comments: 1, update: 'Closed yesterday', detail: 'Migration accepted by customer' }],
    [6, { comments: 5, update: 'Updated 45m ago', detail: 'Retention risk review queued' }],
    [7, { comments: 2, update: 'Updated 3h ago', detail: 'Security team requested documents' }],
    [8, { comments: 1, update: 'Completed 2d ago', detail: 'Expansion seats provisioned' }],
    [9, { comments: 3, update: 'Updated 26m ago', detail: 'Admin handoff waiting on customer' }],
    [10, { comments: 6, update: 'Blocked 1h ago', detail: 'Renewal memo waiting on CSM', blockedReason: 'Missing executive sponsor notes' }],
  ]);

  readonly loading = signal(true);
  readonly tasks = signal<OperationTask[]>([]);
  readonly query = signal('');
  readonly owner = signal('All');
  readonly priority = signal<TaskPriority | 'All'>('All');
  readonly dragOverStatus = signal<TaskStatus | null>(null);
  readonly actionMessage = signal('');
  readonly statuses: TaskStatus[] = ['Queued', 'In progress', 'Blocked', 'Done'];
  readonly priorities: (TaskPriority | 'All')[] = ['All', 'Critical', 'High', 'Medium', 'Low'];
  readonly owners = computed(() => ['All', ...Array.from(new Set(this.tasks().map((task) => task.owner)))]);

  readonly workflowTasks = computed<WorkflowTask[]>(() =>
    this.tasks().map((task) => {
      const dueDate = new Date(`${task.dueDate}T00:00:00`);
      const meta = this.taskMeta.get(task.id) ?? { comments: 0, update: 'Updated recently', detail: 'No recent update' };
      return {
        ...task,
        ...meta,
        isOverdue: task.status !== 'Done' && dueDate < this.today,
        isUrgent: task.priority === 'Critical' || (task.status !== 'Done' && dueDate < this.today),
      };
    }),
  );

  readonly filteredTasks = computed(() => {
    const query = this.query().trim().toLowerCase();
    const owner = this.owner();
    const priority = this.priority();

    return this.workflowTasks().filter((task) => {
      const matchesQuery = `${task.title} ${task.customer} ${task.type}`.toLowerCase().includes(query);
      const matchesOwner = owner === 'All' || task.owner === owner;
      const matchesPriority = priority === 'All' || task.priority === priority;
      return matchesQuery && matchesOwner && matchesPriority;
    });
  });

  readonly hasActiveFilters = computed(() => !!this.query().trim() || this.owner() !== 'All' || this.priority() !== 'All');
  readonly workflowKpis = computed<WorkflowKpi[]>(() => {
    const tasks = this.workflowTasks();
    const total = tasks.length || 1;
    const active = tasks.filter((task) => task.status !== 'Done').length;
    const blocked = tasks.filter((task) => task.status === 'Blocked').length;
    const slaRisk = tasks.filter((task) => task.isUrgent).length;
    const done = tasks.filter((task) => task.status === 'Done').length;
    const completionRate = Math.round((done / total) * 100);

    return [
      { label: 'Active work items', value: String(active), detail: 'Across open lanes', tone: 'neutral' },
      { label: 'Blocked items', value: String(blocked), detail: 'Need intervention', tone: blocked ? 'danger' : 'success' },
      { label: 'SLA risk', value: String(slaRisk), detail: 'Critical or past due', tone: slaRisk ? 'warning' : 'success' },
      { label: 'Completion rate', value: `${completionRate}%`, detail: 'Closed in current cycle', tone: 'success' },
      { label: 'Avg. resolution', value: '2.8d', detail: 'Rolling 14-day average', tone: 'neutral' },
    ];
  });

  constructor() {
    this.data.getTasks().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((tasks) => {
      this.tasks.set(tasks);
      this.loading.set(false);
    });
  }

  tasksForStatus(status: TaskStatus): WorkflowTask[] {
    return this.filteredTasks().filter((task) => task.status === status);
  }

  clearFilters(): void {
    this.query.set('');
    this.owner.set('All');
    this.priority.set('All');
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

  columnClass(status: TaskStatus): string {
    return `kanban-column kanban-column--${status.toLowerCase().replaceAll(' ', '-')}`;
  }

  dragStart(task: WorkflowTask): void {
    this.dragOverStatus.set(task.status);
  }

  dropTask(status: TaskStatus, event: CdkDragDrop<WorkflowTask[]>): void {
    const task = event.item.data as WorkflowTask | undefined;
    if (!task) {
      return;
    }

    const targetTasks = event.container.data.filter((item) => item.id !== task.id);
    targetTasks.splice(event.currentIndex, 0, { ...task, status });
    const orderedTargetIds = targetTasks.map((item) => item.id);

    if (event.previousContainer === event.container) {
      const reorderedTasks = [...event.container.data];
      moveItemInArray(reorderedTasks, event.previousIndex, event.currentIndex);
      this.reorderStatus(status, reorderedTasks.map((item) => item.id));
    } else {
      this.tasks.update((tasks) => tasks.map((item) => (item.id === task.id ? { ...item, status } : item)));
      this.reorderStatus(status, orderedTargetIds);
    }

    this.dragOverStatus.set(null);
  }

  endDrag(): void {
    this.dragOverStatus.set(null);
  }

  runQuickAction(action: 'open' | 'assign', task: WorkflowTask): void {
    this.actionMessage.set(action === 'open' ? `Opened ${task.title}` : `Assignment flow opened for ${task.title}`);
    window.setTimeout(() => this.actionMessage.set(''), 2200);
  }

  private reorderStatus(status: TaskStatus, orderedIds: readonly number[]): void {
    this.tasks.update((tasks) => {
      const byId = new Map(tasks.map((task) => [task.id, task]));
      const orderedSet = new Set(orderedIds);
      const reordered = orderedIds
        .map((id) => byId.get(id))
        .filter((task): task is OperationTask => !!task);
      const remainingInStatus = tasks.filter((task) => task.status === status && !orderedSet.has(task.id));
      const otherTasks = tasks.filter((task) => task.status !== status);

      return [...otherTasks, ...reordered, ...remainingInStatus];
    });
  }
}
