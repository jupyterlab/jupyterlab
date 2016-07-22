// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  ISignal, Signal
} from 'phosphor-signaling';

import {
  ActivityMonitor
} from '../../../lib/common/activitymonitor';



class TestObject {

  static oneSignal = new Signal<TestObject, number>();

  static twoSignal = new Signal<TestObject, string[]>();

  get one(): ISignal<TestObject, number> {
    return TestObject.oneSignal.bind(this);
  }

  get two(): ISignal<TestObject, string[]> {
    return TestObject.twoSignal.bind(this);
  }
}



describe('common/activitymonitor', () => {

  describe('ActivityMonitor()', () => {

    let testObj: TestObject;
    let signal: ISignal<TestObject, number>;

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
        let monitor = new ActivityMonitor<TestObject, number>({ signal, timeout: 100 });
        monitor.activityStopped.connect((sender, args) => {
          expect(sender).to.be(monitor);
          expect(args.sender).to.be(testObj);
          expect(args.args).to.be(10);
          called = true;
        });
        signal.emit(5);
        expect(called).to.be(false);
        setTimeout(() => {
          signal.emit(10);
        }, 70);
        setTimeout(() => {
          expect(called).to.be(false);
        }, 100);
        setTimeout(() => {
          expect(called).to.be(true);
          done();
        }, 200);
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

      it('should be read-only', () => {
        let monitor = new ActivityMonitor<TestObject, number>({ signal });
        expect(() => { monitor.isDisposed = false; }).to.throwError();
      });

    });

    describe('#dispose()', () => {

      it('should disposed of the resources used by the monitor', () => {
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
