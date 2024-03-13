// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { JupyterServer } from '@jupyterlab/testing';
import { ServerConnection, SettingManager } from '../../src';

const server = new JupyterServer();

beforeAll(async () => {
  await server.start();
}, 30000);

afterAll(async () => {
  await server.shutdown();
});

describe('setting', () => {
  describe('SettingManager', () => {
    let manager: SettingManager;

    beforeAll(() => {
      manager = new SettingManager({
        serverSettings: ServerConnection.makeSettings({ appUrl: 'lab' })
      });
    });

    describe('#constructor()', () => {
      it('should accept no options', () => {
        const manager = new SettingManager();
        expect(manager).toBeInstanceOf(SettingManager);
      });

      it('should accept options', () => {
        const manager = new SettingManager({
          serverSettings: ServerConnection.makeSettings()
        });
        expect(manager).toBeInstanceOf(SettingManager);
      });
    });

    describe('#serverSettings', () => {
      it('should be the server settings', () => {
        const baseUrl = 'http://localhost/foo';
        const serverSettings = ServerConnection.makeSettings({ baseUrl });
        const manager = new SettingManager({ serverSettings });
        expect(manager.serverSettings.baseUrl).toBe(baseUrl);
      });
    });

    describe('#fetch()', () => {
      it('should fetch settings for an extension', async () => {
        const id = '@jupyterlab/apputils-extension:themes';

        expect((await manager.fetch(id)).id).toBe(id);
      });

      it('should reject on invalid id', async () => {
        const id = '../';

        const callback = async () => {
          await manager.fetch(id);
        };
        await expect(callback).rejects.toThrow();
      });
    });

    describe('#save()', () => {
      it('should save a setting', async () => {
        const id = '@jupyterlab/apputils-extension:themes';
        const theme = 'Foo Theme';
        const raw = `{"theme": "${theme}"}`;

        await manager.save(id, raw);
        expect(JSON.parse((await manager.fetch(id)).raw).theme).toBe(theme);
      });

      it('should reject on invalid id', async () => {
        const id = '../';
        const theme = 'Foo Theme';
        const raw = `{"theme": "${theme}"}`;

        const callback = async () => {
          await manager.save(id, raw);
        };
        await expect(callback).rejects.toThrow();
      });
    });
  });
});
