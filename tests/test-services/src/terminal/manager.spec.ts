// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect } from 'chai';

import { toArray } from '@lumino/algorithm';

import {
  ServerConnection,
  Terminal,
  TerminalManager,
  TerminalAPI
} from '@jupyterlab/services';

import { testEmission } from '@jupyterlab/testutils';

describe('terminal', () => {
  let manager: Terminal.IManager;

  beforeEach(async () => {
    manager = new TerminalManager({ standby: 'never' });
    await manager.ready;
  });

  afterEach(() => {
    manager.dispose();
  });

  afterAll(async () => {
    let models = await TerminalAPI.listRunning();
    await Promise.all(models.map(m => TerminalAPI.shutdownTerminal(m.name)));
  });

  describe('TerminalManager', () => {
    describe('#constructor()', () => {
      it('should accept no options', async () => {
        const manager = new TerminalManager({ standby: 'never' });
        await manager.ready;
        expect(manager).to.be.an.instanceof(TerminalManager);
        manager.dispose();
      });

      it('should accept options', async () => {
        const manager = new TerminalManager({
          serverSettings: ServerConnection.makeSettings(),
          standby: 'never'
        });
        await manager.ready;
        expect(manager).to.be.an.instanceof(TerminalManager);
        manager.dispose();
      });
    });

    describe('#serverSettings', () => {
      it('should get the server settings', async () => {
        const serverSettings = ServerConnection.makeSettings();
        const standby = 'never';
        const token = serverSettings.token;
        const manager = new TerminalManager({ serverSettings, standby });
        await manager.ready;
        expect(manager.serverSettings.token).to.equal(token);
        manager.dispose();
      });
    });

    describe('#isReady', () => {
      it('should test whether the manager is ready', async () => {
        const manager = new TerminalManager({ standby: 'never' });
        expect(manager.isReady).to.equal(false);
        await manager.ready;
        expect(manager.isReady).to.equal(true);
        manager.dispose();
      });
    });

    describe('#ready', () => {
      it('should resolve when the manager is ready', () => {
        return manager.ready;
      });
    });

    describe('#isAvailable()', () => {
      it('should test whether terminal sessions are available', () => {
        expect(Terminal.isAvailable()).to.equal(true);
      });
    });

    describe('#running()', () => {
      it('should give an iterator over the list of running models', async () => {
        await TerminalAPI.startNew();
        await manager.refreshRunning();
        const running = toArray(manager.running());
        expect(running.length).to.be.greaterThan(0);
      });
    });

    describe('#startNew()', () => {
      it('should startNew a new terminal session', async () => {
        let session = await manager.startNew();
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
        let session = await manager.startNew();
        let session2 = manager.connectTo({ model: session.model });
        expect(session).to.not.equal(session2);
        expect(session2.name).to.equal(session.name);
      });
    });

    describe('#shutdown()', () => {
      it('should shut down a session by id', async () => {
        const temp = await manager.startNew();
        await manager.shutdown(temp.name);
        expect(temp.isDisposed).to.equal(true);
      });

      it('should emit a runningChanged signal', async () => {
        let session = await manager.startNew();
        let called = false;
        manager.runningChanged.connect(() => {
          called = true;
        });
        await manager.shutdown(session.name);
        expect(called).to.be.true;
      });
    });

    describe('#runningChanged', () => {
      it('should be emitted when the running terminals changed', async () => {
        const emission = testEmission(manager.runningChanged, {
          test: (sender, args) => {
            expect(sender).to.equal(manager);
            expect(toArray(args).length).to.be.greaterThan(0);
          }
        });
        await manager.startNew();
        await emission;
      });
    });

    describe('#refreshRunning()', () => {
      it('should update the running session models', async () => {
        const before = toArray(manager.running()).length;
        let model = await TerminalAPI.startNew();
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
