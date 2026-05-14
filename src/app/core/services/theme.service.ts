import { DOCUMENT } from '@angular/common';
import { Injectable, effect, inject, signal } from '@angular/core';

export type ThemeMode = 'dark' | 'light';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  readonly mode = signal<ThemeMode>(this.readInitialTheme());

  constructor() {
    effect(() => {
      const mode = this.mode();
      this.document.documentElement.dataset['theme'] = mode;
      this.storage()?.setItem('operations-dashboard-theme', mode);
    });
  }

  toggle(): void {
    this.mode.update((mode) => (mode === 'dark' ? 'light' : 'dark'));
  }

  private readInitialTheme(): ThemeMode {
    const stored = this.storage()?.getItem('operations-dashboard-theme');
    return stored === 'light' ? 'light' : 'dark';
  }

  private storage(): Storage | null {
    const storage = this.document.defaultView?.localStorage;
    return storage && typeof storage.getItem === 'function' && typeof storage.setItem === 'function' ? storage : null;
  }
}
