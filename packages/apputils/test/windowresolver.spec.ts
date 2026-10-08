// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { WindowResolver } from '@jupyterlab/apputils';

describe('WindowResolver', () => {
  it('should resolve when local storage is unavailable', async () => {
    const descriptor = Object.getOwnPropertyDescriptor(window, 'localStorage');
    if (!descriptor) {
      throw new Error('window.localStorage is not configurable');
    }

    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get: () => {
        throw new DOMException('Access denied', 'SecurityError');
      }
    });

    try {
      const resolver = new WindowResolver();
      await resolver.resolve('default');
      expect(resolver.name).toBe('default');
    } finally {
      Object.defineProperty(window, 'localStorage', descriptor);
    }
  });
});
