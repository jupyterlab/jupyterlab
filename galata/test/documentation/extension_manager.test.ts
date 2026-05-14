// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import type { IJupyterLabPageFixture } from '@jupyterlab/galata';
import { expect, galata, test } from '@jupyterlab/galata';
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

  test('Has no unused style rules', async ({ page }) => {
    // Layer a test-specific mock on top of the describe-level one so a
    // single test can walk through every DOM state the extension-manager
    // rules apply to:
    //   - the first installed entry carries both the error status and the
    //     disallowed flag, so the error/should-be-uninstalled rules match;
    //   - the search endpoint returns real paginated chunks built from
    //     250 fake geojson clones (30 per page → 9 pages), so the full
    //     pagination UI renders including the `...` break node;
    //   - a `query=geojson` request returns an empty array, so the search
    //     section renders the "No entries" listview-message;
    //   - an `install` POST replies with `status: 'error'`, so clicking
    //     Install opens the install-error dialog; every other action
    //     fails with HTTP 500, so `model.actionError` is set and the
    //     header renders an ErrorMessage wrapping a <pre>.
    const installed = JSONExt.deepCopy(extensionsList);
    installed[0]['status'] = 'error';
    installed[0]['is_allowed'] = false;

    const fakeExtensions = Array.from({ length: 250 }, (_, i) => ({
      ...extensionsList[0],
      name: `@jupyterlab/geojson-extension-${i + 1}`,
      description: `Fake extension ${i + 1}`,
      installed: false,
      installed_version: ''
    }));

    const paginate = (
      url: string,
      entries: ReadonlyArray<unknown>
    ): { headers: Record<string, string>; chunk: ReadonlyArray<unknown> } => {
      const params = new URL(url).searchParams;
      const requestedPage = parseInt(params.get('page') ?? '1', 10);
      const perPage = parseInt(params.get('per_page') ?? '30', 10);
      const lastPage = Math.max(1, Math.ceil(entries.length / perPage));
      const start = (requestedPage - 1) * perPage;
      const chunk = entries.slice(start, start + perPage);
      const lastUrl = new URL(url);
      lastUrl.searchParams.set('page', String(lastPage));
      return {
        headers: { Link: `<${lastUrl.toString()}>; rel="last"` },
        chunk
      };
    };

    await page.route(galata.Routes.extensions, async (route, request) => {
      const url = request.url();
      if (request.method() === 'GET') {
        if (!url.includes('query')) {
          return route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(installed)
          });
        }
        if (url.includes('query=geojson')) {
          const { headers } = paginate(url, []);
          return route.fulfill({
            status: 200,
            contentType: 'application/json',
            headers,
            body: JSON.stringify([])
          });
        }
        const { headers, chunk } = paginate(url, fakeExtensions);
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          headers,
          body: JSON.stringify(chunk)
        });
      }
      if (request.method() === 'POST') {
        const body = JSON.parse(request.postData() ?? '{}');
        if (body.cmd === 'install') {
          return route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              status: 'error',
              message: 'forced test failure'
            })
          });
        }
        // uninstall / enable / disable fail with a transport error so the
        // action-error path in the model is triggered.
        return route.fulfill({
          status: 500,
          contentType: 'text/plain',
          body: 'forced server error'
        });
      }
      return route.continue();
    });

    await page.goto();
    await openExtensionSidebar(page);

    // Expand every accordion section so that rules scoped under the warning,
    // installed and discover panels can be matched.
    for (const section of await page
      .locator(
        '.jp-extensionmanager-view >> .jp-AccordionPanel-title[aria-expanded="false"]'
      )
      .all()) {
      await section.click();
    }

    const options = {
      fragments: ['jp-extensionmanager'],
      exclude: []
    };

    // --- State A ---------------------------------------------------------
    // Installed has an entry flagged as both error and disallowed, the
    // search list is paginated with entries, and the install-error dialog
    // is open on top (triggered by clicking Install).
    await page
      .locator(
        '.jp-extensionmanager-entry.jp-extensionmanager-entry-error.jp-extensionmanager-entry-should-be-uninstalled'
      )
      .waitFor();
    await page.locator('.jp-extensionmanager-pagination ul').waitFor();
    // Wait for the `...` break node so `.pagination .break > a` matches.
    await page.locator('.jp-extensionmanager-pagination .break').waitFor();
    await page
      .locator('.jp-extensionmanager-searchresults')
      .getByRole('button', { name: 'Install', exact: true })
      .first()
      .click();
    await page.locator('.jp-Dialog .jp-extensionmanager-dialog').waitFor();
    const unusedA = await page.style.findUnusedStyleRules(options);
    await page
      .locator('.jp-Dialog')
      .getByRole('button', { name: 'Ok' })
      .click();
    await page.locator('.jp-Dialog').waitFor({ state: 'detached' });

    // --- State B ---------------------------------------------------------
    // Search `geojson` so the installed section keeps rendering the
    // flagged entry (its name matches the query) while the search
    // section renders the "No entries" listview-message next to the
    // pagination UI.
    await page
      .locator('.jp-extensionmanager-view')
      .getByRole('searchbox')
      .fill('geojson');
    await page.evaluate(() => {
      (document.activeElement as HTMLElement).blur();
    });
    await page
      .locator(
        '.jp-extensionmanager-searchresults .jp-extensionmanager-listview-message',
        { hasText: 'No entries' }
      )
      .waitFor();
    const unusedB = await page.style.findUnusedStyleRules(options);

    // --- State C ---------------------------------------------------------
    // Withdraw the disclaimer so the "Yes" (disclaimer-enable) button is
    // rendered. The previously loaded lists stay in the DOM because the
    // model does not clear them on un-disclaim.
    await page.locator('.jp-extensionmanager-disclaimer-disable').click();
    await page.locator('.jp-extensionmanager-disclaimer-enable').waitFor();
    const unusedC = await page.style.findUnusedStyleRules(options);

    // --- State D ---------------------------------------------------------
    // Re-disclaim, then click Uninstall on the flagged installed entry.
    // The POST fails with HTTP 500, which rejects the action request and
    // sets `model.actionError`. The header then renders an ErrorMessage
    // wrapping a <pre>, exercising `.jp-extensionmanager-error pre`.
    await page.locator('.jp-extensionmanager-disclaimer-enable').click();
    const uninstallBtn = page
      .locator('.jp-extensionmanager-installedlist')
      .getByRole('button', { name: 'Uninstall', exact: true });
    await uninstallBtn.click();
    await page
      .locator('.jp-extensionmanager-header .jp-extensionmanager-error pre')
      .waitFor();
    const unusedD = await page.style.findUnusedStyleRules(options);

    // A rule is only truly unused if it failed to match in every state.
    const unused = unusedA.filter(
      rule =>
        unusedB.includes(rule) &&
        unusedC.includes(rule) &&
        unusedD.includes(rule)
    );
    expect(unused).toEqual([]);
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
