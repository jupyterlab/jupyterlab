/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { PromiseDelegate } from '@lumino/coreutils';
import { ISignal } from '@lumino/signaling';

/**
 * Convert a signal into a promise for the first emitted value.
 *
 * @param signal - The signal we are listening to.
 * @param timeout - Timeout to wait for signal in ms (not timeout if not defined or 0)
 *
 * @returns a Promise that resolves with a `(sender, args)` pair.
 */
export function signalToPromise<T, U>(
  signal: ISignal<T, U>,
  timeout?: number
): Promise<[T, U]> {
  const waitForSignal = new PromiseDelegate<[T, U]>();

  function cleanup() {
    signal.disconnect(slot);
  }

  function slot(sender: T, args: U) {
    cleanup();
    waitForSignal.resolve([sender, args]);
  }
  signal.connect(slot);

  if ((timeout ?? 0) > 0) {
    setTimeout(() => {
      cleanup();
      waitForSignal.reject(`Signal not emitted within ${timeout} ms.`);
    }, timeout);
  }
  return waitForSignal.promise;
}
