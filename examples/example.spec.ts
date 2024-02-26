/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { ConsoleMessage, expect, test } from '@playwright/test';

const URL = `${process.env['BASE_URL']}`;

test.setTimeout(120000);

test('should load the example', async ({ page }) => {
  console.info('Navigating to page:', URL);

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

  await page.goto(URL);

  // Wait for the local file to redirect on notebook >= 6.0. Refs:
  // https://jupyter-notebook.readthedocs.io/en/stable/changelog.html?highlight=redirect
  // https://stackoverflow.com/q/46948489/425458
  await page.waitForURL('http://**');

  await expect.soft(page.locator('#jupyter-config-data')).toHaveCount(1);

  await waitForTestEnd;

  if (process.env['TEST_SNAPSHOT'] === '1') {
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    expect
      .soft(
        await page.screenshot({
          mask: [page.locator('.jp-DirListing-itemModified')]
        })
      )
      .toMatchSnapshot('example.png');
  }

  expect(errorLogs).toEqual(0);
});
