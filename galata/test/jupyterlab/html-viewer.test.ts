/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { expect, test } from '@jupyterlab/galata';

test.describe('HTML Viewer', () => {
  test.beforeEach(async ({ page }) => {
    await page.menu.clickMenuItem('File>New>Text File');

    await page.getByRole('main').getByRole('textbox').fill(`<html>
<body>
    <div style="height: 300px;"></div>
    <a href="https://github.com" target="_blank">GitHub</a>
</body>
</html>`);

    await page.menu.clickMenuItem('File>Save Text');

    await page.getByPlaceholder('File name').fill('test.html');
    await page.getByRole('button', { name: 'Rename' }).click();

    await page.getByRole('listitem', { name: 'test.html' }).dblclick();
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
