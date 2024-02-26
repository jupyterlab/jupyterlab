// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect, test } from '@jupyterlab/galata';

const DEFAULT_NAME = 'Untitled.ipynb';

test.describe('filebrowser helper', () => {
  test.beforeEach(async ({ page }) => {
    await page.menu.clickMenuItem('File>New>Notebook');

    await page
      .locator('.jp-Dialog')
      .getByRole('button', { name: 'Select Kernel', exact: true })
      .click();

    await page.activity.closeAll();
  });

  test('should open a file', async ({ page }) => {
    await page.filebrowser.open(DEFAULT_NAME);

    expect(await page.activity.isTabActive(DEFAULT_NAME)).toEqual(true);
  });

  test('should activate already opened file', async ({ page }) => {
    await page.menu.clickMenuItem('File>New>Console');

    await page
      .locator('.jp-Dialog')
      .getByRole('button', { name: 'Select Kernel', exact: true })
      .click();

    expect.soft(await page.activity.isTabActive(DEFAULT_NAME)).toEqual(false);
    await page.filebrowser.open(DEFAULT_NAME);
    expect(await page.activity.isTabActive(DEFAULT_NAME)).toEqual(true);
  });

  test('should open the file with another factory', async ({ page }) => {
    await page.filebrowser.open(DEFAULT_NAME);

    await page.filebrowser.open(DEFAULT_NAME, 'Editor');

    await expect(
      page.getByRole('main').getByRole('tab', { name: DEFAULT_NAME })
    ).toHaveCount(2);
  });
});
