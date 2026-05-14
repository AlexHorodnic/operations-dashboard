import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-drawer',
  template: `
    @if (open()) {
      <div class="drawer-backdrop" (click)="closed.emit()" aria-hidden="true"></div>
      <aside class="drawer" role="dialog" aria-modal="true" [attr.aria-label]="title()">
        <header class="drawer__header">
          <div>
            <span>{{ eyebrow() }}</span>
            <h2>{{ title() }}</h2>
          </div>
          <button class="icon-button" type="button" aria-label="Close drawer" (click)="closed.emit()">x</button>
        </header>
        <div class="drawer__body">
          <ng-content />
        </div>
      </aside>
    }
  `,
})
export class Drawer {
  readonly open = input(false);
  readonly title = input('Details');
  readonly eyebrow = input('Record');
  readonly closed = output<void>();
}
