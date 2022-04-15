// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect, IJupyterLabPageFixture, test } from '@jupyterlab/galata';

const fileName = 'notebook.ipynb';

const menuPaths = ['File', 'Edit', 'View', 'Run', 'Kernel', 'Help'];

async function populateNotebook(page: IJupyterLabPageFixture) {
  await page.notebook.setCell(0, 'raw', 'Just a raw cell');
  await page.notebook.addCell(
    'markdown',
    '## This is **bold** and *italic* [link to jupyter.org!](http://jupyter.org)'
  );
  await page.notebook.addCell('code', '2 ** 3');
  await page.notebook.addCell(
    'code',
    `
from IPython.display import display

display({
    "application/vnd.vegalite.v3+json": {
        "$schema": "https://vega.github.io/schema/vega-lite/v3.json",
        "description": "A simple bar chart with embedded data.",
        "data": {
            "values": [
                {"a": "A", "b": 28}, {"a": "B", "b": 55}, {"a": "C", "b": 43},
                {"a": "D", "b": 91}, {"a": "E", "b": 81}, {"a": "F", "b": 53},
                {"a": "G", "b": 19}, {"a": "H", "b": 87}, {"a": "I", "b": 52}
            ]
        },
        "mark": "bar",
        "encoding": {
            "x": {"field": "a", "type": "ordinal"},
            "y": {"field": "b", "type": "quantitative"}
        },
        "metadata": {
            "theme": "dark"
        },
    }
}, raw=True)
`
  );
}

test.describe('Notebook Create', () => {
  test.beforeEach(async ({ page }) => {
    await page.notebook.createNew(fileName);
  });

  test('Create a Raw cell', async ({ page }) => {
    await page.notebook.setCell(0, 'raw', 'Just a raw cell');
    expect(await page.notebook.getCellCount()).toBe(1);
    expect(await page.notebook.getCellType(0)).toBe('raw');
  });

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
});
