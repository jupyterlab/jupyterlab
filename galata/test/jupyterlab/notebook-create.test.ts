// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect, IJupyterLabPageFixture, test } from '@jupyterlab/galata';

const fileName = 'notebook.ipynb';
const TRUSTED_SELECTOR = 'svg[data-icon="ui-components:trusted"]';

const menuPaths = ['File', 'Edit', 'View', 'Run', 'Kernel', 'Help'];

async function populateNotebook(page: IJupyterLabPageFixture) {
  await page.notebook.setCell(0, 'raw', 'Just a raw cell');
  await page.notebook.addCell(
    'markdown',
    '## This is **bold** and *italic* [link to jupyter.org!](http://jupyter.org)'
  );
  await page.notebook.addCell('code', '2 ** 3');
}

test.describe('Notebook Create', () => {
  test.beforeEach(async ({ page }) => {
    await page.notebook.createNew(fileName);
  });

  test('Create a Raw cell', async ({ page }) => {
    await page.notebook.setCell(0, 'raw', 'Just a raw cell');
    expect(await page.notebook.getCellCount()).toBe(1);
    expect(await page.notebook.getCellType(0)).toBe('raw');
    await expect(page.locator(TRUSTED_SELECTOR)).toHaveCount(1);
  });

  test('Create a Markdown cell', async ({ page }) => {
    await page.notebook.addCell(
      'markdown',
      '## This is **bold** and *italic* [link to jupyter.org!](http://jupyter.org)'
    );
    await page.notebook.runCell(1, true);
    expect(await page.notebook.getCellCount()).toBe(2);
    expect(await page.notebook.getCellType(1)).toBe('markdown');
    await expect(page.locator(TRUSTED_SELECTOR)).toHaveCount(1);
  });

  test('Create a Code cell', async ({ page }) => {
    await page.notebook.addCell('code', '2 ** 3');
    expect(await page.notebook.getCellCount()).toBe(2);
    expect(await page.notebook.getCellType(1)).toBe('code');
    await expect(page.locator(TRUSTED_SELECTOR)).toHaveCount(1);
  });

  test('Save Notebook', async ({ page }) => {
    await populateNotebook(page);

    await expect(page.notebook.save()).resolves.not.toThrow();
  });

  menuPaths.forEach(menuPath => {
    test(`Open menu item ${menuPath}`, async ({ page, sessions }) => {
      // Wait for kernel to be idle as some menu depend of kernel information
      await expect(
        page.locator(`#jp-main-statusbar >> text=Idle`).first()
      ).toHaveCount(1);

      await page.menu.openLocator(menuPath);
      expect(await page.menu.isOpen(menuPath)).toBeTruthy();

      const imageName = `opened-menu-${menuPath.replace(/>/g, '-')}.png`;
      const menu = await page.menu.getOpenMenuLocator();
      expect(await menu!.screenshot()).toMatchSnapshot(imageName.toLowerCase());
    });
  });

  test('Run cells', async ({ page }) => {
    await populateNotebook(page);
    await page.notebook.run();
    await page.notebook.save();
    const imageName = 'run-cells.png';

    expect((await page.notebook.getCellTextOutput(2))[0]).toBe('8');
    await expect(page.locator(TRUSTED_SELECTOR)).toHaveCount(1);

    const nbPanel = await page.notebook.getNotebookInPanelLocator();

    expect(await nbPanel!.screenshot()).toMatchSnapshot(imageName);
  });

  test('Toggle Dark theme', async ({ page }) => {
    await populateNotebook(page);
    await page.notebook.run();
    await page.theme.setDarkTheme();
    const nbPanel = await page.notebook.getNotebookInPanelLocator();
    const imageName = 'dark-theme.png';

    expect(await nbPanel!.screenshot()).toMatchSnapshot(imageName);
  });
});
