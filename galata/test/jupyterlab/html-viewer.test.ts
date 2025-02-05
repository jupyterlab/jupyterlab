/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { expect, galata, test } from '@jupyterlab/galata';
import * as path from 'path';

const fileName = 'test.html';

test.describe('HTML Viewer', () => {
  test.use({ tmpPath: 'test-html-viewer' });

  test.beforeAll(async ({ request, tmpPath }) => {
    const contents = galata.newContentsHelper(request);
    await contents.uploadFile(
      path.resolve(__dirname, `./notebooks/${fileName}`),
      `${tmpPath}/${fileName}`
    );
  });

  test.beforeEach(async ({ page }) => {
    await page.getByRole('listitem', { name: fileName }).dblclick();
    await page.waitForSelector('iframe[src^="blob:"]', { timeout: 5000 });
  });

  test('should notify links are blocked for untrusted file', async ({
    page
  }) => {
    const frame = page.frame({ url: url => url.protocol == 'blob:' });
    await frame!.getByRole('link', { name: 'GitHub' }).hover();

    const warningCount = await frame!.evaluate(() => {
      let count = 0;
      for (const link of document.querySelectorAll('a')) {
        count +=
          window.getComputedStyle(link, '::after').content ==
          '"Action disabled as the file is not trusted."'
            ? 1
            : 0;
      }
      return count;
    });

    expect(warningCount).toEqual(1);
  });

  test('should allow links for trusted file', async ({ page }) => {
    await page
      .getByRole('button', { name: 'Trust HTML' })
      .click({ force: true });
    const frame = page.frame({ url: url => url.protocol == 'blob:' });
    await frame!.getByRole('link', { name: 'GitHub' }).hover();

    const warningCount = await frame!.evaluate(() => {
      let count = 0;
      for (const link of document.querySelectorAll('a')) {
        count +=
          window.getComputedStyle(link, '::after').content ==
          '"Action disabled as the file is not trusted."'
            ? 1
            : 0;
      }
      return count;
    });

    expect(warningCount).toEqual(0);
  });
});
