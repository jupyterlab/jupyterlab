// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  ISignal, Signal
} from '@phosphor/signaling';

import {
  ActivityMonitor
} from '@jupyterlab/coreutils';



class TestObject {
  one = new Signal<TestObject, number>(this);

  two = new Signal<TestObject, string[]>(this);
}


describe('coreutils', () => {

  describe('ActivityMonitor()', () => {

    let testObj: TestObject;
    let signal: Signal<TestObject, number>;

    beforeEach(() => {
      testObj = new TestObject();
      signal = testObj.one;
    });

    describe('#constructor()', () => {

      it('should accept a signal', () => {
        let monitor = new ActivityMonitor<TestObject, number>({ signal });
        expect(monitor).to.be.an(ActivityMonitor);
      });

      it('should accept a timeout', () => {
        let monitor = new ActivityMonitor<TestObject, string[]>({
          signal: testObj.two, timeout: 100
        });
        expect(monitor).to.be.an(ActivityMonitor);
      });

    });

    describe('#activityStopped', () => {

      it('should be emitted after the signal has fired and a timeout', (done) => {
        let called = false;
        let monitor = new ActivityMonitor({ signal, timeout: 100 });
        monitor.activityStopped.connect((sender, args) => {
          expect(sender).to.be(monitor);
          expect(args.sender).to.be(testObj);
          expect(args.args).to.be(10);
          called = true;
        });
        signal.emit(10);
        expect(called).to.be(false);
        setTimeout(() => {
          expect(called).to.be(true);
          done();
        }, 100);
      });

      it('should collapse during activity', (done) => {
        let called = false;
        let timeout = 300;
        let emission = -1;
        let monitor = new ActivityMonitor<TestObject, number>({ signal, timeout });

        monitor.activityStopped.connect((sender, args) => {
          emission = args.args;
          called = true;
          expect(sender).to.be(monitor);
          expect(args.sender).to.be(testObj);
        });


        let firstEmission = 5;
        let secondEmission = 10;
        let start = 0; // The start time in ms for each signal emitted.

        let thirdPass = () => {
          let now = (new Date()).getTime();
          let delta = now - start;
          if (delta > timeout) {
            expect(called).to.be(true);
            expect(emission).to.be(secondEmission);
            done();
            return;
          }
          throw new Error('Time traveled in the wrong direction!');
        };

        let secondPass = () => {
          let now = (new Date()).getTime();
          let delta = now - start;
          if (delta > timeout) {
            expect(called).to.be(true);
            expect(emission).to.be(secondEmission);
            done();
            return;
          }
          setTimeout(thirdPass, timeout);
        };

        let firstPass = () => {
          let now = (new Date()).getTime();
          let delta = now - start;
          if (delta > timeout) {
            expect(called).to.be(true);
            expect(emission).to.be(firstEmission);
            done();
            return;
          }
          signal.emit(secondEmission);
          // Restart the clock.
          start = (new Date()).getTime();
          setTimeout(secondPass, timeout - 100);
        };

        // The timing of setTimeout is *not* guaranteed and on overburdened
        // systems, it can take longer than intended, so each pass must check
        // the actual time elapsed if timing is an inherent part of its behavior
        // as it is in this test.
        signal.emit(firstEmission);
        expect(called).to.be(false);

        // Start the clock.
        start = (new Date()).getTime();
        setTimeout(firstPass, timeout - 100);
      });

    });

    describe('#timeout', () => {

      it('should default to `1000`', () => {
        let monitor = new ActivityMonitor<TestObject, number>({ signal });
        expect(monitor.timeout).to.be(1000);
      });

      it('should be set-able', () => {
        let monitor = new ActivityMonitor<TestObject, number>({ signal });
        monitor.timeout = 200;
        expect(monitor.timeout).to.be(200);
      });

    });

    describe('#isDisposed', () => {

      it('should test whether the monitor is disposed', () => {
        let monitor = new ActivityMonitor<TestObject, number>({ signal });
        expect(monitor.isDisposed).to.be(false);
        monitor.dispose();
        expect(monitor.isDisposed).to.be(true);
      });

    });

    describe('#dispose()', () => {

      it('should dispose of the resources used by the monitor', () => {
        let monitor = new ActivityMonitor<TestObject, number>({ signal });
        monitor.dispose();
        expect(monitor.isDisposed).to.be(true);
      });

      it('should be a no-op if called more than once', () => {
        let monitor = new ActivityMonitor<TestObject, number>({ signal });
        monitor.dispose();
        monitor.dispose();
        expect(monitor.isDisposed).to.be(true);
      });

    });

  });

});
