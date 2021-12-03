// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { IJupyterLabPageFixture, test } from '@jupyterlab/galata';
import { expect } from '@playwright/test';

const fileName = 'notebook.ipynb';

async function populateNotebook(page: IJupyterLabPageFixture) {
  await page.notebook.setCell(0, 'raw', 'Just a raw cell');
  await page.notebook.addCell(
    'markdown',
    '## This is **bold** and *italic* [link to jupyter.org!](http://jupyter.org)'
  );
  await page.notebook.addCell('code', '2 ** 3');
  // await page.notebook.runCell(2, true);
}

test.describe('Notebook Toolbar', () => {
  test.beforeEach(async ({ page }) => {
    await page.notebook.createNew(fileName);
    await populateNotebook(page);
  });

  test('Insert cells', async ({ page }) => {
    const imageName = 'insert-cells.png';
    await page.notebook.selectCells(0);
    await page.notebook.clickToolbarItem('insert');
    await page.notebook.selectCells(2);
    await page.notebook.clickToolbarItem('insert');
    const nbPanel = await page.notebook.getNotebookInPanel();

    expect(await nbPanel.screenshot()).toMatchSnapshot(imageName);
  });

  test('Copy-Paste cell', async ({ page }) => {
    const imageName = 'copy-paste-cell.png';
    await page.notebook.selectCells(2);
    await page.notebook.clickToolbarItem('copy');
    await page.notebook.selectCells(0);
    await page.notebook.clickToolbarItem('paste');
    const nbPanel = await page.notebook.getNotebookInPanel();

    expect(await nbPanel.screenshot()).toMatchSnapshot(imageName);
  });

  test('Cut cell', async ({ page }) => {
    const imageName = 'cut-cell.png';
    await page.notebook.selectCells(1);
    await page.notebook.clickToolbarItem('cut');
    const nbPanel = await page.notebook.getNotebookInPanel();

    expect(await nbPanel.screenshot()).toMatchSnapshot(imageName);
  });

  test('Paste cell', async ({ page }) => {
    // Cut cell to populate clipboard
    await page.notebook.selectCells(1);
    await page.notebook.clickToolbarItem('cut');

    const imageName = 'paste-cell.png';
    await page.notebook.selectCells(2);
    await page.notebook.clickToolbarItem('paste');
    const nbPanel = await page.notebook.getNotebookInPanel();

    expect(await nbPanel.screenshot()).toMatchSnapshot(imageName);
  });

  test('Delete cells', async ({ page }) => {
    const imageName = 'delete-cell.png';
    await page.notebook.selectCells(1, 2);
    await page.menu.clickMenuItem('Edit>Delete Cells');
    const nbPanel = await page.notebook.getNotebookInPanel();

    expect(await nbPanel.screenshot()).toMatchSnapshot(imageName);
  });

  test('Run cell', async ({ page }) => {
    const imageName = 'run-cell.png';
    await page.notebook.selectCells(2);

    await page.notebook.clickToolbarItem('run');
    await page.waitForSelector('text=8');
    // await page.notebook.waitForRun();

    const nbPanel = await page.notebook.getNotebookInPanel();

    expect(await nbPanel.screenshot()).toMatchSnapshot(imageName);
  });

  test('Change cell type to Markdown', async ({ page }) => {
    const imageName = 'change-to-markdown.png';
    await page.notebook.selectCells(2);
    await page.notebook.clickToolbarItem('cellType');
    await page.keyboard.press('m');
    await page.keyboard.press('Enter');
    await page.notebook.selectCells(2);
    const nbPanel = await page.notebook.getNotebookInPanel();

    expect(await nbPanel.screenshot()).toMatchSnapshot(imageName);
  });
});
