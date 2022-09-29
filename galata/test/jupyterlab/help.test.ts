/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { expect, test } from '@jupyterlab/galata';

test('Switch back and forth to reference page', async ({ page }) => {
  // The goal is to test switching back and forth with a tab containing an iframe
  const notebookFilename = 'test-switch-doc-notebook';
  const cellContent = '# First cell';
  await page.notebook.createNew(notebookFilename);

  await page.notebook.setCell(0, 'markdown', cellContent);

  await page.menu.clickMenuItem('Help>Jupyter Reference');

  await expect(
    page
      .frameLocator('iframe[src="https://jupyter.org/documentation"]')
      .locator('h1')
      .first()
  ).toHaveText('Jupyter Project Documentation#');

  await page.activity.activateTab(notebookFilename);

  await page.locator('.jp-MarkdownCell .jp-InputArea-editor').waitFor();

  await expect(
    page.locator('.jp-MarkdownCell .jp-InputArea-editor')
  ).toHaveText(cellContent);
});
