import { Type } from '@angular/core';

import { routes } from './app.routes';

describe('application routes', () => {
  const featurePaths = ['overview', 'accounts', 'workflow', 'analytics'];

  it('lazy-loads every route-level feature', () => {
    for (const path of featurePaths) {
      const route = routes.find((candidate) => candidate.path === path);

      expect(route?.component).toBeUndefined();
      expect(route?.loadComponent).toBeTypeOf('function');
    }
  });

  it('resolves every lazy component', async () => {
    const resolved = await Promise.all(
      featurePaths.map((path) => {
        const route = routes.find((candidate) => candidate.path === path);
        const loadComponent = route?.loadComponent as (() => Promise<Type<unknown>>) | undefined;
        return loadComponent?.();
      }),
    );

    expect(resolved).toHaveLength(featurePaths.length);
    expect(resolved.every((component) => typeof component === 'function')).toBe(true);
  });
});
