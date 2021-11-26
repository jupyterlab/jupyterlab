// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { IJupyterLabPageFixture, test } from '@jupyterlab/galata';
import { expect } from '@playwright/test';

const fileName = 'notebook.ipynb';

// const menuPaths = ['File', 'Edit', 'View', 'Run', 'Kernel', 'Help'];

async function populateNotebook(page: IJupyterLabPageFixture) {
  await page.notebook.setCell(0, 'markdown', '# Heading 1');
  await page.notebook.addCell('code', '1+1');
  await page.notebook.addCell('code', '2+2');
}

test.describe('Collapsible Headings', () => {
  // create an empty notebook for each test
  test.beforeEach(async ({ page }) => {
    await page.notebook.createNew(fileName);
  });

  test('Show Collapser Unselected', async ({ page }) => {
    await populateNotebook(page);
    await page.notebook.run();
    expect(await (await page.notebook.getCell(0)).screenshot()).toMatchSnapshot(
      'showHCB_heading_unselected.png'
    );
  });

  test('Show Collapser Selected', async ({ page }) => {
    await populateNotebook(page);
    await page.notebook.run();
    await page.notebook.selectCells(0);
    expect(await (await page.notebook.getCell(0)).screenshot()).toMatchSnapshot(
      'showHCB_heading_selected.png'
    );
  });

  /*
  test('Create a Markdown cell', async ({ page }) => {
    await page.notebook.addCell(
      'markdown',
      '## This is **bold** and *italic* [link to jupyter.org!](http://jupyter.org)'
    );
    await page.notebook.runCell(1, true);
    expect(await page.notebook.getCellCount()).toBe(2);
    expect(await page.notebook.getCellType(1)).toBe('markdown');
  });

  test('Create a Code cell', async ({ page }) => {
    await page.notebook.addCell('code', '2 ** 3');
    expect(await page.notebook.getCellCount()).toBe(2);
    expect(await page.notebook.getCellType(1)).toBe('code');
  });

  test('Save Notebook', async ({ page }) => {
    await populateNotebook(page);

    await expect(page.notebook.save()).resolves.not.toThrow();
  });

  menuPaths.forEach(menuPath => {
    test(`Open menu item ${menuPath}`, async ({ page, sessions }) => {
      // Wait for kernel to be idle as some menu depend of kernel information
      expect(
        await page.waitForSelector(`#jp-main-statusbar >> text=Idle`)
      ).toBeTruthy();

      await page.menu.open(menuPath);
      expect(await page.menu.isOpen(menuPath)).toBeTruthy();

      const imageName = `opened-menu-${menuPath.replace(/>/g, '-')}.png`;
      const menu = await page.menu.getOpenMenu();
      expect(await menu.screenshot()).toMatchSnapshot(imageName.toLowerCase());
    });
  });

  test('Run cells', async ({ page }) => {
    await populateNotebook(page);
    await page.notebook.run();
    await page.notebook.save();
    const imageName = 'run-cells.png';

    expect((await page.notebook.getCellTextOutput(2))[0]).toBe('8');

    const nbPanel = await page.notebook.getNotebookInPanel();

    expect(await nbPanel.screenshot()).toMatchSnapshot(imageName);
  });

  test('Toggle Dark theme', async ({ page }) => {
    await populateNotebook(page);
    await page.notebook.run();
    await page.theme.setDarkTheme();
    const nbPanel = await page.notebook.getNotebookInPanel();
    const imageName = 'dark-theme.png';

    expect(await nbPanel.screenshot()).toMatchSnapshot(imageName);
  });
  */
});
