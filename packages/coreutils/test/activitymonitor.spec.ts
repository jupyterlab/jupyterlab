// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ActivityMonitor } from '@jupyterlab/coreutils';
import { sleep } from '@jupyterlab/coreutils/lib/testutils';
import { Signal } from '@lumino/signaling';

class TestObject {
  one = new Signal<TestObject, number>(this);

  two = new Signal<TestObject, string[]>(this);
}

describe('@jupyterlab/coreutils', () => {
  describe('ActivityMonitor()', () => {
    let testObj: TestObject;
    let signal: Signal<TestObject, number>;

    beforeEach(() => {
      testObj = new TestObject();
      signal = testObj.one;
    });

    describe('#constructor()', () => {
      it('should accept a signal', () => {
        const monitor = new ActivityMonitor<TestObject, number>({ signal });
        expect(monitor).toBeInstanceOf(ActivityMonitor);
      });

      it('should accept a timeout', () => {
        const monitor = new ActivityMonitor<TestObject, string[]>({
          signal: testObj.two,
          timeout: 100
        });
        expect(monitor).toBeInstanceOf(ActivityMonitor);
      });
    });

    describe('#activityStopped', () => {
      it('should be emitted after the signal has fired and a timeout', async () => {
        let called = false;
        const monitor = new ActivityMonitor({ signal, timeout: 100 });
        monitor.activityStopped.connect((sender, args) => {
          expect(sender).toBe(monitor);
          expect(args.sender).toBe(testObj);
          expect(args.args).toBe(10);
          called = true;
        });
        signal.emit(10);
        expect(called).toBe(false);
        await sleep(100);
        expect(called).toBe(true);
      });
    });

    describe('#timeout', () => {
      it('should default to `1000`', () => {
        const monitor = new ActivityMonitor<TestObject, number>({ signal });
        expect(monitor.timeout).toBe(1000);
      });

      it('should be set-able', () => {
        const monitor = new ActivityMonitor<TestObject, number>({ signal });
        monitor.timeout = 200;
        expect(monitor.timeout).toBe(200);
      });
    });

    describe('#isDisposed', () => {
      it('should test whether the monitor is disposed', () => {
        const monitor = new ActivityMonitor<TestObject, number>({ signal });
        expect(monitor.isDisposed).toBe(false);
        monitor.dispose();
        expect(monitor.isDisposed).toBe(true);
      });
    });

    describe('#dispose()', () => {
      it('should dispose of the resources used by the monitor', () => {
        const monitor = new ActivityMonitor<TestObject, number>({ signal });
        monitor.dispose();
        expect(monitor.isDisposed).toBe(true);
      });

      it('should be a no-op if called more than once', () => {
        const monitor = new ActivityMonitor<TestObject, number>({ signal });
        monitor.dispose();
        monitor.dispose();
        expect(monitor.isDisposed).toBe(true);
      });
    });
  });
});
