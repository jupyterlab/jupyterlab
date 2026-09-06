/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { signalToPromise } from '@jupyterlab/coreutils';
import { ServerConnection, WorkspaceManager } from '@jupyterlab/services';
import { JupyterServer } from '@jupyterlab/testing';
import { WorkspacesModel } from '@jupyterlab/workspaces';

const server = new JupyterServer();

beforeAll(async () => {
  await server.start();
}, 30000);

afterAll(async () => {
  await server.shutdown();
});

const WORKSPACE_DATA = {
  'layout-restorer:data': {
    main: {
      dock: {
        type: 'tab-area',
        currentIndex: 0,
        widgets: ['editor:README.md']
      },
      current: 'editor:README.md'
    },
    down: { size: 0, widgets: [] },
    left: {
      collapsed: false,
      visible: true,
      current: 'running-sessions',
      widgets: ['filebrowser', 'running-sessions', 'extensionmanager.main-view']
    },
    right: {
      collapsed: true,
      visible: true,
      widgets: [
        'jp-property-inspector',
        '@jupyterlab/toc:plugin',
        'debugger-sidebar'
      ]
    },
    relativeSizes: [0.3, 0.7, 0],
    top: { simpleVisibility: true }
  },
  'editor:README.md': { data: { path: 'README.md', factory: 'Editor' } }
};

describe('@jupyterlab/workspaces', () => {
  describe('WorkspacesModel', () => {
    let model: WorkspacesModel;
    let manager: WorkspaceManager;

    beforeEach(async () => {
      manager = new WorkspaceManager({
        serverSettings: ServerConnection.makeSettings({ appUrl: 'lab' })
      });
      model = new WorkspacesModel({ manager });

      await manager.save('foo', {
        metadata: { id: 'foo' },
        data: WORKSPACE_DATA
      });
      await manager.save('bar', {
        metadata: { id: 'bar' },
        data: WORKSPACE_DATA
      });
      await model.refresh();
    });

    afterEach(async () => {
      const workspaces = await manager.list();
      await Promise.all(workspaces.ids.map(id => manager.remove(id)));
    });

    describe('#constructor()', () => {
      it('should allow changing refresh options', async () => {
        model = new WorkspacesModel({
          manager,
          refreshInterval: 50,
          refreshStandby: () => false
        });
        await expect(
          signalToPromise(model.refreshed)
        ).resolves.not.toBeUndefined();
      }, 1000);
    });

    describe('#workspaces', () => {
      it('should list saved workspaces', async () => {
        expect(model.workspaces).toHaveLength(2);
        const ids = model.workspaces.map(w => w.metadata.id);
        expect(ids).toContain('foo');
        expect(ids).toContain('bar');
      });
    });

    describe('#identifiers', () => {
      it('should list identifiers of existing workspaces', async () => {
        expect(model.identifiers).toHaveLength(2);
        expect(model.identifiers).toContain('foo');
        expect(model.identifiers).toContain('bar');
      });
    });

    describe('#create', () => {
      it('should create an empty workspace', async () => {
        expect(model.workspaces).toHaveLength(2);
        await model.create('foobar');
        expect(model.workspaces).toHaveLength(3);
        expect(model.identifiers).toContain('foobar');
      });
    });

    describe('#refresh()', () => {
      it('should update the list of workspaces and identifiers', async () => {
        await manager.save('foobar', {
          metadata: { id: 'foobar' },
          data: WORKSPACE_DATA
        });
        expect(model.identifiers).toHaveLength(2);
        await model.refresh();
        expect(model.identifiers).toHaveLength(3);
      });

      it('should emit `refreshed` signal', async () => {
        let emitted = false;
        model.refreshed.connect(() => (emitted = true));
        await model.refresh();
        expect(emitted).toBe(true);
      });
    });

    describe('#rename()', () => {
      it('should rename the given workspace', async () => {
        await model.rename('foo', 'FOO');
        expect(model.identifiers).toContain('FOO');
        expect(model.identifiers).not.toContain('foo');
      });
    });

    describe('#remove()', () => {
      it('should remove the given workspace', async () => {
        expect(model.workspaces).toHaveLength(2);
        await model.remove('foo');
        expect(model.workspaces).toHaveLength(1);
        expect(model.identifiers).not.toContain('foo');
      });
    });

    describe('#reset()', () => {
      it('should clear the data of the workspace', async () => {
        let foo = model.workspaces.filter(
          workspace => workspace.metadata.id == 'foo'
        )[0];
        expect(foo.data).toHaveProperty('layout-restorer:data');
        await model.reset('foo');
        foo = model.workspaces.filter(
          workspace => workspace.metadata.id == 'foo'
        )[0];
        expect(foo.data).not.toHaveProperty('layout-restorer:data');
      });
    });

    describe('#saveAs()', () => {
      it('should save the workspace under a different name', async () => {
        expect(model.workspaces).toHaveLength(2);
        await model.saveAs('foo', 'fooBar');
        expect(model.workspaces).toHaveLength(3);
        expect(model.identifiers).toContain('fooBar');
      });
    });
  });
});
