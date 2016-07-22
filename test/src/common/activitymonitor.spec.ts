// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  Signal
} from 'phosphor-signaling';

import {
  ActivityMonitor
} from '../../../lib/common/activitymonitor';


describe('common/activitymonitor', () => {

  describe('ActivityMonitor()', () => {

    describe('#constructor()', () => {

      it('should accept a signal', () => {
        let signal = new Signal<Window, number>().bind(window);
        let monitor = new ActivityMonitor<Window, number>({ signal });
        expect(monitor).to.be.an(ActivityMonitor);
      });

      it('should accept a timeout', () => {
        let signal = new Signal<Window, number>().bind(window);
        let monitor = new ActivityMonitor<Window, number>({ signal, timeout: 100 });
        expect(monitor).to.be.an(ActivityMonitor);
      });

    });

    describe('#activityStopped', () => {

      it('should be emitted after the signal has fired and a timeout', (done) => {
        let signal = new Signal<Window, number>().bind(window);
        let called = false;
        let monitor = new ActivityMonitor({ signal, timeout: 100 });
        monitor.activityStopped.connect((sender, args) => {
          expect(sender).to.be(monitor);
          expect(args.sender).to.be(window);
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
        let signal = new Signal<Window, number>().bind(window);
        let called = false;
        let monitor = new ActivityMonitor<Window, number>({ signal, timeout: 100 });
        monitor.activityStopped.connect((sender, args) => {
          expect(sender).to.be(monitor);
          expect(args.sender).to.be(window);
          expect(args.args).to.be(10);
          called = true;
        });
        signal.emit(5);
        expect(called).to.be(false);
        setTimeout(() => {
          signal.emit(10);
        }, 90);
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
        let signal = new Signal<Window, number>().bind(window);
        let monitor = new ActivityMonitor<Window, number>({ signal });
        expect(monitor.timeout).to.be(1000);
      });

      it('should be set-able', () => {
        let signal = new Signal<Window, number>().bind(window);
        let monitor = new ActivityMonitor<Window, number>({ signal });
        monitor.timeout = 200;
        expect(monitor.timeout).to.be(200);
      });

    });

    describe('#isDisposed', () => {

      it('should test whether the monitor is disposed', () => {
        let signal = new Signal<Window, number>().bind(window);
        let monitor = new ActivityMonitor<Window, number>({ signal });
        expect(monitor.isDisposed).to.be(false);
        monitor.dispose();
        expect(monitor.isDisposed).to.be(true);
      });

      it('should be read-only', () => {
        let signal = new Signal<Window, number>().bind(window);
        let monitor = new ActivityMonitor<Window, number>({ signal });
        expect(() => { monitor.isDisposed = false; }).to.throwError();
      });

    });

    describe('#dispose()', () => {

      it('should disposed of the resources used by the monitor', () => {
        let signal = new Signal<Window, number>().bind(window);
        let monitor = new ActivityMonitor<Window, number>({ signal });
        monitor.dispose();
        expect(monitor.isDisposed).to.be(true);
      });

      it('should be a no-op if called more than once', () => {
        let signal = new Signal<Window, number>().bind(window);
        let monitor = new ActivityMonitor<Window, number>({ signal });
        monitor.dispose();
        monitor.dispose();
        expect(monitor.isDisposed).to.be(true);
      });

    });

  });

});
