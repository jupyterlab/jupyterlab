// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

// Test helpers

/**
 * Return a promise that resolves in the given milliseconds with the given value.
 */
export function sleep(milliseconds?: number): Promise<void>;
export function sleep<T>(milliseconds: number, value: T): Promise<T>;
export function sleep<T>(
  milliseconds: number = 0,
  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  value?: any
): Promise<T> | Promise<void> {
  return new Promise<T>((resolve, reject) => {
    setTimeout(() => {
      resolve(value);
    }, milliseconds);
  });
}
