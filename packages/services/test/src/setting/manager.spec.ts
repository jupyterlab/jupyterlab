// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  ServerConnection, SettingManager
} from '../../../lib';


describe('setting', () => {

  describe('SettingManager', () => {

    describe('#constructor()', () => {

      it('should accept no options', () => {
        const manager = new SettingManager();
        expect(manager).to.be.a(SettingManager);
      });

      it('should accept options', () => {
        const manager = new SettingManager({
          serverSettings: ServerConnection.makeSettings()
        });
        expect(manager).to.be.a(SettingManager);
      });

    });

    describe('#serverSettings', () => {

      it('should be the server settings', () => {
        const baseUrl = 'foo';
        const serverSettings = ServerConnection.makeSettings({ baseUrl });
        const manager = new SettingManager({ serverSettings });
        expect(manager.serverSettings.baseUrl).to.be(baseUrl);
      });

    });

  });

});
