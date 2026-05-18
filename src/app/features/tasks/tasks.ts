import { CommonModule } from '@angular/common';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { Component, DestroyRef, ElementRef, HostListener, computed, effect, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CircleAlert, CircleCheckBig, Clock3, ListTodo, LucideAngularModule, Plus, Search, Trash2, X } from 'lucide-angular';
import { DashboardDataService } from '../../core/services/dashboard-data.service';
import { CUSTOMER_OWNERS, OperationTask, TaskPriority, TaskStatus } from '../../models/dashboard.models';
import { Badge } from '../../shared/badge/badge';
import { EmptyState } from '../../shared/empty-state/empty-state';

interface TaskMeta {
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
  openIssues?: string;
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

interface TaskDraft {
  title: string;
  owner: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string;
  customer: string;
  type: OperationTask['type'];
}

interface TaskToast {
  message: string;
  tone: 'success' | 'danger';
  actionLabel?: string;
}

@Component({
  selector: 'app-tasks',
  imports: [CommonModule, FormsModule, DragDropModule, LucideAngularModule, Badge, EmptyState],
  templateUrl: './tasks.html',
  styleUrl: './tasks.scss',
})
export class Tasks {
  private readonly data = inject(DashboardDataService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly today = this.localMidnight(new Date());
  private readonly taskMeta = new Map<number, TaskMeta>([
    [1, { update: 'Updated 2m ago', detail: 'Waiting on customer SSO role approval' }],
    [2, { update: 'Escalated 18m ago', detail: 'ERP payload replay is blocked', blockedReason: 'Finance approval required before replay' }],
    [3, { update: 'Updated 1h ago', detail: 'Procurement redlines need revision' }],
    [4, { update: 'Reopened 34m ago', detail: 'Duplicate contacts found in import file' }],
    [5, { update: 'Closed yesterday', detail: 'DNS verification accepted by customer' }],
    [6, { update: 'Updated 45m ago', detail: 'Adoption review queued after champion change' }],
    [7, { update: 'Updated 3h ago', detail: 'Security sign-off still pending' }],
    [8, { update: 'Completed 2d ago', detail: 'Finance workspace seats provisioned' }],
    [9, { update: 'Updated 26m ago', detail: 'New finance owner has not accepted handoff' }],
    [10, { update: 'Blocked 1h ago', detail: 'Risk memo waiting on sponsor notes', blockedReason: 'Executive sponsor notes missing' }],
  ]);
  private readonly initialTaskDetails = new Map<number, TaskDetailRecord>([
    [1, {
      timeline: [
        { time: 'May 12, 09:14', title: 'Task created', detail: 'Launch handoff opened after implementation review.' },
        { time: 'May 12, 09:18', title: 'Assigned to Avery', detail: 'Ownership routed to the onboarding pod.' },
        { time: 'Today, 08:42', title: 'Moved to in progress', detail: 'SSO role review started with the workspace admin.' },
      ],
      comments: [
        { author: 'Avery', initials: 'A', time: '12m ago', message: 'Waiting for the workspace admin to approve the SSO role set before handoff.' },
        { author: 'Mina', initials: 'M', time: '1h ago', message: 'Billing profile is complete; this is the last launch blocker on our side.' },
      ],
      account: { company: 'Bluebird Finance', plan: 'Growth', contractValue: '$31.6K ARR', health: 'Healthy · 87', context: 'Renewal Aug 15, 2026' },
      resources: [{ name: 'Onboarding checklist', type: 'PDF' }],
    }],
    [2, {
      blockerDetail: 'ERP import produced invalid billing payloads during replay.',
      timeline: [
        { time: 'Today, 07:28', title: 'Task created', detail: 'Incident detected after the ERP import sync failed.' },
        { time: 'Today, 07:31', title: 'Assigned to Mina', detail: 'Routed to billing operations.' },
        { time: '18m ago', title: 'Escalated and blocked', detail: 'Finance approval required before replaying the failed payloads.' },
      ],
      comments: [
        { author: 'Mina', initials: 'M', time: '18m ago', message: 'Need finance approval before we can replay the failed ERP payloads.' },
        { author: 'Leo', initials: 'L', time: '9m ago', message: 'Attached the finance notes and the failed payload sample for review.' },
      ],
      account: { company: 'Atlas Retail', plan: 'Enterprise', contractValue: '$68.9K ARR', health: 'At risk · 61', context: 'Renewal Jul 28, 2026', openIssues: 'Billing sync incident' },
      resources: [{ name: 'Finance notes', type: 'DOC' }, { name: 'Payload sample', type: 'JSON' }],
    }],
    [4, {
      timeline: [
        { time: 'May 13, 10:06', title: 'Task created', detail: 'Migration workflow opened the import review.' },
        { time: 'May 13, 10:14', title: 'Assigned to Iris', detail: 'Ownership accepted by migration operations.' },
        { time: '34m ago', title: 'Task reopened', detail: 'Duplicate finance contacts were detected in the latest CSV.' },
      ],
      comments: [
        { author: 'Iris', initials: 'I', time: '34m ago', message: 'The new CSV has duplicate finance contacts; I need a cleaned export before retrying import.' },
        { author: 'Avery', initials: 'A', time: '2h ago', message: 'Original field mapping looked fine, but the contact rows need customer cleanup.' },
      ],
      account: { company: 'Cobalt Logistics', plan: 'Growth', contractValue: '$27.4K ARR', health: 'Healthy · 81', context: 'Renewal Sep 12, 2026' },
      resources: [{ name: 'Import mapping', type: 'CSV' }],
    }],
  ]);
  private readonly fallbackAccount: RelatedAccount = { company: 'Account context unavailable', plan: 'Growth', contractValue: '$24.0K ARR', health: 'Monitor · 72', context: 'Renewal date not loaded', openIssues: 'No linked issue record' };
  private readonly taskDetailsKey = 'operations-dashboard-task-details';
  private lastFocusedTaskCard: HTMLElement | null = null;
  private lastMoveSheetTrigger: HTMLElement | null = null;
  private lockedScrollY = 0;
  private readonly drawerCloseButton = viewChild<ElementRef<HTMLButtonElement>>('taskDrawerClose');
  private readonly moveSheetCloseButton = viewChild<ElementRef<HTMLButtonElement>>('moveSheetClose');
  private readonly taskCommentInput = viewChild<ElementRef<HTMLTextAreaElement>>('taskCommentInput');

  readonly loading = signal(true);
  readonly error = signal(false);
  readonly tasks = signal<OperationTask[]>([]);
  readonly query = signal('');
  readonly owner = signal('All');
  readonly priority = signal<TaskPriority | 'All'>('All');
  readonly dragOverStatus = signal<TaskStatus | null>(null);
  readonly toast = signal<TaskToast | null>(null);
  readonly statusUpdates = signal(new Map<number, Partial<TaskMeta>>());
  readonly selectedTaskId = signal<number | null>(null);
  readonly draggingTask = signal(false);
  readonly assignmentTaskId = signal<number | null>(null);
  readonly actionsTaskId = signal<number | null>(null);
  readonly drawerActionsOpen = signal(false);
  readonly createTaskOpen = signal(false);
  readonly moveSheetTaskId = signal<number | null>(null);
  readonly isMobileWorkflow = signal(typeof window !== 'undefined' && window.innerWidth <= 1080);
  readonly taskDetails = signal(this.readTaskDetails());
  readonly commentDraft = signal('');
  readonly taskDraft = signal<TaskDraft>(this.createTaskDraft());
  readonly taskDraftError = signal('');
  readonly statuses: TaskStatus[] = ['Queued', 'In progress', 'Blocked', 'Done'];
  readonly priorities: (TaskPriority | 'All')[] = ['All', 'Critical', 'High', 'Medium', 'Low'];
  readonly taskTypes: OperationTask['type'][] = ['Onboarding', 'Incident', 'Renewal', 'Risk', 'Migration'];
  readonly ListTodo = ListTodo;
  readonly Clock3 = Clock3;
  readonly CircleAlert = CircleAlert;
  readonly CircleCheckBig = CircleCheckBig;
  readonly Plus = Plus;
  readonly Search = Search;
  readonly Trash2 = Trash2;
  readonly X = X;
  readonly owners = computed(() => ['All', ...Array.from(new Set([...CUSTOMER_OWNERS, ...this.tasks().map((task) => task.owner)]))]);

  readonly workflowTasks = computed<WorkflowTask[]>(() =>
    this.tasks().map((task) => {
      const dueDate = new Date(`${task.dueDate}T00:00:00`);
      const meta = this.taskMeta.get(task.id) ?? { update: 'Updated recently', detail: 'No operator note yet' };
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
  readonly filteredActiveTaskCount = computed(() => this.filteredTasks().filter((task) => task.status !== 'Done').length);
  readonly tasksByStatus = computed(() => {
    const grouped = new Map<TaskStatus, WorkflowTask[]>(this.statuses.map((status) => [status, []]));

    for (const task of this.filteredTasks()) {
      grouped.get(task.status)?.push(task);
    }

    return grouped;
  });

  readonly hasActiveFilters = computed(() => !!this.query().trim() || this.owner() !== 'All' || this.priority() !== 'All');
  readonly hasTasks = computed(() => this.workflowTasks().length > 0);
  readonly workflowKpis = computed<WorkflowKpi[]>(() => {
    const tasks = this.workflowTasks();
    const total = tasks.length || 1;
    const active = tasks.filter((task) => task.status !== 'Done').length;
    const blocked = tasks.filter((task) => task.status === 'Blocked').length;
    const slaRisk = tasks.filter((task) => task.isUrgent).length;
    const done = tasks.filter((task) => task.status === 'Done').length;
    const completionRate = Math.round((done / total) * 100);
    const dueThisWeek = tasks.filter((task) => {
      if (task.status === 'Done') {
        return false;
      }
      const dueDate = new Date(`${task.dueDate}T00:00:00`);
      const msUntilDue = dueDate.getTime() - this.today.getTime();
      return msUntilDue >= 0 && msUntilDue <= 7 * 24 * 60 * 60 * 1000;
    }).length;

    return [
      { label: 'Open work items', value: String(active), detail: 'Across active lanes', tone: 'neutral' },
      { label: 'Blocked', value: String(blocked), detail: 'Need external follow-up', tone: blocked ? 'danger' : 'success' },
      { label: 'SLA watch', value: String(slaRisk), detail: 'Critical or past due', tone: slaRisk ? 'warning' : 'success' },
      { label: 'Cycle closure', value: `${completionRate}%`, detail: 'Closed in current batch', tone: 'success' },
      { label: 'Due this week', value: String(dueThisWeek), detail: 'Still open before Friday', tone: dueThisWeek ? 'warning' : 'success' },
    ];
  });
  readonly selectedTask = computed(() => this.workflowTasks().find((task) => task.id === this.selectedTaskId()) ?? null);
  readonly moveSheetTask = computed(() => this.workflowTasks().find((task) => task.id === this.moveSheetTaskId()) ?? null);
  readonly selectedTaskDetails = computed<TaskDetailRecord | null>(() => {
    const task = this.selectedTask();
    if (!task) {
      return null;
    }

    return this.taskDetails().get(task.id) ?? this.createFallbackTaskDetails(task);
  });

  constructor() {
    this.load();
    effect(() => {
      const drawerOpen = this.selectedTaskId() !== null || this.createTaskOpen() || this.moveSheetTaskId() !== null;
      this.setBodyScrollLock(drawerOpen);
    });
    this.destroyRef.onDestroy(() => this.setBodyScrollLock(false));
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      if (params.get('createTask') === '1') {
        this.openCreateTask();
      }
    });
  }

  load(): void {
    this.loading.set(true);
    this.error.set(false);
    this.data.getTasks().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (tasks) => {
        this.tasks.set(tasks);
        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
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

  statusIcon(status: TaskStatus) {
    if (status === 'Queued') {
      return this.ListTodo;
    }
    if (status === 'In progress') {
      return this.Clock3;
    }
    if (status === 'Blocked') {
      return this.CircleAlert;
    }
    return this.CircleCheckBig;
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
      this.tasks.set(this.data.updateTask(task.id, { status }));
      this.recordStatusUpdate(task.id, task.status, status);
      this.reorderStatus(status, orderedTargetIds);
    }

    this.dragOverStatus.set(null);
  }

  openMoveSheet(task: WorkflowTask, event: Event): void {
    this.lastMoveSheetTrigger = event.currentTarget as HTMLElement | null;
    this.moveSheetTaskId.set(task.id);
    this.assignmentTaskId.set(null);
    this.actionsTaskId.set(null);
    window.setTimeout(() => this.moveSheetCloseButton()?.nativeElement.focus());
  }

  closeMoveSheet(): void {
    this.moveSheetTaskId.set(null);
    window.setTimeout(() => this.lastMoveSheetTrigger?.focus());
  }

  moveTaskToStatus(task: WorkflowTask, status: TaskStatus): void {
    if (status !== task.status) {
      this.tasks.set(this.data.updateTask(task.id, { status }));
      this.recordStatusUpdate(task.id, task.status, status);
    }

    this.closeMoveSheet();
  }

  endDrag(): void {
    this.dragOverStatus.set(null);
    window.setTimeout(() => this.draggingTask.set(false));
  }

  openAssignment(task: WorkflowTask): void {
    this.assignmentTaskId.set(this.assignmentTaskId() === task.id ? null : task.id);
    this.actionsTaskId.set(null);
  }

  assignOwner(task: WorkflowTask, owner: string): void {
    this.tasks.set(this.data.updateTask(task.id, { owner }));
    this.assignmentTaskId.set(null);
    this.showToast({ message: `${task.title} assigned to ${owner}`, tone: 'success' });
  }

  toggleTaskActions(taskId: number): void {
    this.actionsTaskId.set(this.actionsTaskId() === taskId ? null : taskId);
    this.assignmentTaskId.set(null);
  }

  toggleDrawerActions(): void {
    this.drawerActionsOpen.update((open) => !open);
  }

  deleteTask(task: WorkflowTask): void {
    this.tasks.set(this.data.deleteTask(task.id));
    this.actionsTaskId.set(null);
    if (this.selectedTaskId() === task.id) {
      this.closeTaskDrawer();
    }
    this.showToast({ message: `${task.title} deleted`, tone: 'danger', actionLabel: 'Undo' });
    this.deletedTask.set(task);
  }

  openCreateTask(): void {
    this.taskDraft.set(this.createTaskDraft());
    this.taskDraftError.set('');
    this.createTaskOpen.set(true);
  }

  closeCreateTask(): void {
    this.createTaskOpen.set(false);
    this.taskDraftError.set('');
    if (this.route.snapshot.queryParamMap.get('createTask')) {
      void this.router.navigate([], { relativeTo: this.route, queryParams: { createTask: null }, queryParamsHandling: 'merge' });
    }
  }

  updateTaskDraft<K extends keyof TaskDraft>(key: K, value: TaskDraft[K]): void {
    this.taskDraft.update((draft) => ({ ...draft, [key]: value }));
  }

  createTask(): void {
    const draft = this.taskDraft();
    if (!draft.title.trim() || !draft.customer.trim() || !draft.dueDate) {
      this.taskDraftError.set('Title, customer, and due date are required.');
      return;
    }

    const task: OperationTask = {
      id: this.nextTaskId(),
      title: draft.title.trim(),
      owner: draft.owner,
      status: draft.status,
      priority: draft.priority,
      dueDate: draft.dueDate,
      customer: draft.customer.trim(),
      type: draft.type,
    };

    this.tasks.set(this.data.addTask(task));
    this.createTaskOpen.set(false);
    this.query.set('');
    this.owner.set('All');
    this.priority.set('All');
    this.showToast({ message: `${task.title} created`, tone: 'success' });
    if (this.route.snapshot.queryParamMap.get('createTask')) {
      void this.router.navigate([], { relativeTo: this.route, queryParams: { createTask: null }, queryParamsHandling: 'merge' });
    }
  }

  openTaskDrawer(task: WorkflowTask, event: Event): void {
    if (this.draggingTask()) {
      return;
    }

    this.lastFocusedTaskCard = event.currentTarget as HTMLElement | null;
    this.selectedTaskId.set(task.id);
    this.commentDraft.set('');
    this.drawerActionsOpen.set(false);
    window.setTimeout(() => this.drawerCloseButton()?.nativeElement.focus());
  }

  closeTaskDrawer(): void {
    this.selectedTaskId.set(null);
    this.commentDraft.set('');
    this.drawerActionsOpen.set(false);
    window.setTimeout(() => this.lastFocusedTaskCard?.focus());
  }

  @HostListener('document:keydown.escape')
  protected closeTaskDrawerOnEscape(): void {
    if (this.moveSheetTaskId() !== null) {
      this.closeMoveSheet();
      return;
    }

    if (this.selectedTaskId() !== null) {
      this.closeTaskDrawer();
    }
  }

  updateCommentDraft(value: string): void {
    this.commentDraft.set(value);
  }

  submitComment(task: WorkflowTask): void {
    const message = this.commentDraft().trim();
    if (!message) {
      return;
    }

    const currentDetails = this.taskDetails().get(task.id) ?? this.createFallbackTaskDetails(task);
    const nextDetails: TaskDetailRecord = {
      ...currentDetails,
      comments: [
        ...currentDetails.comments,
        {
          author: 'You',
          initials: 'Y',
          time: 'Just now',
          message,
        },
      ],
      timeline: [
        ...currentDetails.timeline,
        {
          time: 'Just now',
          title: 'Comment added',
          detail: message,
        },
      ],
    };

    this.taskDetails.update((details) => {
      const next = new Map(details);
      next.set(task.id, nextDetails);
      return next;
    });
    this.writeTaskDetails();
    this.commentDraft.set('');
    window.setTimeout(() => this.taskCommentInput()?.nativeElement.focus());
  }

  submitCommentOnEnter(event: KeyboardEvent, task: WorkflowTask): void {
    if (event.key !== 'Enter' || event.shiftKey) {
      return;
    }

    event.preventDefault();
    this.submitComment(task);
  }


  @HostListener('window:resize')
  protected syncMobileWorkflowBreakpoint(): void {
    this.isMobileWorkflow.set(window.innerWidth <= 1080);
  }

  @HostListener('document:click', ['$event'])
  protected closeMenusOnOutsideClick(event: MouseEvent): void {
    const target = event.target as HTMLElement | null;
    if (
      !target?.closest('.task-card') &&
      !target?.closest('.task-drawer__actions') &&
      !target?.closest('.drawer-actions-popover')
    ) {
      this.assignmentTaskId.set(null);
      this.actionsTaskId.set(null);
      this.drawerActionsOpen.set(false);
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

      return this.data.updateTasks([...otherTasks, ...reordered, ...remainingInStatus]);
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

  private nextTaskId(): number {
    return Math.max(...this.tasks().map((task) => task.id), 0) + 1;
  }

  readonly deletedTask = signal<WorkflowTask | null>(null);

  restoreDeletedTask(): void {
    const task = this.deletedTask();
    if (!task) {
      return;
    }

    const { isOverdue, isUrgent, update, detail, blockedReason, ...restoredTask } = task;
    this.tasks.set(this.data.addTask(restoredTask));
    this.deletedTask.set(null);
    this.showToast({ message: `${task.title} restored`, tone: 'success' });
  }

  dismissToast(): void {
    if (this.toast()?.tone === 'danger') {
      this.deletedTask.set(null);
    }
    this.toast.set(null);
  }

  private showToast(toast: TaskToast): void {
    this.toast.set(toast);
    window.setTimeout(() => {
      if (this.toast() === toast) {
        this.toast.set(null);
        if (toast.tone === 'danger') {
          this.deletedTask.set(null);
        }
      }
    }, 3200);
  }

  private localToday(): string {
    const today = new Date();
    const local = new Date(today.getTime() - today.getTimezoneOffset() * 60_000);
    return local.toISOString().slice(0, 10);
  }

  private localMidnight(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  private createTaskDraft(): TaskDraft {
    return {
      title: '',
      owner: 'Avery',
      status: 'Queued',
      priority: 'Medium',
      dueDate: this.localToday(),
      customer: '',
      type: 'Onboarding',
    };
  }

  private setBodyScrollLock(locked: boolean): void {
    if (locked) {
      if (document.body.classList.contains('is-task-drawer-open')) {
        return;
      }

      this.lockedScrollY = window.scrollY;
      document.body.classList.add('is-task-drawer-open');
      document.body.style.top = `-${this.lockedScrollY}px`;
      return;
    }

    if (!document.body.classList.contains('is-task-drawer-open')) {
      return;
    }

    document.body.classList.remove('is-task-drawer-open');
    document.body.style.top = '';
    this.restoreScrollPosition();
  }

  private createFallbackTaskDetails(task: WorkflowTask): TaskDetailRecord {
    return {
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
  }

  private readTaskDetails(): Map<number, TaskDetailRecord> {
    try {
      const raw = sessionStorage.getItem(this.taskDetailsKey);
      const parsed: unknown = raw ? JSON.parse(raw) : null;
      if (!Array.isArray(parsed)) {
        return new Map(this.initialTaskDetails);
      }

      const details = new Map<number, TaskDetailRecord>();
      for (const entry of parsed) {
        if (!this.isStoredTaskDetailEntry(entry)) {
          return new Map(this.initialTaskDetails);
        }
        details.set(entry[0], entry[1]);
      }
      return details;
    } catch {
      return new Map(this.initialTaskDetails);
    }
  }

  private writeTaskDetails(): void {
    try {
      sessionStorage.setItem(this.taskDetailsKey, JSON.stringify([...this.taskDetails().entries()]));
    } catch {
      // Session persistence is best-effort for local mock data.
    }
  }

  private isStoredTaskDetailEntry(value: unknown): value is [number, TaskDetailRecord] {
    if (!Array.isArray(value) || value.length !== 2 || typeof value[0] !== 'number') {
      return false;
    }

    const detail = value[1] as Partial<TaskDetailRecord> | null;
    return !!detail && Array.isArray(detail.timeline) && Array.isArray(detail.comments) && !!detail.account && Array.isArray(detail.resources);
  }

  private restoreScrollPosition(): void {
    const previousScrollBehavior = document.documentElement.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = 'auto';
    window.scrollTo({ top: this.lockedScrollY, behavior: 'auto' });
    window.requestAnimationFrame(() => {
      document.documentElement.style.scrollBehavior = previousScrollBehavior;
    });
  }
}
