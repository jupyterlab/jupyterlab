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
 * A `ListModel` subclass that serves installed extensions from a custom
 * in-memory source, mirroring how a downstream distribution (e.g. a
 * server-less deployment) provides its own model through the
 * `IExtensionManager` token. It also exposes the protected `search` method so
 * the read-only behavior can be asserted directly.
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

  protected async fetchInstalled(): Promise<IEntry[]> {
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

    describe('read-only listing (cannot install)', () => {
      it('should be disclaimed automatically when it cannot install', () => {
        const model = createModel({ can_install: false });
        expect(model.canInstall).toBe(false);
        // Nothing remote to disclaim, so the security warning is pre-accepted
        // and the listing loads without user consent.
        expect(model.isDisclaimed).toBe(true);
      });

      it('should require disclaiming when it can install', () => {
        const model = createModel({ can_install: true });
        expect(model.isDisclaimed).toBe(false);
      });
    });

    describe('#search()', () => {
      it('should be a no-op re-render when it cannot install', async () => {
        const model = createModel({ can_install: false });
        let changed = 0;
        model.stateChanged.connect(() => {
          changed++;
        });
        // Re-render once so the query filters the local list, but never reach
        // the server.
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
