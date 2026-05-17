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
  value?: T
): Promise<T> | Promise<void> {
  if (arguments.length < 2) {
    return new Promise<void>(resolve => {
      setTimeout(() => {
        resolve();
      }, milliseconds);
    });
  }

  return new Promise<T>(resolve => {
    setTimeout(() => {
      resolve(value as T);
    }, milliseconds);
  });
}
