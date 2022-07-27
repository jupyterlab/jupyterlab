// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  expect,
  galata,
  IJupyterLabPageFixture,
  test
} from '@jupyterlab/galata';
import { setSidebarWidth, stubGitHubUserIcons } from './utils';
import { default as extensionsList } from './data/extensions.json';
import { default as allExtensionsList } from './data/extensions-search-all.json';

test.use({
  autoGoto: false,
  mockState: galata.DEFAULT_DOCUMENTATION_STATE,
  viewport: { height: 720, width: 1280 }
});

test.describe('Extension Manager', () => {
  test.beforeEach(async ({ page }) => {
    // Mock get extensions list
    await page.route(galata.Routes.extensions, async (route, request) => {
      switch (request.method()) {
        case 'GET':
          return route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(extensionsList)
          });
        default:
          return route.continue();
      }
    });

    await page.route(
      'https://registry.npmjs.org/-/v1/search*text=+keywords%3A%22jupyterlab-extension%22*',
      async (route, request) => {
        switch (request.method()) {
          case 'GET':
            return route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify(allExtensionsList)
            });
          default:
            return route.continue();
        }
      }
    );
  });

  test('Sidebar', async ({ page }) => {
    await page.goto();

    await page.pause();
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

    await page.fill(
      '.jp-extensionmanager-view >> [placeholder="SEARCH"]',
      'drawio'
    );

    await page.keyboard.press('Tab');

    // We can not wait for extension kept by the keyword as they are already in the DOM
    await page.waitForSelector('text=No entries');

    expect(
      await page.screenshot({ clip: { y: 31, x: 0, width: 283, height: 600 } })
    ).toMatchSnapshot('extensions_search.png');
  });
});

async function openExtensionSidebar(page: IJupyterLabPageFixture) {
  await page.click('[title="Extension Manager"]');

  await page.click('button:has-text("Enable")');
  await page.waitForSelector('button:has-text("Disable")');
  await page.click(
    '.jp-extensionmanager-view >> .jp-AccordionPanel-title >> text=Warning'
  );

  await setSidebarWidth(page);
}
