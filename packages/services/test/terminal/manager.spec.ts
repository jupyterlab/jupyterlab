// Copyright (c) Jupyter Development Team.

import 'jest';

import { toArray } from '@lumino/algorithm';

import {
  ServerConnection,
  Terminal,
  TerminalManager,
  TerminalAPI
} from '../../src';

import { testEmission, JupyterServer } from '@jupyterlab/testutils';

const server = new JupyterServer();

beforeAll(async () => {
  await server.start();
});

afterAll(async () => {
  await server.shutdown();
});

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
    const models = await TerminalAPI.listRunning();
    await Promise.all(models.map(m => TerminalAPI.shutdownTerminal(m.name)));
  });

  describe('TerminalManager', () => {
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
      it('should resolve when the manager is ready', () => {
        return manager.ready;
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
        const running = toArray(manager.running());
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
            expect(toArray(args).length).toBeGreaterThan(0);
          }
        });
        await manager.startNew();
        await emission;
      });
    });

    describe('#refreshRunning()', () => {
      it('should update the running session models', async () => {
        const before = toArray(manager.running()).length;
        const model = await TerminalAPI.startNew();
        await manager.refreshRunning();
        const running = toArray(manager.running());
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
});
