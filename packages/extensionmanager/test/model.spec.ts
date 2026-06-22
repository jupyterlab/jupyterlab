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
 * its display-only behavior can be asserted directly.
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

    describe('#displayOnly', () => {
      it('should default to false when no metadata is provided', () => {
        const model = createModel();
        expect(model.displayOnly).toBe(false);
      });

      it('should reflect the display_only metadata flag', () => {
        const model = createModel({ display_only: true });
        expect(model.displayOnly).toBe(true);
      });

      it('should be disclaimed automatically when display-only', () => {
        const model = createModel({ display_only: true });
        expect(model.isDisclaimed).toBe(true);
      });

      it('should not be disclaimed by default', () => {
        const model = createModel();
        expect(model.isDisclaimed).toBe(false);
      });
    });

    describe('#search()', () => {
      it('should be a no-op re-render when display-only', async () => {
        const model = createModel({ display_only: true });
        let changed = 0;
        model.stateChanged.connect(() => {
          changed++;
        });
        await expect(model.search()).resolves.toBeUndefined();
        // Re-render once so the query filters the local list, but never reach
        // the server.
        expect(changed).toBe(1);
      });

      it('should reject when not disclaimed and not display-only', async () => {
        const model = createModel();
        await expect(model.search()).rejects.toBe(
          'Installation warning is not disclaimed.'
        );
      });
    });

    describe('#fetchInstalled()', () => {
      it('should back refreshInstalled and sort the result by name', async () => {
        const model = createModel();
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

      it('should provide the installed list for a display-only model', async () => {
        const model = createModel({ display_only: true });
        model.customInstalled = [createEntry('an-extension')];
        await model.refreshInstalled();
        expect(model.installed.map(entry => entry.name)).toEqual([
          'an-extension'
        ]);
      });
    });
  });
});
