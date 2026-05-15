import { Component, ElementRef, HostListener, effect, input, output, viewChild } from '@angular/core';
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
          <button #drawerCloseButton class="icon-button" type="button" aria-label="Close drawer" (click)="closed.emit()">
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
  private readonly closeButton = viewChild<ElementRef<HTMLButtonElement>>('drawerCloseButton');
  private previouslyFocusedElement: HTMLElement | null = null;
  readonly open = input(false);
  readonly title = input('Details');
  readonly eyebrow = input('Record');
  readonly closed = output<void>();

  constructor() {
    effect(() => {
      if (this.open()) {
        this.previouslyFocusedElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        queueMicrotask(() => this.closeButton()?.nativeElement.focus());
        return;
      }

      if (this.previouslyFocusedElement) {
        const element = this.previouslyFocusedElement;
        this.previouslyFocusedElement = null;
        queueMicrotask(() => element.focus());
      }
    });
  }

  @HostListener('document:keydown.escape')
  protected closeOnEscape(): void {
    if (this.open()) {
      this.closed.emit();
    }
  }
}
