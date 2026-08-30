/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { expect, test } from '@jupyterlab/galata';
import type { Locator } from '@playwright/test';

const BREADCRUMB_SELECTOR = '.jp-BreadCrumbs';
const SETTING_ID = '@jupyterlab/filebrowser-extension:browser';

test.describe('Adaptive Breadcrumbs Snapshots', () => {
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

    // Keep snapshot text stable while preserving isolated tmpPath on disk.
    const crumbs = page.locator(BREADCRUMB_SELECTOR);
    await mockPath(crumbs, tmpPath);

    // Take snapshot of breadcrumbs container
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

    // Keep snapshot text stable while preserving isolated tmpPath on disk.
    await mockPath(input, tmpPath);

    // Capture the whole file browser so the absolutely-positioned
    // suggestions dropdown is included in the screenshot.
    const fileBrowser = page.locator('.jp-FileBrowser');
    await expect(fileBrowser).toHaveScreenshot(
      'breadcrumbs-editable-with-completion.png'
    );
  });
});

async function mockPath(locator: Locator, tmpPath: string): Promise<void> {
  await locator.evaluate(
    (element, { stablePath, dynamicPath }) => {
      if (element instanceof HTMLInputElement) {
        element.value = element.value.replace(dynamicPath, stablePath);
      } else {
        const walk = (node: Node) => {
          if (node.nodeType === Node.TEXT_NODE) {
            node.textContent = node.textContent!.replace(
              dynamicPath,
              stablePath
            );
          } else {
            node.childNodes.forEach(walk);
          }
        };
        walk(element);
      }
    },
    { stablePath: 'test-breadcrumbs', dynamicPath: tmpPath }
  );
}
