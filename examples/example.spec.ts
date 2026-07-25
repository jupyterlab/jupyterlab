/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { ConsoleMessage, expect, test } from '@playwright/test';

const PAGE_URL = `${process.env['BASE_URL']}`;
const EXAMPLE_NAME = process.env['EXAMPLE_NAME'];

test.setTimeout(120000);

test('should load the example', async ({ page }) => {
  console.info('Navigating to page:', PAGE_URL);

  let errorLogs = 0;
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

  await page.goto(PAGE_URL);

  await expect.soft(page.locator('#jupyter-config-data')).toHaveCount(1);

  await waitForTestEnd;

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
