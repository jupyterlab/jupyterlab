/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import {
  IObservableJSON,
  IObservableList,
  IObservableString
} from '@jupyterlab/observables';

import * as Y from 'yjs';

import * as nbmodel from './api';

/**
 * Changes on Sequence-like data are expressed as Quill-inspired deltas.
 *
 * @source https://quilljs.com/docs/delta/
 */
export type Delta<T> = Array<{ insert?: T; delete?: number; retain?: number }>;

/**
 * @deprecated
 */
export function asJsonChange(
  cellChange: nbmodel.MapChange
): IObservableJSON.IChangedArgs[] {
  throw new Error('Method not implemented.');
}

/**
 * @deprecated
 */
export function asStringChange(
  delta: Delta<string>
): IObservableString.IChangedArgs[] {
  throw new Error('Method not implemented.');
}

/**
 * @deprecated
 */
export function asListChange(
  delta: Delta<Array<any>>
): IObservableList.IChangedArgs<any>[] {
  throw new Error('Method not implemented.');
}

export function convertYMapEventToMapChange(
  event: Y.YMapEvent<any>
): nbmodel.MapChange {
  let changes = new Map();
  event.changes.keys.forEach((event, key) => {
    changes.set(key, {
      action: event.action,
      oldValue: event.oldValue,
      newValue: this.ymeta.get(key)
    });
  });
  return changes;
}

/**
 * Creates a mutual exclude function with the following property:
 *
 * ```js
 * const mutex = createMutex()
 * mutex(() => {
 *   // This function is immediately executed
 *   mutex(() => {
 *     // This function is not executed, as the mutex is already active.
 *   })
 * })
 * ```
 */
export const createMutex = (): ((f: () => void) => void) => {
  let token = true;
  return (f: any): void => {
    if (token) {
      token = false;
      try {
        f();
      } finally {
        token = true;
      }
    }
  };
};
