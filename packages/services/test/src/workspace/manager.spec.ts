// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect } from 'chai';

import { WorkspaceManager, ServerConnection } from '../../../lib';

import { init } from '../utils';

// Initialize the fetch overrides.
init();

describe('workspace', () => {
  describe('WorkspaceManager', () => {
    const manager: WorkspaceManager = new WorkspaceManager({
      serverSettings: ServerConnection.makeSettings({ pageUrl: 'lab' })
    });

    describe('#constructor()', () => {
      it('should accept no options', () => {
        const manager = new WorkspaceManager();
        expect(manager).to.be.an.instanceof(WorkspaceManager);
      });

      it('should accept options', () => {
        const manager = new WorkspaceManager({
          serverSettings: ServerConnection.makeSettings()
        });
        expect(manager).to.be.an.instanceof(WorkspaceManager);
      });
    });

    describe('#serverSettings', () => {
      it('should be the server settings', () => {
        const baseUrl = 'foo';
        const serverSettings = ServerConnection.makeSettings({ baseUrl });
        const manager = new WorkspaceManager({ serverSettings });
        expect(manager.serverSettings.baseUrl).to.equal(baseUrl);
      });
    });

    describe('#fetch()', () => {
      it('should fetch a saved workspace', async () => {
        const id = 'foo';

        await manager.save(id, { data: {}, metadata: { id } });
        expect((await manager.fetch(id)).metadata.id).to.equal(id);
        await manager.remove(id);
      });
    });

    describe('#list()', async () => {
      it('should fetch a list of workspaces', async () => {
        const ids = ['foo', 'bar', 'baz'];

        ids.forEach(async id => {
          await manager.save(id, { data: {}, metadata: { id } });
        });
        expect((await manager.list()).sort()).to.deep.equal(ids.sort());
      });
    });

    describe('#remove()', () => {
      it('should remove a workspace', async () => {
        const id = 'foo';

        await manager.save(id, { data: {}, metadata: { id } });
        expect((await manager.fetch(id)).metadata.id).to.equal(id);
        await manager.remove(id);
      });
    });

    describe('#save()', () => {
      it('should save a workspace', async () => {
        const id = 'foo';

        await manager.save(id, { data: {}, metadata: { id } });
        expect((await manager.fetch(id)).metadata.id).to.equal(id);
        await manager.remove(id);
      });
    });
  });
});
