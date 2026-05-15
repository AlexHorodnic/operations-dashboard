import { Component, input, output } from '@angular/core';
import { LucideAngularModule, X } from 'lucide-angular';

@Component({
  selector: 'app-drawer',
  imports: [LucideAngularModule],
  template: `
    @if (open()) {
      <div class="drawer-backdrop" (click)="closed.emit()" aria-hidden="true"></div>
      <aside class="drawer" role="dialog" aria-modal="true" [attr.aria-label]="title()">
        <header class="drawer__header">
          <div>
            <span>{{ eyebrow() }}</span>
            <h2>{{ title() }}</h2>
          </div>
          <button class="icon-button" type="button" aria-label="Close drawer" (click)="closed.emit()">
            <lucide-icon [img]="X" size="14" aria-hidden="true"></lucide-icon>
          </button>
        </header>
        <div class="drawer__body">
          <ng-content />
        </div>
      </aside>
    }
  `,
})
export class Drawer {
  protected readonly X = X;
  readonly open = input(false);
  readonly title = input('Details');
  readonly eyebrow = input('Record');
  readonly closed = output<void>();
}
