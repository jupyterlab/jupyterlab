// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import { WorkspaceManager, ServerConnection } from '../../../lib';

import { init } from '../utils';

// Initialize the fetch overrides.
init();

describe('workspace', () => {
  describe('WorkspaceManager', () => {
    describe('#constructor()', () => {
      it('should accept no options', () => {
        const manager = new WorkspaceManager();
        expect(manager).to.be.a(WorkspaceManager);
      });

      it('should accept options', () => {
        const manager = new WorkspaceManager({
          serverSettings: ServerConnection.makeSettings()
        });
        expect(manager).to.be.a(WorkspaceManager);
      });
    });

    describe('#serverSettings', () => {
      it('should be the server settings', () => {
        const baseUrl = 'foo';
        const serverSettings = ServerConnection.makeSettings({ baseUrl });
        const manager = new WorkspaceManager({ serverSettings });
        expect(manager.serverSettings.baseUrl).to.be(baseUrl);
      });
    });
  });
});
