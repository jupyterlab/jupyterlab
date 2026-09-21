// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { LruCache } from '@jupyterlab/coreutils';

describe('@jupyterlab/coreutils', () => {
  describe('LruCache()', () => {
    describe('#set()', () => {
      it('should replace a key without evicting another', () => {
        const cache = new LruCache<string, number>({ maxSize: 3 });
        cache.set('a', 1);
        cache.set('b', 2);
        cache.set('c', 3);

        cache.set('b', 20);

        expect(cache.size).toBe(3);
        expect(cache.get('a')).toBe(1);
        expect(cache.get('b')).toBe(20);
      });

      it('should count replacing a key as using it', () => {
        const cache = new LruCache<string, number>({ maxSize: 3 });
        cache.set('a', 1);
        cache.set('b', 2);
        cache.set('c', 3);

        cache.set('b', 20);
        cache.set('d', 4);
        cache.set('e', 5);

        expect(cache.get('b')).toBe(20);
        expect(cache.get('a')).toBeNull();
      });
    });
  });
});
