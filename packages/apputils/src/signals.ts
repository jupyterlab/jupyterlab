import { ISignal, Signal, Slot } from '@phosphor/signaling';

/**
 * WatchableSignal allows you to trigger custom behavior when the signal
 * switches from being active (having some slots connected) to inactive
 * (having no slots connected).
 */
export class WatchableSignal<SENDER, ARGS> extends Signal<SENDER, ARGS> {
  static fromSignal<SENDER, ARGS, NEW_ARGS>(
    signal: ISignal<SENDER, ARGS>,
    createSlot: (emit: (args: NEW_ARGS) => void) => Slot<SENDER, ARGS>
  ): WatchableSignal<null, NEW_ARGS> {
    const newSignal: WatchableSignal<null, NEW_ARGS> = new WatchableSignal(
      null,
      () => signal.connect(slot),
      () => signal.disconnect(slot)
    );
    const slot = createSlot(newSignal.emit.bind(newSignal));
    return newSignal;
  }
  constructor(sender: SENDER, onActive: () => void, onInActive: () => void) {
    super(sender);
    this._onActive = onActive;
    this._onInActive = onInActive;
  }

  connect(slot: Slot<SENDER, ARGS>, thisArg?: any): boolean {
    const connected = super.connect(
      slot,
      thisArg
    );
    if (connected) {
      this._changeConnections(true);
    }
    return connected;
  }

  disconnect(slot: Slot<SENDER, ARGS>, thisArg?: any): boolean {
    const disconnected = super.disconnect(slot, thisArg);
    if (disconnected) {
      this._changeConnections(false);
    }
    return disconnected;
  }

  private _changeConnections(increase: boolean) {
    if (increase) {
      if (this._connections == 0) {
        this._onActive();
      }
      this._connections += 1;
    }
    if (this._connections == 1) {
      this._onInActive();
    }
    this._connections -= 1;
  }

  private _connections = 0;
  private readonly _onActive: () => void;
  private readonly _onInActive: () => void;
}

/**
 * filter allows you to create a new signal based on an old one
 * by filtering the values for some predicate.
 *
 * It is based on RxJS `filter`
 * https://rxjs-dev.firebaseapp.com/api/operators/filter
 *
 * @param signal Initial signal to connect to.
 * @param predicate Predicate on signal values.
 * @returns The new signal.
 */
export function filterSignal<SENDER, ARGS>(
  signal: ISignal<SENDER, ARGS>,
  filter: (sender: SENDER, args: ARGS) => boolean
): Signal<null, [SENDER, ARGS]> {
  return WatchableSignal.fromSignal(signal, emit => (sender, args) => {
    if (filter(sender, args)) {
      emit([sender, args]);
    }
  });
}

/**
 * map allows you to create a new signal based on an old one, by applying a function
 * to each (sender, args) pair that comes out of the old signal.
 *
 * It is based on RxJS `map`
 * https://rxjs-dev.firebaseapp.com/api/operators/map
 *
 * @param signal Initial signal to connect to.
 * @param project Mapping from signal values to new values.
 * @returns the new signal.
 */
export function mapSignal<SENDER, ARGS, NEW_ARGS>(
  signal: ISignal<SENDER, ARGS>,
  project: (sender: SENDER, args: ARGS) => NEW_ARGS
): Signal<null, NEW_ARGS> {
  return WatchableSignal.fromSignal(signal, emit => (sender, args) => {
    emit(project(sender, args));
  });
}

/**
 * switchMap allows you to take a Signal and map each value that comes out of it
 * to another signal. It returns a new aggregate signal that contains all the mapped values.
 *
 * It is modeled after the `switchMap` RxJS operator
 * https://rxjs-dev.firebaseapp.com/api/operators/switchMap
 *
 * @param signal Initial signal that will be connected to.
 * @param project Mapping from the values in this signal to a new signal.
 * @returns The new signal.
 */
export function switchMapSignal<SENDER, ARGS, NEW_SENDER, NEW_ARGS>(
  signal: ISignal<SENDER, ARGS>,
  project: (sender: SENDER, args: ARGS) => ISignal<NEW_SENDER, NEW_ARGS>
): Signal<null, [NEW_SENDER, NEW_ARGS]> {
  return WatchableSignal.fromSignal(signal, emit => {
    // Save last innerSignal so we can discconect from it when we get a new one.
    let innerSignal: ISignal<NEW_SENDER, NEW_ARGS>;
    function slot(new_sender: NEW_SENDER, new_args: NEW_ARGS) {
      emit([new_sender, new_args]);
    }
    return (sender, args) => {
      if (innerSignal) {
        innerSignal.disconnect(slot);
      }
      innerSignal = project(sender, args);
      innerSignal.connect(slot);
    };
  });
}

export function mergeSignals<SENDER, ARGS>(
  signalL: ISignal<SENDER, ARGS>,
  signalR: ISignal<SENDER, ARGS>
): Signal<null, [NEW_SENDER, NEW_ARGS]> {
  return WatchableSignal.fromSignal(signal, emit => {
    // Save last innerSignal so we can discconect from it when we get a new one.
    let innerSignal: ISignal<NEW_SENDER, NEW_ARGS>;
    function slot(new_sender: NEW_SENDER, new_args: NEW_ARGS) {
      emit([new_sender, new_args]);
    }
    return (sender, args) => {
      if (innerSignal) {
        innerSignal.disconnect(slot);
      }
      innerSignal = project(sender, args);
      innerSignal.connect(slot);
    };
  });
}
