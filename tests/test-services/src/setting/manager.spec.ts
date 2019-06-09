// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect } from 'chai';

import { ServerConnection, SettingManager } from '@jupyterlab/services';

import { init } from '../utils';

// Initialize the fetch overrides.
init();

describe('setting', () => {
  describe('SettingManager', () => {
    const manager = new SettingManager({
      serverSettings: ServerConnection.makeSettings({ appUrl: 'lab' })
    });

    describe('#constructor()', () => {
      it('should accept no options', () => {
        const manager = new SettingManager();
        expect(manager).to.be.an.instanceof(SettingManager);
      });

      it('should accept options', () => {
        const manager = new SettingManager({
          serverSettings: ServerConnection.makeSettings()
        });
        expect(manager).to.be.an.instanceof(SettingManager);
      });
    });

    describe('#serverSettings', () => {
      it('should be the server settings', () => {
        const baseUrl = 'foo';
        const serverSettings = ServerConnection.makeSettings({ baseUrl });
        const manager = new SettingManager({ serverSettings });
        expect(manager.serverSettings.baseUrl).to.equal(baseUrl);
      });
    });

    describe('#fetch()', () => {
      it('should fetch settings for an extension', async () => {
        const id = '@jupyterlab/apputils-extension:themes';

        expect((await manager.fetch(id)).id).to.equal(id);
      });
    });

    describe('#save()', () => {
      it('should save a setting', async () => {
        const id = '@jupyterlab/apputils-extension:themes';
        const theme = 'Foo Theme';
        const raw = `{"theme": "${theme}"}`;

        await manager.save(id, raw);
        expect(JSON.parse((await manager.fetch(id)).raw).theme).to.equal(theme);
      });
    });
  });
});
