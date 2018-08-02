// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect } from 'chai';

import { toArray } from '@phosphor/algorithm';

import { JSONExt } from '@phosphor/coreutils';

import {
  ServerConnection,
  TerminalSession,
  TerminalManager
} from '../../../lib';

describe('terminal', () => {
  let manager: TerminalSession.IManager;
  let session: TerminalSession.ISession;

  before(async () => {
    session = await TerminalSession.startNew();
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
        expect(manager).to.be.an.instanceof(TerminalManager);
      });

      it('should accept options', () => {
        manager.dispose();
        manager = new TerminalManager({
          serverSettings: ServerConnection.makeSettings()
        });
        expect(manager).to.be.an.instanceof(TerminalManager);
      });
    });

    describe('#serverSettings', () => {
      it('should get the server settings', () => {
        manager.dispose();
        const serverSettings = ServerConnection.makeSettings();
        const token = serverSettings.token;
        manager = new TerminalManager({ serverSettings });
        expect(manager.serverSettings.token).to.equal(token);
      });
    });

    describe('#isReady', () => {
      it('should test whether the manager is ready', async () => {
        manager.dispose();
        manager = new TerminalManager();
        expect(manager.isReady).to.equal(false);
        await manager.ready;
        expect(manager.isReady).to.equal(true);
      });
    });

    describe('#ready', () => {
      it('should resolve when the manager is ready', () => {
        return manager.ready;
      });
    });

    describe('#isAvailable()', () => {
      it('should test whether terminal sessions are available', () => {
        expect(TerminalSession.isAvailable()).to.equal(true);
      });
    });

    describe('#running()', () => {
      it('should give an iterator over the list of running models', async () => {
        await manager.refreshRunning();
        const running = toArray(manager.running());
        expect(running.length).to.be.greaterThan(0);
      });
    });

    describe('#startNew()', () => {
      it('should startNew a new terminal session', async () => {
        session = await manager.startNew();
        expect(session.name).to.be.ok;
      });

      it('should emit a runningChanged signal', async () => {
        let called = false;
        manager.runningChanged.connect(() => {
          called = true;
        });
        await manager.startNew();
        expect(called).to.equal(true);
      });
    });

    describe('#connectTo()', () => {
      it('should connect to an existing session', async () => {
        const name = session.name;
        session = await manager.connectTo(name);
        expect(session.name).to.equal(name);
      });
    });

    describe('#shutdown()', () => {
      it('should shut down a session by id', async () => {
        const temp = await manager.startNew();
        await manager.shutdown(temp.name);
        expect(temp.isDisposed).to.equal(true);
      });

      it('should emit a runningChanged signal', async () => {
        let called = false;
        session = await manager.startNew();
        manager.runningChanged.connect((sender, args) => {
          expect(session.isDisposed).to.equal(false);
          called = true;
        });
        await manager.shutdown(session.name);
        expect(called).to.equal(true);
      });
    });

    describe('#runningChanged', () => {
      it('should be emitted when the running terminals changed', async () => {
        let called = false;
        manager.runningChanged.connect((sender, args) => {
          expect(sender).to.equal(manager);
          expect(toArray(args).length).to.be.greaterThan(0);
          called = true;
        });
        await manager.startNew();
        expect(called).to.equal(true);
      });
    });

    describe('#refreshRunning()', () => {
      it('should update the running session models', async () => {
        let model: TerminalSession.IModel;
        const before = toArray(manager.running()).length;
        session = await TerminalSession.startNew();
        model = session.model;
        await manager.refreshRunning();
        const running = toArray(manager.running());
        expect(running.length).to.equal(before + 1);
        let found = false;
        running.map(m => {
          if (m.name === model.name) {
            found = true;
          }
        });
        expect(found).to.equal(true);
      });
    });
  });
});
