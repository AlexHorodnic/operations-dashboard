import { Component, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

interface CommandAction {
  label: string;
  hint: string;
  route?: string;
}

@Component({
  selector: 'app-command-palette',
  imports: [FormsModule],
  template: `
    @if (open()) {
      <div class="command-backdrop" (click)="closed.emit()" aria-hidden="true"></div>
      <section class="command-palette" role="dialog" aria-modal="true" aria-label="Command palette">
        <label>
          <span>/</span>
          <input
            type="search"
            placeholder="Search actions, accounts, and reports"
            [ngModel]="query()"
            (ngModelChange)="query.set($event)"
            autofocus
          />
        </label>
        <div class="command-list">
          @for (action of filteredActions(); track action.label) {
            <button type="button" (click)="run(action)">
              <strong>{{ action.label }}</strong>
              <span>{{ action.hint }}</span>
            </button>
          } @empty {
            <p>No matching actions</p>
          }
        </div>
      </section>
    }
  `,
})
export class CommandPalette {
  private readonly router = inject(Router);
  readonly open = input(false);
  readonly closed = output<void>();
  readonly query = signal('');

  private readonly actions: CommandAction[] = [
    { label: 'Open Accounts', hint: 'Go to account management', route: '/customers' },
    { label: 'Open Workflow Queue', hint: 'Review active operational work', route: '/tasks' },
    { label: 'Open Analytics', hint: 'View revenue and conversion trends', route: '/analytics' },
    { label: 'Open Overview', hint: 'Return to operating snapshot', route: '/overview' },
    { label: 'Create Task', hint: 'Prepare a new workflow item', route: '/tasks?createTask=1' },
  ];

  readonly filteredActions = computed(() => {
    const query = this.query().trim().toLowerCase();
    if (!query) {
      return this.actions;
    }

    return this.actions.filter((action) => `${action.label} ${action.hint}`.toLowerCase().includes(query));
  });

  run(action: CommandAction): void {
    if (action.route) {
      void this.router.navigateByUrl(action.route);
    }
    this.query.set('');
    this.closed.emit();
  }
}
