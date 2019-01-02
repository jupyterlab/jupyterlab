import { ISignal } from '@phosphor/signaling';

export class AsyncIteratorSignal<T, V> implements AsyncIterator<[T, V]> {
  constructor(private signal: ISignal<T, V>) {
    signal.connect(
      this.slot,
      this
    );
  }

  slot(sender: T, args: V) {
    const resolveNext = this.resolveNexts.shift();
    if (this.isDone) {
      // if we have finished, see if we have fulfilled the last value we need.
      this.tryDisconnecting();
    }
    const value: IteratorResult<[T, V]> = {
      done: false,
      value: [sender, args]
    };
    if (resolveNext === undefined) {
      this.values.push(value);
    } else {
      resolveNext(value);
    }
  }

  next(): Promise<IteratorResult<[T, V]>> {
    if (this.isDone) {
      return AsyncIteratorSignal.doneValue;
    }
    const value = this.values.shift();
    if (value !== undefined) {
      return Promise.resolve(value);
    }

    return new Promise((resolve, reject) => {
      this.resolveNexts.push(resolve);
    });
  }

  return(): Promise<IteratorResult<[T, V]>> {
    // cleanup data
    this.values = [];
    this.tryDisconnecting();

    // set done so `next()` returns done
    this.isDone = true;

    return AsyncIteratorSignal.doneValue;
  }

  /**
   * If we have no more values to resolve, disconnect the signal.
   */
  private tryDisconnecting() {
    if (this.resolveNexts.length === 0) {
      this.signal.disconnect(this.slot, this);
    }
  }

  private isDone = false;
  private static doneValue: Promise<IteratorResult<any>> = Promise.resolve({
    done: true,
    value: undefined
  });
  private values: Array<IteratorResult<[T, V]>> = [];
  private resolveNexts: Array<(res: IteratorResult<[T, V]>) => void> = [];
}

/**
 * async function logSignal<T, V>(s: ISignal<T, V>) {
 *   for await (const i of new AsyncIterableSignal(s)) {
 *     console.log(i);
 *   }
 *   }
 */
export class AsyncIterableSignal<T, V> implements AsyncIterable<[T, V]> {
  constructor(private signal: ISignal<T, V>) {}
  [Symbol.asyncIterator](): AsyncIterator<[T, V]> {
    return new AsyncIteratorSignal(this.signal);
  }
}

// /**
//  * filter allows you to create a new signal based on an old one
//  * by filtering the values for some predicate.
//  *
//  * It is based on RxJS `filter`
//  * https://rxjs-dev.firebaseapp.com/api/operators/filter
//  *
//  * @param signal Initial signal to connect to.
//  * @param predicate Predicate on signal values.
//  * @returns The new signal.
//  */
// export function filterSignal<SENDER, ARGS>(
//   signal: ISignal<SENDER, ARGS>,
//   filter: (sender: SENDER, args: ARGS) => boolean
// ): Signal<null, [SENDER, ARGS]> {
//   return WatchableSignal.fromSignal(signal, emit => (sender, args) => {
//     if (filter(sender, args)) {
//       emit([sender, args]);
//     }
//   });
// }

// /**
//  * map allows you to create a new signal based on an old one, by applying a function
//  * to each (sender, args) pair that comes out of the old signal.
//  *
//  * It is based on RxJS `map`
//  * https://rxjs-dev.firebaseapp.com/api/operators/map
//  *
//  * @param signal Initial signal to connect to.
//  * @param project Mapping from signal values to new values.
//  * @returns the new signal.
//  */
// export function mapSignal<SENDER, ARGS, NEW_ARGS>(
//   signal: ISignal<SENDER, ARGS>,
//   project: (sender: SENDER, args: ARGS) => NEW_ARGS
// ): Signal<null, NEW_ARGS> {
//   return WatchableSignal.fromSignal(signal, emit => (sender, args) => {
//     emit(project(sender, args));
//   });
// }

// /**
//  * switchMap allows you to take a Signal and map each value that comes out of it
//  * to another signal. It returns a new aggregate signal that contains all the mapped values.
//  *
//  * It is modeled after the `switchMap` RxJS operator
//  * https://rxjs-dev.firebaseapp.com/api/operators/switchMap
//  *
//  * @param signal Initial signal that will be connected to.
//  * @param project Mapping from the values in this signal to a new signal.
//  * @returns The new signal.
//  */
// export function switchMapSignal<SENDER, ARGS, NEW_SENDER, NEW_ARGS>(
//   signal: ISignal<SENDER, ARGS>,
//   project: (sender: SENDER, args: ARGS) => ISignal<NEW_SENDER, NEW_ARGS>
// ): Signal<null, [NEW_SENDER, NEW_ARGS]> {
//   return WatchableSignal.fromSignal(signal, emit => {
//     // Save last innerSignal so we can discconect from it when we get a new one.
//     let innerSignal: ISignal<NEW_SENDER, NEW_ARGS>;
//     function slot(new_sender: NEW_SENDER, new_args: NEW_ARGS) {
//       emit([new_sender, new_args]);
//     }
//     return (sender, args) => {
//       if (innerSignal) {
//         innerSignal.disconnect(slot);
//       }
//       innerSignal = project(sender, args);
//       innerSignal.connect(slot);
//     };
//   });
// }

// export function mergeSignals<SENDER, ARGS>(
//   signalL: ISignal<SENDER, ARGS>,
//   signalR: ISignal<SENDER, ARGS>
// ): Signal<null, [NEW_SENDER, NEW_ARGS]> {
//   return WatchableSignal.fromSignal(signal, emit => {
//     // Save last innerSignal so we can discconect from it when we get a new one.
//     let innerSignal: ISignal<NEW_SENDER, NEW_ARGS>;
//     function slot(new_sender: NEW_SENDER, new_args: NEW_ARGS) {
//       emit([new_sender, new_args]);
//     }
//     return (sender, args) => {
//       if (innerSignal) {
//         innerSignal.disconnect(slot);
//       }
//       innerSignal = project(sender, args);
//       innerSignal.connect(slot);
//     };
//   });
// }
