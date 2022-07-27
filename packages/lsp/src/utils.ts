// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ReadonlyJSONObject, ReadonlyJSONValue } from '@lumino/coreutils';
import mergeWith from 'lodash.mergewith';

/**
 * Helper to wait for timeout.
 *
 * @param  timeout - time out in ms
 */
export async function sleep(timeout: number): Promise<void> {
  return new Promise<void>(resolve => {
    setTimeout(() => {
      resolve();
    }, timeout);
  });
}

/**
 * Wait for an event by pooling the `isReady` function.
 */
export function untilReady(
  isReady: CallableFunction,
  maxRetrials: number = 35,
  interval = 50,
  intervalModifier = (i: number) => i
): Promise<CallableFunction> {
  return (async () => {
    let i = 0;
    while (isReady() !== true) {
      i += 1;
      if (maxRetrials !== -1 && i > maxRetrials) {
        throw Error('Too many retrials');
      }
      interval = intervalModifier(interval);
      await sleep(interval);
    }
    return isReady;
  })();
}

/**
 * Convert dotted path into dictionary.
 */
export function expandDottedPaths(obj: ReadonlyJSONObject): ReadonlyJSONObject {
  const settings: any = [];
  for (let key in obj) {
    const parsed = expandPath(key.split('.'), obj[key]);
    settings.push(parsed);
  }
  return mergeWith({}, ...settings);
}

/**
 * The docs for many language servers show settings in the
 * VSCode format, e.g.: "pyls.plugins.pyflakes.enabled"
 *
 * VSCode converts that dot notation to JSON behind the scenes,
 * as the language servers themselves don't accept that syntax.
 */
export const expandPath = (
  path: string[],
  value: ReadonlyJSONValue
): ReadonlyJSONObject => {
  const obj: any = Object.create(null);

  let curr = obj;
  path.forEach((prop: string, i: any) => {
    curr[prop] = Object.create(null);

    if (i === path.length - 1) {
      curr[prop] = value;
    } else {
      curr = curr[prop];
    }
  });

  return obj;
};

/**
 * An extended map which will create value for key on the fly.
 */
export class DefaultMap<K, V> extends Map<K, V> {
  constructor(
    private defaultFactory: (...args: any[]) => V,
    entries?: ReadonlyArray<readonly [K, V]> | null
  ) {
    super(entries);
  }

  get(k: K): V {
    return this.getOrCreate(k);
  }

  getOrCreate(k: K, ...args: any[]): V {
    if (this.has(k)) {
      return super.get(k)!;
    } else {
      let v = this.defaultFactory(k, ...args);
      this.set(k, v);
      return v;
    }
  }
}
