/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { expect, galata, test } from '@jupyterlab/galata';

const BREADCRUMB_SELECTOR = '.jp-BreadCrumbs';
const SETTING_ID = '@jupyterlab/filebrowser-extension:browser';

test.use({ tmpPath: 'test-breadcrumbs' });

test.describe('Adaptive Breadcrumbs Snapshots', () => {
  test.beforeAll(async ({ request, tmpPath }) => {
    const contents = galata.newContentsHelper(request);
    await contents.createDirectory(tmpPath);
  });

  test.afterAll(async ({ request, tmpPath }) => {
    const contents = galata.newContentsHelper(request);
    await contents.deleteDirectory(tmpPath);
  });

  test('should render correctly with wide sidebar', async ({
    page,
    tmpPath
  }) => {
    // Create directory structure
    const path = '/dir1/dir2/dir3/Longer_dir4/dir5';
    await page.contents.createDirectory(`${tmpPath}/${path}`);

    // Set a wide viewport to accommodate sidebar expansion
    await page.setViewportSize({ width: 1600, height: 720 });

    // Wait for file browser to stabilize
    await page.locator(BREADCRUMB_SELECTOR).waitFor();

    // Configure Breadcrumbs Settings
    await page.evaluate(async pluginId => {
      const settingsManager = window.jupyterapp.serviceManager.settings;
      const raw = JSON.stringify({
        breadcrumbs: {
          minimumLeftItems: 1,
          minimumRightItems: 2
        }
      });
      await settingsManager.save(pluginId, raw);
    }, SETTING_ID);

    // Navigate to the target directory
    await page.evaluate(async p => {
      await window.jupyterapp.commands.execute('filebrowser:open-path', {
        path: p
      });
    }, `${tmpPath}/${path}`);

    // Wait for breadcrumbs to reflect the navigated path
    await page.locator(`${BREADCRUMB_SELECTOR} >> text=dir5`).waitFor();

    // Widen sidebar
    await page.sidebar.setWidth(800);

    // Wait for breadcrumb recalculation after resize
    await page.locator(`${BREADCRUMB_SELECTOR} >> text=dir2`).waitFor();

    // Take snapshot of breadcrumbs container
    const crumbs = page.locator(BREADCRUMB_SELECTOR);
    await expect(crumbs).toHaveScreenshot('breadcrumbs.png');
  });
});
