// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { JupyterServer, testEmission } from '@jupyterlab/testing';
import {
  ServerConnection,
  Terminal,
  TerminalAPI,
  TerminalManager
} from '../../src';

const server = new JupyterServer();

beforeAll(async () => {
  await server.start();
}, 30000);

afterAll(async () => {
  await server.shutdown();
});

describe('terminal', () => {
  afterAll(async () => {
    const models = await TerminalAPI.listRunning();
    await Promise.all(models.map(m => TerminalAPI.shutdownTerminal(m.name)));
  });

  describe('TerminalManager', () => {
    let manager: Terminal.IManager;

    beforeEach(async () => {
      manager = new TerminalManager({ standby: 'never' });
      await manager.ready;
    });

    afterEach(() => {
      manager.dispose();
    });

    describe('#constructor()', () => {
      it('should accept no options', async () => {
        const manager = new TerminalManager({ standby: 'never' });
        await manager.ready;
        expect(manager).toBeInstanceOf(TerminalManager);
        manager.dispose();
      });

      it('should accept options', async () => {
        const manager = new TerminalManager({
          serverSettings: ServerConnection.makeSettings(),
          standby: 'never'
        });
        await manager.ready;
        expect(manager).toBeInstanceOf(TerminalManager);
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
        expect(manager.serverSettings.token).toBe(token);
        manager.dispose();
      });
    });

    describe('#isReady', () => {
      it('should test whether the manager is ready', async () => {
        const manager = new TerminalManager({ standby: 'never' });
        expect(manager.isReady).toBe(false);
        await manager.ready;
        expect(manager.isReady).toBe(true);
        manager.dispose();
      });
    });

    describe('#ready', () => {
      it('should resolve when the manager is ready', async () => {
        await expect(manager.ready).resolves.not.toThrow();
      });
    });

    describe('#isAvailable()', () => {
      it('should test whether terminal sessions are available', () => {
        expect(Terminal.isAvailable()).toBe(true);
      });
    });

    describe('#running()', () => {
      it('should give an iterator over the list of running models', async () => {
        await TerminalAPI.startNew();
        await manager.refreshRunning();
        const running = Array.from(manager.running());
        expect(running.length).toBeGreaterThan(0);
      });
    });

    describe('#startNew()', () => {
      it('should startNew a new terminal session', async () => {
        const session = await manager.startNew();
        expect(session.name).toBeTruthy();
      });

      it('should emit a runningChanged signal', async () => {
        let called = false;
        manager.runningChanged.connect(() => {
          called = true;
        });
        await manager.startNew();
        expect(called).toBe(true);
      });
    });

    describe('#connectTo()', () => {
      it('should connect to an existing session', async () => {
        const session = await manager.startNew();
        const session2 = manager.connectTo({ model: session.model });
        expect(session).not.toBe(session2);
        expect(session2.name).toBe(session.name);
      });
    });

    describe('#shutdown()', () => {
      it('should shut down a session by id', async () => {
        const temp = await manager.startNew();
        await manager.shutdown(temp.name);
        expect(temp.isDisposed).toBe(true);
      });

      it('should emit a runningChanged signal', async () => {
        const session = await manager.startNew();
        let called = false;
        manager.runningChanged.connect(() => {
          called = true;
        });
        await manager.shutdown(session.name);
        expect(called).toBe(true);
      });
    });

    describe('#runningChanged', () => {
      it('should be emitted when the running terminals changed', async () => {
        const emission = testEmission(manager.runningChanged, {
          test: (sender, args) => {
            expect(sender).toBe(manager);
            expect(Array.from(args).length).toBeGreaterThan(0);
          }
        });
        await manager.startNew();
        await emission;
      });
    });

    describe('#refreshRunning()', () => {
      it('should update the running session models', async () => {
        const before = Array.from(manager.running()).length;
        const model = await TerminalAPI.startNew();
        await manager.refreshRunning();
        const running = Array.from(manager.running());
        expect(running.length).toBe(before + 1);
        let found = false;
        running.map(m => {
          if (m.name === model.name) {
            found = true;
          }
        });
        expect(found).toBe(true);
      });
    });
  });

  describe('NoopManager', () => {
    let manager: TerminalManager.NoopManager;

    beforeEach(async () => {
      manager = new TerminalManager.NoopManager({ standby: 'never' });
      await manager.parentReady;
    });

    afterEach(() => {
      manager.dispose();
    });

    describe('#constructor()', () => {
      it('should take the options as an argument', async () => {
        manager.dispose();
        manager = new TerminalManager.NoopManager({
          standby: 'never'
        });
        await manager.parentReady;
        expect(manager instanceof TerminalManager.NoopManager).toBe(true);
      });
    });

    describe('#serverSettings', () => {
      it('should get the server settings', async () => {
        manager.dispose();
        const serverSettings = ServerConnection.makeSettings();
        const standby = 'never';
        const token = serverSettings.token;
        manager = new TerminalManager.NoopManager({ serverSettings, standby });
        await manager.parentReady;
        expect(manager.serverSettings.token).toBe(token);
      });
    });

    describe('#running()', () => {
      it('should get the running sessions', async () => {
        await manager.refreshRunning();
        expect(Array.from(manager.running()).length).toEqual(0);
      });
    });

    describe('#refreshRunning()', () => {
      it('should update the running kernels', async () => {
        await manager.refreshRunning();
        expect(Array.from(manager.running()).length).toEqual(0);
      });
    });

    describe('#startNew()', () => {
      it('should throw an error', () => {
        return expect(manager.startNew()).rejects.toThrow();
      });
    });

    describe('#connectTo()', () => {
      it('should throw an error', () => {
        return expect(() => {
          manager.connectTo({ model: { name: 'abcd' } });
        }).toThrow();
      });
    });

    describe('shutdown()', () => {
      it('should throw an error', () => {
        return expect(manager.shutdown('1234')).rejects.toThrow();
      });
    });
  });
});
