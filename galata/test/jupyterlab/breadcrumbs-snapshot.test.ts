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

  test('should show editable breadcrumbs with completion menu', async ({
    page,
    tmpPath
  }) => {
    // Create a few sibling directories so the completion menu has entries
    await page.contents.createDirectory(`${tmpPath}/alpha`);
    await page.contents.createDirectory(`${tmpPath}/beta`);
    await page.contents.createDirectory(`${tmpPath}/gamma`);

    // Navigate into one of them so the breadcrumb path is non-empty
    await page.evaluate(async p => {
      await window.jupyterapp.commands.execute('filebrowser:open-path', {
        path: p
      });
    }, `${tmpPath}/alpha`);
    await page.locator(`${BREADCRUMB_SELECTOR} >> text=alpha`).waitFor();

    // Click on the empty space of the breadcrumb bar to enter edit mode
    const crumbs = page.locator(BREADCRUMB_SELECTOR);
    const box = (await crumbs.boundingBox())!;
    await crumbs.click({ position: { x: box.width - 10, y: box.height / 2 } });

    // Wait for the path input and suggestions to appear
    const input = page.locator('.jp-PathNavigator > input');
    await input.waitFor({ state: 'visible' });

    // Clear and type the parent path to show all sibling directories
    await input.fill(`${tmpPath}/`);

    const suggestions = page.locator('.jp-PathNavigator-suggestions');
    await suggestions.waitFor({ state: 'visible' });
    await suggestions.locator('li').first().waitFor();

    // Capture the whole file browser so the absolutely-positioned
    // suggestions dropdown is included in the screenshot.
    const fileBrowser = page.locator('.jp-FileBrowser');
    await expect(fileBrowser).toHaveScreenshot(
      'breadcrumbs-editable-with-completion.png'
    );
  });
});
