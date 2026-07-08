// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { LruCache } from '@jupyterlab/coreutils';

describe('@jupyterlab/coreutils', () => {
  describe('LruCache()', () => {
    describe('#constructor()', () => {
      it('should treat maxSize 0 as the default', () => {
        const cache = new LruCache<number, number>({ maxSize: 0 });

        for (let i = 0; i < 129; i++) {
          cache.set(i, i);
        }

        expect(cache.size).toBe(128);
        expect(cache.get(0)).toBeNull();
        expect(cache.get(1)).toBe(1);
      });

      it('should reject negative maxSize values', () => {
        expect(() => new LruCache({ maxSize: -1 })).toThrow(
          'maxSize must be at least 1'
        );
      });
    });
  });
});
