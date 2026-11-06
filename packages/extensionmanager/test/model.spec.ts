// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

// The extension entries mirror the snake_case JSON returned by the server.
/* eslint-disable camelcase */

import { PageConfig } from '@jupyterlab/coreutils';
import type { ServiceManager } from '@jupyterlab/services';
import { ServiceManagerMock } from '@jupyterlab/services/lib/testutils';
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
  });
});
