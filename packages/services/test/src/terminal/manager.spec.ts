// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  toArray
} from '@phosphor/algorithm';

import {
  JSONExt
} from '@phosphor/coreutils';

import {
  TerminalSession, TerminalManager
} from '../../../lib/terminal';

import {
  TerminalTester
} from '../utils';


describe('terminals', () => {

  let tester: TerminalTester;
  let manager: TerminalSession.IManager;
  let data: TerminalSession.IModel[] =  [{ name: 'foo'}, { name: 'bar' }];

  beforeEach((done) => {
    tester = new TerminalTester();
    tester.runningTerminals = data;
    manager = new TerminalManager();
    return manager.ready.then(done, done);
  });

  afterEach((done) => {
    manager.ready.then(() => {
      manager.dispose();
      tester.dispose();
      done();
    }).catch(done);
  });

  describe('TerminalManager', () => {

    describe('#constructor()', () => {

      it('should accept no options', () => {
        manager.dispose();
        manager = new TerminalManager();
        expect(manager).to.be.a(TerminalManager);
      });

      it('should accept options', () => {
        manager.dispose();
        manager = new TerminalManager({
          baseUrl: 'foo',
          wsUrl: 'bar',
          ajaxSettings: {}
        });
        expect(manager).to.be.a(TerminalManager);
      });

    });

    describe('#baseUrl', () => {

      it('should get the base url of the server', () => {
        manager.dispose();
        manager = new TerminalManager({ baseUrl: 'foo' });
        expect(manager.baseUrl).to.be('foo');
      });

    });

    describe('#wsUrl', () => {

      it('should get the ws url of the server', () => {
        manager.dispose();
        manager = new TerminalManager({ wsUrl: 'bar' });
        expect(manager.wsUrl).to.be('bar');
      });

    });

    describe('#ajaxSettings', () => {

      it('should get the ajax sessions of the server', () => {
        let ajaxSettings = { withCredentials: true };
        manager.dispose();
        manager = new TerminalManager({ ajaxSettings });
        expect(manager.ajaxSettings).to.eql(ajaxSettings);
      });

    });

    describe('#isReady', () => {

      it('should test whether the manager is ready', (done) => {
        manager.dispose();
        manager = new TerminalManager();
        expect(manager.isReady).to.be(false);
        manager.ready.then(() => {
          expect(manager.isReady).to.be(true);
          done();
        }).catch(done);
      });

    });

    describe('#ready', () => {

      it('should resolve when the manager is ready', (done) => {
        manager.ready.then(done, done);
      });

    });

    describe('#isAvailable()', () => {

      it('should test whether terminal sessions are available', () => {
        expect(TerminalSession.isAvailable()).to.be(true);
      });

    });

    describe('#running()', () => {

      it('should give an iterator over the list of running models', () => {
        expect(toArray(manager.running())).to.eql(data);
      });

    });

    describe('#startNew()', () => {

      it('should startNew a new terminal session', (done) => {
        manager.startNew().then(session => {
          expect(session.name).to.be.ok();
          done();
        }).catch(done);
      });

      it('should emit a runningChanged signal', (done) => {
        manager.runningChanged.connect(() => {
          done();
        });
        manager.startNew();
      });

    });

    describe('#connectTo()', () => {

      it('should connect to an existing kernel', (done) => {
        return manager.connectTo(data[0].name).then(session => {
          expect(session.name).to.be(data[0].name);
        }).then(done, done);
      });

      it('should emit a runningChanged signal', (done) => {
        tester.runningTerminals = [{ name: 'baz' }];
        manager.runningChanged.connect(() => {
          done();
        });
        manager.connectTo('baz');
      });

    });

    describe('#shutdown()', () => {

      it('should shut down a terminal session by name', (done) => {
        manager.startNew().then(session => {
          return manager.shutdown(session.name);
        }).then(() => {
          done();
        }).catch(done);
      });

      it('should emit a runningChanged signal', (done) => {
        manager.runningChanged.connect((sender, args) => {
          done();
        });
        manager.shutdown(data[0].name);
      });

    });

    describe('#runningChanged', () => {

      it('should be emitted when the running terminals changed', (done) => {
        let newData: TerminalSession.IModel[] = [{ name: 'foo'}];
        tester.runningTerminals = newData;
        manager.runningChanged.connect((sender, args) => {
          expect(sender).to.be(manager);
          expect(JSONExt.deepEqual(toArray(args), newData)).to.be(true);
          done();
        });
        manager.refreshRunning();
      });

      it('should be emitted when a session is shut down', (done) => {
        manager.startNew().then(session => {
          manager.runningChanged.connect(() => {
            manager.dispose();
            done();
          });
          return session.shutdown();
        }).catch(done);
      });

    });

    describe('#refreshRunning()', () => {

      it('should update the running session models', (done) => {
        let newData: TerminalSession.IModel[] = [{ name: 'foo'}];
        tester.runningTerminals = newData;
        manager.refreshRunning().then(() => {
          let running = toArray(manager.running());
          expect(JSONExt.deepEqual(newData, running)).to.be(true);
          done();
        }).catch(done);
      });

    });

  });

});
