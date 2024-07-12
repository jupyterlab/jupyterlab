// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  expect,
  galata,
  IJupyterLabPageFixture,
  test
} from '@jupyterlab/galata';
import { stubGitHubUserIcons } from './utils';
import { default as extensionsList } from './data/extensions.json';
import { default as allExtensionsList } from './data/extensions-search-all.json';
import { default as drawioExtensionsList } from './data/extensions-search-drawio.json';
import { JSONExt } from '@lumino/coreutils';

test.use({
  autoGoto: false,
  mockState: galata.DEFAULT_DOCUMENTATION_STATE,
  viewport: { height: 720, width: 1280 }
});

test.describe('Extension Manager', () => {
  test.beforeEach(async ({ page }) => {
    // Mock get extensions list
    await page.route(galata.Routes.extensions, async (route, request) => {
      const url = request.url();
      switch (request.method()) {
        case 'GET':
          if (!url.includes('query')) {
            return route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify(extensionsList)
            });
          } else if (url.includes('query=drawio')) {
            return route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify(drawioExtensionsList)
            });
          } else {
            return route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify(allExtensionsList)
            });
          }
        default:
          return route.continue();
      }
    });
  });

  test('Sidebar', async ({ page }) => {
    await page.goto();
    await openExtensionSidebar(page);

    expect(
      await page.screenshot({ clip: { y: 31, x: 0, width: 283, height: 600 } })
    ).toMatchSnapshot('extensions_default.png');
  });

  test('Warning', async ({ page }) => {
    await page.goto();

    await page.click('[title="Extension Manager"]');
    expect(
      await page.screenshot({ clip: { y: 31, x: 0, width: 283, height: 400 } })
    ).toMatchSnapshot('extensions_disabled.png');
  });

  test('Warning acknowledge', async ({ page }) => {
    await page.goto();

    await openExtensionSidebar(page);

    expect(
      await page.screenshot({ clip: { y: 31, x: 0, width: 283, height: 400 } })
    ).toMatchSnapshot('extensions_enabled.png');
  });

  test('Search', async ({ page }) => {
    await stubGitHubUserIcons(page);

    await page.goto();

    await openExtensionSidebar(page);

    await page
      .locator('.jp-extensionmanager-view')
      .getByRole('searchbox')
      .fill('drawio');

    await page.evaluate(() => {
      (document.activeElement as HTMLElement).blur();
    });

    // We can not wait for extension kept by the keyword as they are already in the DOM
    await page.locator('text=No entries').waitFor();

    expect(
      await page.screenshot({ clip: { y: 31, x: 0, width: 283, height: 600 } })
    ).toMatchSnapshot('extensions_search.png');
  });

  test('Update button', async ({ page }) => {
    await page.goto();
    await openExtensionSidebar(page);

    const waitRequest = page.waitForRequest(request => {
      if (
        request.method() !== 'POST' ||
        !galata.Routes.extensions.test(request.url())
      ) {
        return false;
      }
      const data = request.postDataJSON();
      return (
        data.cmd === 'install' &&
        data.extension_name === '@jupyterlab/geojson-extension' &&
        data.extension_version === '3.2.1'
      );
    });
    await page.getByRole('button', { name: 'Update to 3.2.1' }).click();
    await waitRequest;
  });
});

test.describe('Filtered Extension Manager', () => {
  test('Blocked installed extension', async ({ page }) => {
    // Mock get extensions list
    const extensions = JSONExt.deepCopy(extensionsList);
    extensions[0]['is_allowed'] = false;
    await page.route(galata.Routes.extensions, async (route, request) => {
      switch (request.method()) {
        case 'GET':
          return route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(extensions)
          });
        default:
          return route.continue();
      }
    });
    await page.goto();

    await openExtensionSidebar(page);

    expect(
      await page.screenshot({
        clip: { x: 33, y: 100, width: 250, height: 280 }
      })
    ).toMatchSnapshot('extensions_blocked_list.png');
  });

  test('Allowed installed extension', async ({ page }) => {
    // Mock get extensions list
    const extensions = JSONExt.deepCopy(extensionsList);
    extensions[1]['is_allowed'] = false;
    await page.route(galata.Routes.extensions, async (route, request) => {
      switch (request.method()) {
        case 'GET':
          return route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(extensions)
          });
        default:
          return route.continue();
      }
    });
    await page.goto();

    await openExtensionSidebar(page);

    expect(
      await page.screenshot({
        clip: { x: 33, y: 100, width: 250, height: 280 }
      })
    ).toMatchSnapshot('extensions_allowed_list.png');
  });
});

async function openExtensionSidebar(page: IJupyterLabPageFixture) {
  await page.click('[title="Extension Manager"]');

  await Promise.all([
    page.waitForResponse(new RegExp(`${galata.Routes.extensions}?refresh=0`)),
    page.waitForResponse(
      new RegExp(
        `${galata.Routes.extensions}?query&page=1&per_page=30&refresh=0`
      )
    ),
    page.click('button:has-text("Yes")')
  ]);
  await page
    .locator(
      '.jp-extensionmanager-view >> .jp-AccordionPanel-title[aria-expanded="false"] >> text=Warning'
    )
    .waitFor();

  await page.sidebar.setWidth();
}
