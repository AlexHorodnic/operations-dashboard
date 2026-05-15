import { CommonModule } from '@angular/common';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { Component, DestroyRef, ElementRef, HostListener, computed, inject, signal, viewChild } from '@angular/core';
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

interface TaskTimelineEvent {
  time: string;
  title: string;
  detail: string;
}

interface TaskComment {
  author: string;
  initials: string;
  time: string;
  message: string;
}

interface RelatedAccount {
  company: string;
  plan: string;
  contractValue: string;
  health: string;
  context: string;
}

interface TaskResource {
  name: string;
  type: string;
}

interface TaskDetailRecord {
  blockerDetail?: string;
  timeline: TaskTimelineEvent[];
  comments: TaskComment[];
  account: RelatedAccount;
  resources: TaskResource[];
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
  private readonly taskDetails = new Map<number, TaskDetailRecord>([
    [1, {
      timeline: [
        { time: 'May 12, 09:14', title: 'Task created', detail: 'Onboarding checklist opened from the launch workflow.' },
        { time: 'May 12, 09:18', title: 'Assigned to Avery', detail: 'Ownership routed to the onboarding pod.' },
        { time: 'Today, 08:42', title: 'Moved to in progress', detail: 'Workspace admin review started.' },
      ],
      comments: [
        { author: 'Avery', initials: 'A', time: '12m ago', message: 'Waiting for the workspace admin to confirm SSO defaults.' },
        { author: 'Mina', initials: 'M', time: '1h ago', message: 'Billing profile is complete; onboarding can continue once admin confirms.' },
      ],
      account: { company: 'Bluebird Finance', plan: 'Growth', contractValue: '$31.6K ARR', health: 'Healthy · 87', context: 'Renewal Aug 15, 2026' },
      resources: [{ name: 'Onboarding checklist', type: 'PDF' }],
    }],
    [2, {
      blockerDetail: 'Finance sync API returning invalid payloads.',
      timeline: [
        { time: 'Today, 07:28', title: 'Task created', detail: 'Incident detected by finance sync monitor.' },
        { time: 'Today, 07:31', title: 'Assigned to Mina', detail: 'Routed to billing operations.' },
        { time: '18m ago', title: 'Escalated and blocked', detail: 'Finance approval required before retrying the sync.' },
      ],
      comments: [
        { author: 'Mina', initials: 'M', time: '18m ago', message: 'Need finance approval before we can replay the failed payloads.' },
        { author: 'Leo', initials: 'L', time: '9m ago', message: 'I attached the latest finance notes for review.' },
      ],
      account: { company: 'Atlas Retail', plan: 'Enterprise', contractValue: '$68.9K ARR', health: 'At risk · 61', context: 'Open incident: billing sync' },
      resources: [{ name: 'Finance notes', type: 'DOC' }, { name: 'Payload sample', type: 'JSON' }],
    }],
    [4, {
      timeline: [
        { time: 'May 13, 10:06', title: 'Task created', detail: 'Migration workflow generated the mapping review.' },
        { time: 'May 13, 10:14', title: 'Assigned to Iris', detail: 'Ownership accepted by migration operations.' },
        { time: '34m ago', title: 'Comment added', detail: 'Mapping review is in progress.' },
      ],
      comments: [
        { author: 'Iris', initials: 'I', time: '34m ago', message: 'Two field mappings need customer confirmation before import.' },
        { author: 'Avery', initials: 'A', time: '2h ago', message: 'CSV structure looks clean after the latest export.' },
      ],
      account: { company: 'Cobalt Logistics', plan: 'Growth', contractValue: '$27.4K ARR', health: 'Healthy · 81', context: 'Renewal Sep 12, 2026' },
      resources: [{ name: 'Import mapping', type: 'CSV' }],
    }],
  ]);
  private readonly fallbackAccount: RelatedAccount = { company: 'Related account', plan: 'Growth', contractValue: '$24.0K ARR', health: 'Healthy · 82', context: 'No open incidents' };
  private lastFocusedTaskCard: HTMLElement | null = null;
  private readonly drawerCloseButton = viewChild<ElementRef<HTMLButtonElement>>('taskDrawerClose');

  readonly loading = signal(true);
  readonly tasks = signal<OperationTask[]>([]);
  readonly query = signal('');
  readonly owner = signal('All');
  readonly priority = signal<TaskPriority | 'All'>('All');
  readonly dragOverStatus = signal<TaskStatus | null>(null);
  readonly actionMessage = signal('');
  readonly statusUpdates = signal(new Map<number, Partial<TaskMeta>>());
  readonly selectedTaskId = signal<number | null>(null);
  readonly draggingTask = signal(false);
  readonly statuses: TaskStatus[] = ['Queued', 'In progress', 'Blocked', 'Done'];
  readonly priorities: (TaskPriority | 'All')[] = ['All', 'Critical', 'High', 'Medium', 'Low'];
  readonly owners = computed(() => ['All', ...Array.from(new Set(this.tasks().map((task) => task.owner)))]);

  readonly workflowTasks = computed<WorkflowTask[]>(() =>
    this.tasks().map((task) => {
      const dueDate = new Date(`${task.dueDate}T00:00:00`);
      const meta = this.taskMeta.get(task.id) ?? { comments: 0, update: 'Updated recently', detail: 'No recent update' };
      const statusUpdate = this.statusUpdates().get(task.id);
      return {
        ...task,
        ...meta,
        ...statusUpdate,
        blockedReason: task.status === 'Blocked' ? statusUpdate?.blockedReason ?? meta.blockedReason : undefined,
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
  readonly tasksByStatus = computed(() => {
    const grouped = new Map<TaskStatus, WorkflowTask[]>(this.statuses.map((status) => [status, []]));

    for (const task of this.filteredTasks()) {
      grouped.get(task.status)?.push(task);
    }

    return grouped;
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
  readonly selectedTask = computed(() => this.workflowTasks().find((task) => task.id === this.selectedTaskId()) ?? null);
  readonly selectedTaskDetails = computed<TaskDetailRecord | null>(() => {
    const task = this.selectedTask();
    if (!task) {
      return null;
    }

    return this.taskDetails.get(task.id) ?? {
      blockerDetail: task.blockedReason,
      timeline: [
        { time: 'Created recently', title: 'Task created', detail: `${task.type} workflow item created for ${task.customer}.` },
        { time: task.update, title: `Moved to ${task.status.toLowerCase()}`, detail: task.detail },
      ],
      comments: [
        { author: task.owner, initials: task.owner.slice(0, 1), time: 'Recently', message: task.detail },
        { author: 'Ops', initials: 'O', time: 'Earlier', message: 'Monitoring progress and next customer action.' },
      ],
      account: { ...this.fallbackAccount, company: task.customer },
      resources: [],
    };
  });

  constructor() {
    this.data.getTasks().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((tasks) => {
      this.tasks.set(tasks);
      this.loading.set(false);
    });
  }

  tasksForStatus(status: TaskStatus): WorkflowTask[] {
    return this.tasksByStatus().get(status) ?? [];
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
    this.draggingTask.set(true);
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
      this.recordStatusUpdate(task.id, task.status, status);
      this.reorderStatus(status, orderedTargetIds);
    }

    this.dragOverStatus.set(null);
  }

  endDrag(): void {
    this.dragOverStatus.set(null);
    window.setTimeout(() => this.draggingTask.set(false));
  }

  runQuickAction(action: 'open' | 'assign', task: WorkflowTask): void {
    this.actionMessage.set(action === 'open' ? `Opened ${task.title}` : `Assignment flow opened for ${task.title}`);
    window.setTimeout(() => this.actionMessage.set(''), 2200);
  }

  openTaskDrawer(task: WorkflowTask, event: Event): void {
    if (this.draggingTask()) {
      return;
    }

    this.lastFocusedTaskCard = event.currentTarget as HTMLElement | null;
    this.selectedTaskId.set(task.id);
    window.setTimeout(() => this.drawerCloseButton()?.nativeElement.focus());
  }

  closeTaskDrawer(): void {
    this.selectedTaskId.set(null);
    window.setTimeout(() => this.lastFocusedTaskCard?.focus());
  }

  @HostListener('document:keydown.escape')
  protected closeTaskDrawerOnEscape(): void {
    if (this.selectedTaskId() !== null) {
      this.closeTaskDrawer();
    }
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

  private recordStatusUpdate(taskId: number, previousStatus: TaskStatus, nextStatus: TaskStatus): void {
    const update =
      nextStatus === 'Done'
        ? 'Closed just now'
        : previousStatus === 'Done'
          ? 'Reopened just now'
          : nextStatus === 'Blocked'
            ? 'Blocked just now'
            : nextStatus === 'In progress'
              ? 'Moved to in progress just now'
              : 'Moved to queue just now';

    this.statusUpdates.update((updates) => {
      const next = new Map(updates);
      next.set(taskId, {
        update,
        blockedReason: nextStatus === 'Blocked' ? 'Status changed to blocked' : undefined,
      });
      return next;
    });
  }
}
