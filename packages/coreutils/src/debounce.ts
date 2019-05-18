import { PromiseDelegate } from '@phosphor/coreutils';

// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

/**
 * Returns a debounced function that can be called multiple times safely and
 * only executes the underlying function once per `interval`.
 *
 * @param fn - The function to debounce.
 *
 * @param interval - The debounce interval; defaults to 500ms.
 */
export function debounce<T>(
  fn: () => T | Promise<T>,
  interval = 500
): () => Promise<T> {
  let debouncer = 0;
  return () => {
    const delegate = new PromiseDelegate<T>();
    clearTimeout(debouncer);
    debouncer = setTimeout(async () => {
      delegate.resolve(await fn());
    }, interval);
    return delegate.promise;
  };
}
