import { Component, input } from '@angular/core';

@Component({
  selector: 'app-badge',
  template: `<span class="badge" [class]="'badge badge--' + tone()"><ng-content /></span>`,
})
export class Badge {
  readonly tone = input<'success' | 'warning' | 'danger' | 'neutral' | 'accent'>('neutral');
}
