// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { JupyterServer } from '@jupyterlab/testing';
import {
  ContentsManager,
  ServiceManager,
  SessionManager,
  SettingManager,
  TerminalManager,
  WorkspaceManager
} from '../src';

const server = new JupyterServer();

beforeAll(async () => {
  await server.start();
}, 30000);

afterAll(async () => {
  await server.shutdown();
});

describe('manager', () => {
  describe('ServiceManager', () => {
    let manager: ServiceManager.IManager;

    beforeEach(() => {
      manager = new ServiceManager({ standby: 'never' });
      return manager.ready;
    });

    afterEach(() => {
      manager.dispose();
    });

    describe('#constructor()', () => {
      it('should create a new service manager', () => {
        expect(manager).toBeInstanceOf(ServiceManager);
      });
    });

    describe('#sessions', () => {
      it('should be the sessions manager instance', () => {
        expect(manager.sessions).toBeInstanceOf(SessionManager);
      });
    });

    describe('#settings', () => {
      it('should be the setting manager instance', () => {
        expect(manager.settings).toBeInstanceOf(SettingManager);
      });
    });

    describe('#contents', () => {
      it('should be the content manager instance', () => {
        expect(manager.contents).toBeInstanceOf(ContentsManager);
      });
    });

    describe('#terminals', () => {
      it('should be the terminal manager instance', () => {
        expect(manager.terminals).toBeInstanceOf(TerminalManager);
      });
    });

    describe('#workspaces', () => {
      it('should be the workspace manager instance', () => {
        expect(manager.workspaces).toBeInstanceOf(WorkspaceManager);
      });
    });

    describe('#isReady', () => {
      it('should test whether the manager is ready', async () => {
        manager.dispose();
        manager = new ServiceManager({ standby: 'never' });
        expect(manager.isReady).toBe(false);
        await manager.ready;
        expect(manager.isReady).toBe(true);
      });
    });
  });
});
