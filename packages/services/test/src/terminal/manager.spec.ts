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
  ServerConnection, TerminalSession, TerminalManager
} from '../../../lib';


describe('terminal', () => {

  let manager: TerminalSession.IManager;
  let session: TerminalSession.ISession;

  before(() => {
    return TerminalSession.startNew().then(s => {
      session = s;
    });
  });

  beforeEach(() => {
    manager = new TerminalManager();
    return manager.ready;
  });

  afterEach(() => {
    manager.dispose();
  });

  after(() => {
    return TerminalSession.shutdownAll();
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
          serverSettings: ServerConnection.makeSettings()
        });
        expect(manager).to.be.a(TerminalManager);
      });

    });

    describe('#serverSettings', () => {

      it('should get the server settings', () => {
        manager.dispose();
        let serverSettings = ServerConnection.makeSettings();
        let token = serverSettings.token;
        manager = new TerminalManager({ serverSettings });
        expect(manager.serverSettings.token).to.be(token);
      });

    });

    describe('#isReady', () => {

      it('should test whether the manager is ready', () => {
        manager.dispose();
        manager = new TerminalManager();
        expect(manager.isReady).to.be(false);
        return manager.ready.then(() => {
          expect(manager.isReady).to.be(true);
        });
      });

    });

    describe('#ready', () => {

      it('should resolve when the manager is ready', () => {
        return manager.ready;
      });

    });

    describe('#isAvailable()', () => {

      it('should test whether terminal sessions are available', () => {
        expect(TerminalSession.isAvailable()).to.be(true);
      });

    });

    describe('#running()', () => {

      it('should give an iterator over the list of running models', () => {
        return manager.refreshRunning().then(() => {
          let running = toArray(manager.running());
          expect(running.length).to.be.greaterThan(0);
        });
      });

    });

    describe('#startNew()', () => {

      it('should startNew a new terminal session', () => {
        return manager.startNew().then(session => {
          expect(session.name).to.be.ok();
        });
      });

      it('should emit a runningChanged signal', (done) => {
        manager.runningChanged.connect(() => {
          done();
        });
        manager.startNew();
      });

    });

    describe('#connectTo()', () => {

      it('should connect to an existing session', () => {
        let name = session.name;
        return manager.connectTo(name).then(session => {
          expect(session.name).to.be(name);
        });
      });

    });

    describe('#shutdown()', () => {

      it('should shut down a session by id', () => {
        let temp: TerminalSession.ISession;
        return manager.startNew().then(s => {
          temp = s;
          return manager.shutdown(s.name);
        }).then(() => {
          expect(temp.isDisposed).to.be(true);
        });
      });

      it('should emit a runningChanged signal', () => {
        let called = false;
        return manager.startNew().then(s => {
          manager.runningChanged.connect((sender, args) => {
            expect(s.isDisposed).to.be(false);
            called = true;
          });
          return manager.shutdown(s.name);
        }).then(() => {
          expect(called).to.be(true);
        });
      });

    });

    describe('#runningChanged', () => {

      it('should be emitted when the running terminals changed', (done) => {
        manager.runningChanged.connect((sender, args) => {
          expect(sender).to.be(manager);
          expect(toArray(args).length).to.be.greaterThan(0);
          done();
        });
        manager.startNew().catch(done);
      });

    });

    describe('#refreshRunning()', () => {

      it('should update the running session models', () => {
        let model: TerminalSession.IModel;
        let before = toArray(manager.running()).length;
        return TerminalSession.startNew().then(s => {
          model = s.model;
          return manager.refreshRunning();
        }).then(() => {
          let running = toArray(manager.running());
          expect(running.length).to.be(before + 1);
          let found = false;
          running.map(m => {
            if (m.name === model.name) {
              found = true;
            }
          });
          expect(found).to.be(true);
        });
      });

    });

  });

});
