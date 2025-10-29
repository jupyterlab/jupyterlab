// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect, IJupyterLabPageFixture, test } from '@jupyterlab/galata';

const fileName = 'notebook.ipynb';

async function populateNotebook(page: IJupyterLabPageFixture) {
  await page.notebook.setCell(0, 'raw', 'Just a raw cell');
  await page.notebook.addCell(
    'markdown',
    '## This is **bold** and *italic* [link to jupyter.org!](http://jupyter.org)'
  );
  await page.notebook.addCell('code', '2 ** 3');
}

test.describe('Notebook Edit', () => {
  test.beforeEach(async ({ page }) => {
    await page.notebook.createNew(fileName);
  });

  test('Execute Code cell', async ({ page }) => {
    await page.notebook.addCell('code', '2 ** 3');
    await page.notebook.runCell(1, true);
    const imageName = 'run-cell.png';
    const nbPanel = await page.notebook.getNotebookInPanelLocator();

    expect(await nbPanel!.screenshot()).toMatchSnapshot(imageName);
  });

  test('Re-edit after execution', async ({ page }) => {
    await page.notebook.addCell('code', '2 ** 3');
    await page.notebook.runCell(1, true);
    await page.notebook.setCell(1, 'code', '2 ** 6');

    const imageName = 'reedit-cell.png';
    const nbPanel = await page.notebook.getNotebookInPanelLocator();

    expect(await nbPanel!.screenshot()).toMatchSnapshot(imageName);
  });

  test('Re-render Markdown after edit', async ({ page }) => {
    // Add an image and render
    await page.notebook.addCell('markdown', '![alt text](./image.png)');
    await page.notebook.runCell(1, true);

    // There should be no link rendered in the cell, just an image
    const cell = await page.notebook.getCellLocator(1);
    const image = cell!.locator('img');
    const link = cell!.locator('a');
    await expect(link).toHaveCount(0);
    await expect(image).toHaveCount(1);

    // Edit and re-render the cell
    await page.notebook.setCell(1, 'markdown', '[link](https://jupyter.org)');
    await page.notebook.runCell(1, true);

    // There should be a link but not an image
    await expect(link).toHaveCount(1);
    await expect(image).toHaveCount(0);

    // Double-check we see the right link
    await expect(link).toContainText('link');
  });

  test('Cut from code and paste into a Markdown cell', async ({ page }) => {
    const text = 'text to be pasted';
    await page.notebook.addCell('code', text);
    await page.notebook.addCell('markdown', '');

    const codeCell = await page.notebook.getCellLocator(1);
    const markdownCell = await page.notebook.getCellLocator(2);

    await expect(codeCell!).toContainText(text);
    await expect(markdownCell!).not.toContainText(text);

    // Cut from the code cell
    await page.notebook.enterCellEditingMode(1);
    await page.keyboard.press('Control+KeyA');
    await page.keyboard.press('Control+KeyX');

    // Paste into the markdown cell
    await page.notebook.enterCellEditingMode(2);
    await page.keyboard.press('Control+KeyV');

    await expect(codeCell!).not.toContainText(text);
    await expect(markdownCell!).toContainText(text);
  });

  test('Execute again', async ({ page }) => {
    await page.notebook.addCell('code', '2 ** 3');
    await page.notebook.runCell(1, true);
    await page.notebook.setCell(1, 'code', '2 ** 6');

    const imageName = 'execute-again.png';
    const nbPanel = await page.notebook.getNotebookInPanelLocator();

    expect(await nbPanel!.screenshot()).toMatchSnapshot(imageName);
  });

  test('Copy-Paste cell', async ({ page }) => {
    await populateNotebook(page);

    let imageName = 'copy-paste-cell.png';
    await page.notebook.selectCells(1);
    await page.menu.clickMenuItem('Edit>Copy Cell');
    await page.notebook.selectCells(0);
    await page.menu.clickMenuItem('Edit>Paste Cell Above');
    let nbPanel = await page.notebook.getNotebookInPanelLocator();

    expect(await nbPanel!.screenshot()).toMatchSnapshot(imageName);
  });

  test('Cut-Paste cell', async ({ page }) => {
    await populateNotebook(page);

    const imageName = 'cut-paste-cell.png';
    await page.notebook.selectCells(0);
    await page.menu.clickMenuItem('Edit>Cut Cell');
    await page.notebook.selectCells(0);
    await page.menu.clickMenuItem('Edit>Paste Cell Below');
    const nbPanel = await page.notebook.getNotebookInPanelLocator();

    expect(await nbPanel!.screenshot()).toMatchSnapshot(imageName);
  });

  test('Paste-Replace cell', async ({ page }) => {
    await populateNotebook(page);

    const imageName = 'paste-replace-cell.png';
    await page.notebook.selectCells(0);
    await page.menu.clickMenuItem('Edit>Copy Cell');
    await page.notebook.selectCells(2);
    await page.menu.clickMenuItem('Edit>Paste Cell and Replace');
    const nbPanel = await page.notebook.getNotebookInPanelLocator();

    expect(await nbPanel!.screenshot()).toMatchSnapshot(imageName);
  });

  test('Delete cell', async ({ page }) => {
    await populateNotebook(page);

    const imageName = 'delete-cell.png';
    await page.notebook.selectCells(2);
    await page.menu.clickMenuItem('Edit>Delete Cell');
    const nbPanel = await page.notebook.getNotebookInPanelLocator();

    expect(await nbPanel!.screenshot()).toMatchSnapshot(imageName);
  });

  test('Select all cells', async ({ page }) => {
    await populateNotebook(page);
    const imageName = 'select-all-cells.png';
    await page.notebook.selectCells(2);
    await page.menu.clickMenuItem('Edit>Select All Cells');
    const nbPanel = await page.notebook.getNotebookInPanelLocator();

    expect(await nbPanel!.screenshot()).toMatchSnapshot(imageName);
  });

  test('Deselect all cells', async ({ page }) => {
    await populateNotebook(page);
    const imageName = 'deselect-all-cells.png';
    await page.notebook.selectCells(1, 2);
    await page.menu.clickMenuItem('Edit>Deselect All Cells');
    const nbPanel = await page.notebook.getNotebookInPanelLocator();

    expect(await nbPanel!.screenshot()).toMatchSnapshot(imageName);
  });

  test('Move cells up', async ({ page }) => {
    await populateNotebook(page);
    const imageName = 'move-cell-up.png';
    await page.notebook.selectCells(1);
    await page.menu.clickMenuItem('Edit>Move Cell Up');
    const nbPanel = await page.notebook.getNotebookInPanelLocator();

    await page.waitForTimeout(200);
    expect(await nbPanel!.screenshot()).toMatchSnapshot(imageName);
  });

  test('Move cells down', async ({ page }) => {
    await populateNotebook(page);
    const imageName = 'move-cell-down.png';
    await page.notebook.selectCells(0);
    await page.menu.clickMenuItem('Edit>Move Cell Down');
    const nbPanel = await page.notebook.getNotebookInPanelLocator();

    expect(await nbPanel!.screenshot()).toMatchSnapshot(imageName);
  });

  test('Split cell', async ({ page }) => {
    await populateNotebook(page);
    const imageName = 'split-cell.png';
    await page.notebook.enterCellEditingMode(2);
    await page.keyboard.press('End');
    await page.keyboard.press('Enter');
    await page.keyboard.insertText('3 ** 2');
    await page.keyboard.press('Home');
    await page.menu.clickMenuItem('Edit>Split Cell');

    const nbPanel = await page.notebook.getNotebookInPanelLocator();

    expect(await nbPanel!.screenshot()).toMatchSnapshot(imageName);
  });

  test('Merge split cells', async ({ page }) => {
    await page.notebook.addCell('code', '2 ** 3');
    await page.notebook.addCell('code', '3 ** 2');

    const imageName = 'merge-cells.png';
    await page.notebook.selectCells(1, 2);
    await page.menu.clickMenuItem('Edit>Merge Selected Cells');
    const nbPanel = await page.notebook.getNotebookInPanelLocator();

    expect(await nbPanel!.screenshot()).toMatchSnapshot(imageName);
  });
});
