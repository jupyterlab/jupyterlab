// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

// The extension entries mirror the snake_case JSON returned by the server.
/* eslint-disable camelcase */

import { Dialog } from '@jupyterlab/apputils';
import { PageConfig } from '@jupyterlab/coreutils';
import type { ServiceManager, Session } from '@jupyterlab/services';
import { ServerConnection } from '@jupyterlab/services';
import { ServiceManagerMock } from '@jupyterlab/services/lib/testutils';
import { Signal } from '@lumino/signaling';
import { ListModel } from '@jupyterlab/extensionmanager';
import type { IEntry } from '@jupyterlab/extensionmanager';

/**
 * Create a minimal installed extension entry for testing.
 */
function createEntry(name: string): IEntry {
  return {
    name,
    description: `Description of ${name}`,
    homepage_url: `https://example.com/${name}`,
    installed: true,
    allowed: true,
    approved: false,
    enabled: true,
    latest_version: '1.0.0',
    installed_version: '1.0.0',
    status: 'ok',
    pkg_type: 'prebuilt'
  };
}

/**
 * Create an installed extension entry whose Python package has another name.
 */
function createPythonEntry(): IEntry {
  return {
    ...createEntry('jupyter-lsp-jupyterlab-lsp'),
    install: {
      packageManager: 'python',
      packageName: 'jupyterlab-lsp',
      uninstallInstructions: 'Use pip to uninstall jupyterlab-lsp'
    }
  };
}

/**
 * Reply to every request as the server does to a successful action, and
 * return the spy.
 */
function mockActionReply(): jest.SpyInstance {
  return jest.spyOn(ServerConnection, 'makeRequest').mockImplementation(
    async () =>
      new Response(JSON.stringify({ status: 'ok', needs_restart: [] }), {
        status: 201
      })
  );
}

/**
 * A `ListModel` subclass serving installed extensions from an in-memory
 * source, as a downstream `IExtensionManagerModel` provider would.
 */
class TestModel extends ListModel {
  /**
   * The installed extensions returned by the overridden `fetchInstalled`.
   */
  customInstalled: IEntry[] = [];

  /**
   * The number of times `fetchInstalled` has been called.
   */
  fetchInstalledCount = 0;

  /**
   * Expose the protected `search` method for testing.
   */
  search(force = false): Promise<void> {
    return super.search(force);
  }

  protected async fetchInstalled(force: boolean): Promise<IEntry[]> {
    this.fetchInstalledCount++;
    return this.customInstalled;
  }
}

describe('@jupyterlab/extensionmanager', () => {
  describe('ListModel', () => {
    let serviceManager: ServiceManager.IManager;
    const models: ListModel[] = [];

    /**
     * Create a test model after setting the extension manager metadata that
     * the model reads from the page config at construction time.
     */
    function createModel(metadata?: Record<string, unknown>): TestModel {
      PageConfig.setOption('extensionManager', JSON.stringify(metadata ?? {}));
      const model = new TestModel(serviceManager);
      models.push(model);
      return model;
    }

    beforeEach(() => {
      serviceManager = new ServiceManagerMock();
    });

    afterEach(() => {
      while (models.length) {
        models.pop()!.dispose();
      }
      PageConfig.setOption('extensionManager', '{}');
    });

    describe('#canInstall', () => {
      it('should default to false when no metadata is provided', () => {
        const model = createModel();
        expect(model.canInstall).toBe(false);
      });

      it('should reflect the can_install metadata flag', () => {
        const model = createModel({ can_install: true });
        expect(model.canInstall).toBe(true);
      });
    });

    describe('#canManage', () => {
      it('should default to true when no metadata is provided', () => {
        const model = createModel();
        expect(model.canManage).toBe(true);
      });

      it('should reflect the can_manage metadata flag', () => {
        const model = createModel({ can_manage: false });
        expect(model.canManage).toBe(false);
      });

      it('should be independent of can_install so actions stay available', () => {
        const model = createModel({ can_install: false });
        expect(model.canInstall).toBe(false);
        expect(model.canManage).toBe(true);
      });
    });

    describe('#name', () => {
      it('should fall back to a default when metadata omits the name', () => {
        const model = createModel();
        expect(model.name).toBe('Extension');
      });
    });

    describe('#isDisclaimed', () => {
      it('should default to false whether or not the manager can install', () => {
        expect(createModel({ can_install: false }).isDisclaimed).toBe(false);
        expect(createModel({ can_install: true }).isDisclaimed).toBe(false);
      });
    });

    describe('#canFetch', () => {
      it('should require an accepted disclaimer when it can install', () => {
        const model = createModel({ can_install: true });
        expect(model.canFetch).toBe(false);
        model.isDisclaimed = true;
        expect(model.canFetch).toBe(true);
      });

      it('should require consent for a read-only manager too', () => {
        const model = createModel({ can_install: false });
        expect(model.canFetch).toBe(false);
        model.isDisclaimed = true;
        expect(model.canFetch).toBe(true);
      });

      it('should not depend on canManage', () => {
        const model = createModel({ can_install: true, can_manage: false });
        model.isDisclaimed = true;
        expect(model.canFetch).toBe(true);
      });
    });

    describe('#canPerformActions', () => {
      it('should be available without the disclaimer for a read-only manager', () => {
        const model = createModel({ can_install: false });
        expect(model.isDisclaimed).toBe(false);
        expect(model.canPerformActions).toBe(true);
      });

      it('should require the disclaimer for an installable manager', () => {
        const model = createModel({ can_install: true });
        expect(model.canPerformActions).toBe(false);
        model.isDisclaimed = true;
        expect(model.canPerformActions).toBe(true);
      });

      it('should be false when the manager cannot manage extensions', () => {
        const listing = createModel({ can_install: false, can_manage: false });
        expect(listing.canPerformActions).toBe(false);
      });
    });

    describe('#search()', () => {
      it('should be a no-op re-render when it cannot install', async () => {
        const model = createModel({ can_install: false });
        let changed = 0;
        model.stateChanged.connect(() => {
          changed++;
        });
        // Re-render once so the query filters the local list, without
        // reaching the server.
        await expect(model.search()).resolves.toBeUndefined();
        expect(changed).toBe(1);
      });

      it('should reject when installable but not disclaimed', async () => {
        const model = createModel({ can_install: true });
        expect(model.isDisclaimed).toBe(false);
        await expect(model.search()).rejects.toBe(
          'Installation warning is not disclaimed.'
        );
      });
    });

    describe('#refresh()', () => {
      afterEach(() => {
        jest.restoreAllMocks();
      });

      it.each([
        [true, true, 1],
        [true, false, 0],
        [false, true, 0]
      ])(
        'should refresh search according to canInstall=%s and isDisclaimed=%s',
        async (canInstall, isDisclaimed, expectedSearches) => {
          const model = createModel({
            name: 'Custom registry',
            can_install: canInstall
          });
          const request = jest
            .spyOn(ServerConnection, 'makeRequest')
            .mockImplementation(async () => new Response('[]'));
          model.isDisclaimed = isDisclaimed;

          await model.refresh();

          expect(model.fetchInstalledCount).toBe(1);
          expect(request).toHaveBeenCalledTimes(expectedSearches);
          expect(
            request.mock.calls.filter(([url]) => url.includes('refresh=1'))
          ).toHaveLength(expectedSearches);
        }
      );
    });

    describe('#install()', () => {
      afterEach(() => {
        Dialog.flush();
        jest.restoreAllMocks();
      });

      it('should update the Python package that installed the extension', async () => {
        const request = mockActionReply();
        const model = createModel({ can_install: true });

        await model.install(createPythonEntry(), { useVersion: '5.4.0' });

        expect(JSON.parse(request.mock.calls[0][1].body)).toEqual({
          cmd: 'install',
          extension_name: 'jupyterlab-lsp',
          extension_version: '5.4.0'
        });
      });
    });

    describe('#uninstall()', () => {
      afterEach(() => {
        Dialog.flush();
        jest.restoreAllMocks();
      });

      it('should uninstall the Python package that installed the extension', async () => {
        const request = mockActionReply();
        const model = createModel({ can_install: true });

        await model.uninstall(createPythonEntry());

        expect(JSON.parse(request.mock.calls[0][1].body)).toEqual({
          cmd: 'uninstall',
          extension_name: 'jupyterlab-lsp'
        });
      });
    });

    describe('#fetchInstalled()', () => {
      it('should back refreshInstalled and sort the result by name', async () => {
        const model = createModel({ can_install: false });
        model.customInstalled = [
          createEntry('b-extension'),
          createEntry('a-extension')
        ];
        await model.refreshInstalled();
        expect(model.fetchInstalledCount).toBe(1);
        expect(model.installed.map(entry => entry.name)).toEqual([
          'a-extension',
          'b-extension'
        ]);
      });

      it('should be the override point for an installable manager too', async () => {
        const model = createModel({ can_install: true });
        model.customInstalled = [createEntry('an-extension')];
        await model.refreshInstalled();
        expect(model.fetchInstalledCount).toBe(1);
        expect(model.installed.map(entry => entry.name)).toEqual([
          'an-extension'
        ]);
      });
    });

    describe('#activeKernelNames', () => {
      function createSessionServiceManager(initialKernels: string[] = []): {
        manager: ServiceManager.IManager;
        setKernels: (kernels: string[]) => void;
      } {
        let runningSessions: Session.IModel[] = initialKernels.map(
          (name, i) => ({
            id: `session-${i}`,
            path: `nb-${i}.ipynb`,
            name: `nb-${i}.ipynb`,
            type: 'notebook',
            kernel: { id: `kernel-${i}`, name }
          })
        );
        const sessions = {
          running: () => runningSessions[Symbol.iterator]()
        } as unknown as Session.IManager;
        const runningChanged = new Signal<Session.IManager, Session.IModel[]>(
          sessions
        );
        Object.defineProperty(sessions, 'runningChanged', {
          value: runningChanged
        });
        const manager = {
          sessions
        } as unknown as ServiceManager.IManager;
        return {
          manager,
          setKernels: (kernels: string[]) => {
            runningSessions = kernels.map((name, i) => ({
              id: `session-${i}`,
              path: `nb-${i}.ipynb`,
              name: `nb-${i}.ipynb`,
              type: 'notebook',
              kernel: { id: `kernel-${i}`, name }
            }));
            runningChanged.emit(runningSessions);
          }
        };
      }

      it('should track running session kernel names and emit stateChanged', () => {
        const { manager, setKernels } = createSessionServiceManager();
        PageConfig.setOption('extensionManager', '{}');
        const model = new TestModel(manager);
        models.push(model);
        expect(model.activeKernelNames.size).toBe(0);

        let emitted = 0;
        model.stateChanged.connect(() => {
          emitted += 1;
        });

        setKernels(['python3']);

        expect(model.activeKernelNames.has('python3')).toBe(true);
        expect(emitted).toBe(1);
      });

      it('should initialize activeKernelNames from already running sessions', () => {
        const { manager } = createSessionServiceManager(['custom-py']);
        PageConfig.setOption('extensionManager', '{}');
        const model = new TestModel(manager);
        models.push(model);
        expect(model.activeKernelNames.has('custom-py')).toBe(true);
      });
    });
  });
});
