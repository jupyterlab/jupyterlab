// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { signalToPromise } from '@jupyterlab/coreutils';
import { Signal } from '@lumino/signaling';

class TestObject {
  changed = new Signal<TestObject, number>(this);
}

describe('@jupyterlab/coreutils', () => {
  describe('signalToPromise()', () => {
    it('should resolve when the signal emits and clear the timeout timer', async () => {
      jest.useFakeTimers();
      try {
        const obj = new TestObject();
        const promise = signalToPromise(obj.changed, 1000);
        expect(jest.getTimerCount()).toBe(1);

        obj.changed.emit(42);
        const [sender, value] = await promise;

        expect(sender).toBe(obj);
        expect(value).toBe(42);
        expect(jest.getTimerCount()).toBe(0);
      } finally {
        jest.useRealTimers();
      }
    });

    it('should reject when the timeout expires before the signal emits', async () => {
      jest.useFakeTimers();
      try {
        const obj = new TestObject();
        const promise = signalToPromise(obj.changed, 100);

        jest.advanceTimersByTime(100);
        await expect(promise).rejects.toBe('Signal not emitted within 100 ms.');
        expect(jest.getTimerCount()).toBe(0);
      } finally {
        jest.useRealTimers();
      }
    });
  });
});
