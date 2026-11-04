// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect, test } from '@jupyterlab/galata';

test.describe('Local links', () => {
  const LINK_FILE = 'links.md';

  test('Directory link opens the directory in the file browser', async ({
    page,
    tmpPath
  }) => {
    await page.contents.createDirectory(`${tmpPath}/subdir`);
    await page.contents.uploadContent(
      '[go to subdir](subdir)',
      'text',
      `${tmpPath}/${LINK_FILE}`
    );
    await page.filebrowser.open(`${tmpPath}/${LINK_FILE}`, 'Markdown Preview');
    await page.locator('.jp-MarkdownViewer').waitFor();

    await page
      .locator('.jp-MarkdownViewer a', { hasText: 'go to subdir' })
      .click();

    await expect
      .poll(() => page.filebrowser.getCurrentDirectory())
      .toBe(`${tmpPath}/subdir`);
  });

  test('File link still opens the file', async ({ page, tmpPath }) => {
    await page.contents.uploadContent('hello', 'text', `${tmpPath}/note.txt`);
    await page.contents.uploadContent(
      '[open note](note.txt)',
      'text',
      `${tmpPath}/${LINK_FILE}`
    );
    await page.filebrowser.open(`${tmpPath}/${LINK_FILE}`, 'Markdown Preview');
    await page.locator('.jp-MarkdownViewer').waitFor();

    await page
      .locator('.jp-MarkdownViewer a', { hasText: 'open note' })
      .click();

    await expect(page.activity.getTabLocator('note.txt')).toBeVisible();
  });
});
