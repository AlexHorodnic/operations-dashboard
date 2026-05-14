import { Component, input } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  template: `
    <div class="state-card">
      <div class="state-card__icon">{{ icon() }}</div>
      <h3>{{ title() }}</h3>
      <p>{{ message() }}</p>
    </div>
  `,
})
export class EmptyState {
  readonly icon = input('No data');
  readonly title = input.required<string>();
  readonly message = input.required<string>();
}
