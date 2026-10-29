/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { ConsoleMessage, expect, test } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const PAGE_URL = `${process.env['BASE_URL']}`;
const EXAMPLE_NAME = process.env['EXAMPLE_NAME'];
const REPO_ROOT = `${process.env['REPO_ROOT']}`;

const UNPKG_SERVICES_URL =
  'https://unpkg.com/@jupyterlab/services@*/dist/dist/index.js';

test.setTimeout(120000);

test('should load the example', async ({ page }) => {
  console.info('Navigating to page:', PAGE_URL);

  let errorLogs = 0;
  const pageErrors: string[] = [];
  const routedUrls: string[] = [];
  let testEnded: (value: string | PromiseLike<string>) => void;
  const waitForTestEnd = new Promise<string>(resolve => {
    testEnded = resolve;
  });

  const handleMessage = async (msg: ConsoleMessage) => {
    const text = msg.text();
    console.log(msg.type(), '>>', text);

    if (msg.type() === 'error') {
      errorLogs += 1;
    }

    const lower = text.toLowerCase();
    if (lower === 'example started!' || lower === 'test complete!') {
      testEnded(text);
    }
  };

  page.on('console', handleMessage);

  page.on('pageerror', error => {
    console.log('pageerror >>', error.stack ?? error.message);
    errorLogs += 1;
    pageErrors.push(error.message);
    testEnded(error.message);
  });

  if (EXAMPLE_NAME === 'browser-require') {
    // Test the bundle built from this checkout; the next test covers unpkg.
    const bundle = path.join(REPO_ROOT, 'packages/services/dist/dist/index.js');
    expect(
      fs.existsSync(bundle),
      `${bundle} is missing: run "jlpm build:all" in packages/services`
    ).toBe(true);
    await page.route(UNPKG_SERVICES_URL, route => {
      console.log('route >>', route.request().url(), '->', bundle);
      routedUrls.push(route.request().url());
      return route.fulfill({ path: bundle });
    });
  }

  await page.goto(PAGE_URL);

  await expect.soft(page.locator('#jupyter-config-data')).toHaveCount(1);

  await waitForTestEnd;

  expect(pageErrors, 'Uncaught exceptions in the page').toEqual([]);

  if (EXAMPLE_NAME === 'browser-require') {
    expect(
      routedUrls,
      `The page did not request ${UNPKG_SERVICES_URL}`
    ).toHaveLength(1);
  }

  if (EXAMPLE_NAME === 'localization') {
    const root = page.getByTestId('localization-example');
    const languageSelect = page.getByTestId('language-select');
    const title = page.getByTestId('translated-title');
    const itemCount = page.getByTestId('item-count');

    await expect(root).toBeVisible();
    await expect(title).toHaveText('Localization example');
    await expect(itemCount).toHaveText('There is 1 item');
    await expect(languageSelect.locator('option')).toHaveCount(2);
    expect(
      await languageSelect
        .locator('option')
        .evaluateAll(options =>
          options.map(option => option.getAttribute('value'))
        )
    ).toEqual(['en', 'es']);

    const spanishResponsePromise = page.waitForResponse(response =>
      new URL(response.url()).pathname.endsWith('/example/api/translations/es')
    );
    await languageSelect.selectOption('es');
    const spanishResponse = await spanishResponsePromise;

    expect(spanishResponse.ok()).toBe(true);
    expect(await spanishResponse.json()).toMatchObject({
      data: {
        jupyterlab_localization_example: {
          'Localization example': ['Ejemplo de localización']
        }
      },
      message: ''
    });

    await expect(title).toHaveText('Ejemplo de localización');
    await expect(itemCount).toHaveText('Hay 1 elemento');
    await expect(page.locator('html')).toHaveAttribute('lang', 'es');

    await page.getByRole('button', { name: 'Añadir elemento' }).click();
    await expect(itemCount).toHaveText('Hay 2 elementos');

    await languageSelect.selectOption('en');
    await expect(title).toHaveText('Localization example');
    await expect(itemCount).toHaveText('There are 2 items');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  }

  if (process.env['TEST_SNAPSHOT'] === '1') {
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    expect
      .soft(
        await page.screenshot({
          mask: [page.locator('.jp-DirListing-itemModified')],
          style: `
            .cm-cursorLayer {
              animation: none !important;
            }

            .jp-ConsolePanel .cm-cursor {
              visibility: hidden !important;
            }
          `
        })
      )
      .toMatchSnapshot('example.png');
  }

  expect(errorLogs).toEqual(0);
});

if (EXAMPLE_NAME === 'browser-require') {
  test('should fetch @jupyterlab/services from unpkg', async ({ request }) => {
    let body = '';
    await expect(async () => {
      const response = await request.get(UNPKG_SERVICES_URL, {
        timeout: 20000
      });
      expect(response.status()).toBe(200);
      body = await response.text();
    }, `unpkg did not serve ${UNPKG_SERVICES_URL}`).toPass({
      intervals: [5000, 15000, 30000],
      timeout: 100000
    });

    expect(body).toContain('define("@jupyterlab/services",');
  });
}
