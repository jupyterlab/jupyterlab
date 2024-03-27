// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { JupyterServer } from '@jupyterlab/testing';
import { ServerConnection, WorkspaceManager } from '../../src';

const server = new JupyterServer();

beforeAll(async () => {
  await server.start();
}, 30000);

afterAll(async () => {
  await server.shutdown();
});

describe('workspace', () => {
  describe('WorkspaceManager', () => {
    let manager: WorkspaceManager;

    beforeAll(() => {
      manager = new WorkspaceManager({
        serverSettings: ServerConnection.makeSettings({ appUrl: 'lab' })
      });
    });

    describe('#constructor()', () => {
      it('should accept no options', () => {
        const manager = new WorkspaceManager();
        expect(manager).toBeInstanceOf(WorkspaceManager);
      });

      it('should accept options', () => {
        const manager = new WorkspaceManager({
          serverSettings: ServerConnection.makeSettings()
        });
        expect(manager).toBeInstanceOf(WorkspaceManager);
      });
    });

    describe('#serverSettings', () => {
      it('should be the server settings', () => {
        const baseUrl = 'http://localhost/foo';
        const serverSettings = ServerConnection.makeSettings({ baseUrl });
        const manager = new WorkspaceManager({ serverSettings });
        expect(manager.serverSettings.baseUrl).toBe(baseUrl);
      });
    });

    describe('#fetch()', () => {
      it('should fetch a saved workspace', async () => {
        const id = 'foo';

        await manager.save(id, { data: {}, metadata: { id } });
        expect((await manager.fetch(id)).metadata.id).toBe(id);
        await manager.remove(id);
      });

      it('should reject on invalid id', async () => {
        const id = '../';

        const callback = async () => {
          await manager.fetch(id);
        };
        await expect(callback).rejects.toThrow();
      });
    });

    describe('#list()', () => {
      it('should fetch a workspace list supporting arbitrary IDs', async () => {
        const ids = ['foo', 'bar', 'baz', 'f/o/o', 'b/a/r', 'b/a/z'];
        const promises = ids.map(id =>
          manager.save(id, { data: {}, metadata: { id } })
        );

        await Promise.all(promises);
        expect((await manager.list()).ids.sort()).toEqual(ids.sort());
      });
    });

    describe('#remove()', () => {
      it('should remove a workspace', async () => {
        const id = 'foo';

        await manager.save(id, { data: {}, metadata: { id } });
        expect((await manager.fetch(id)).metadata.id).toBe(id);
        await manager.remove(id);
      });
    });

    describe('#save()', () => {
      it('should save a workspace', async () => {
        const id = 'foo';

        await manager.save(id, { data: {}, metadata: { id } });
        expect((await manager.fetch(id)).metadata.id).toBe(id);
        await manager.remove(id);
      });

      it('should reject on invalid id', async () => {
        const id = '../';

        const callback = async () => {
          await manager.save(id, { data: {}, metadata: { id } });
        };
        await expect(callback).rejects.toThrow();
      });
    });
  });
});
