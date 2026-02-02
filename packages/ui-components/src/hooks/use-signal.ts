import React from 'react';
import type { ISignal } from '@lumino/signaling';

type Maybe<T> = T | null | undefined;

export type SignalEvent<TSender, TArgs> = {
  sender: TSender;
  args: TArgs;
};

/**
 * Subscribes to a Lumino `ISignal` using React's `useSyncExternalStore`.
 *
 * This hook captures the most recent signal emission `{ sender, args }` and
 * passes it to `getSnapshot` so you can derive state from the event payload.
 *
 * `getSnapshot` is called during render and **must be pure**. It will only be
 * invoked after the signal has emitted at least once.
 *
 * `getInitialSnapshot` is called during render to provide the initial value
 * **before the first signal emission** (and whenever no event has been observed
 * yet). It must also be pure.
 *
 * @example
 * // Track the current JupyterLab theme (dark/light mode)
 * const theme = useSignal(
 *   themeManager.themeChanged,
 *   event => event?.sender.theme ?? 'JupyterLab Light',
 *   () => themeManager.theme ?? 'JupyterLab Light'
 * );
 *
 * @param signal - The Lumino signal to subscribe to.
 * @param getSnapshot - Computes the current snapshot from the latest observed
 *   signal emission `{ sender, args }`.
 * @param getInitialSnapshot - Computes the initial snapshot value before any
 *   signal emission has occurred.
 * @param keys - Additional dependencies which force re-subscription when changed
 *   (e.g., notebook id, cell id, file path, etc.).
 * @returns The current snapshot value, updated whenever the signal fires.
 */
export function useSignal<TSender, TArgs, TSnapshot>(
  signal: Maybe<ISignal<TSender, TArgs>>,
  getSnapshot: (evt: SignalEvent<TSender, TArgs>) => TSnapshot,
  getInitialSnapshot: () => TSnapshot,
  keys: React.DependencyList = []
): TSnapshot {
  const lastEventRef = React.useRef<SignalEvent<TSender, TArgs> | null>(null);

  const subscribe = React.useCallback(
    (onStoreChange: () => void) => {
      if (!signal) return () => {};

      const slot = (sender: TSender, args: TArgs) => {
        lastEventRef.current = { sender, args };
        onStoreChange();
      };

      signal.connect(slot);
      return () => {
        signal.disconnect(slot);
      };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [signal, ...keys]
  );

  const readSnapshot = React.useCallback(() => {
    const evt = lastEventRef.current;
    return evt ? getSnapshot(evt) : getInitialSnapshot();
  }, [getSnapshot, getInitialSnapshot]);

  return React.useSyncExternalStore(subscribe, readSnapshot, readSnapshot);
}
