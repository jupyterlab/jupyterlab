// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect, test } from '@jupyterlab/galata';

const NOTEBOOK_NAME = 'test-notebook-no-kernel.ipynb';

test.describe('Notebook No Kernel', () => {
  test.beforeEach(async ({ page }) => {
    await page.notebook.createNew(NOTEBOOK_NAME);
    await page.notebook.save();
    await page.notebook.close();

    // Open notebook with "Open With > Notebook (no kernel)" from context menu
    await page.sidebar.openTab('filebrowser');
    await page.click(`.jp-DirListing-item span:has-text("${NOTEBOOK_NAME}")`, {
      button: 'right'
    });
    expect(await page.menu.isAnyOpen()).toBe(true);
    await page.hover('text=Open With');
    await page.click('text=Notebook (no kernel)');
    await page.waitForSelector('.jp-NotebookPanel');
  });

  test('Should show "No Kernel" message when opening notebook', async ({
    page
  }) => {
    await expect(page.getByTitle('Switch kernel')).toHaveText('No Kernel');
    expect(await page.activity.isTabActive(NOTEBOOK_NAME)).toBe(true);
  });

  test('Should maintain no kernel state when adding cells', async ({
    page
  }) => {
    await page.notebook.setCell(0, 'code', 'print("Hello, World!")');
    await page.notebook.addCell('markdown', '# Test Header');

    await expect(page.getByTitle('Switch kernel')).toHaveText('No Kernel');
    expect(await page.notebook.getCellCount()).toBe(2);
  });

  test('Should not auto-start kernel when reopening notebook', async ({
    page
  }) => {
    await page.notebook.setCell(0, 'code', 'print("test")');
    await page.notebook.save();
    await page.menu.clickMenuItem('File>Close Tab');

    await page.filebrowser.open(NOTEBOOK_NAME);

    await expect(page.getByTitle('Switch kernel')).toHaveText('No Kernel');
  });

  test('Should prompt for kernel when executing code cell', async ({
    page
  }) => {
    await page.notebook.setCell(0, 'code', 'print("Hello, World!")');

    await page.keyboard.press('Shift+Enter');

    await expect(page.locator('.jp-Dialog')).toBeVisible();
    await expect(
      page.locator('.jp-Dialog-header').getByText('Select Kernel')
    ).toBeVisible();
  });
});
