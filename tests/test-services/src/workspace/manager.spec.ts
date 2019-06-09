// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect } from 'chai';

import { WorkspaceManager, ServerConnection } from '@jupyterlab/services';

import { init } from '../utils';

// Initialize the fetch overrides.
init();

describe('workspace', () => {
  describe('WorkspaceManager', () => {
    const manager = new WorkspaceManager({
      serverSettings: ServerConnection.makeSettings({ appUrl: 'lab' })
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

    describe('#list()', () => {
      it('should fetch a workspace list supporting arbitrary IDs', async () => {
        const ids = ['foo', 'bar', 'baz', 'f/o/o', 'b/a/r', 'b/a/z'];
        const promises = ids.map(id =>
          manager.save(id, { data: {}, metadata: { id } })
        );

        await Promise.all(promises);
        expect((await manager.list()).ids.sort()).to.deep.equal(ids.sort());
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
