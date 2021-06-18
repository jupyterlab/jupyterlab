// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { describe, galata, test } from '@jupyterlab/galata';

const fileName = 'notebook.ipynb';

jest.setTimeout(60000);

describe('Notebook Edit', () => {
  beforeAll(async () => {
    await galata.resetUI();
    galata.context.capturePrefix = 'notebook-edit';
  });

  afterAll(() => {
    galata.context.capturePrefix = '';
  });

  test('Create new Notebook', async () => {
    await expect(galata.notebook.createNew(fileName)).resolves.toEqual(true);
  });

  test('Create a Raw cell', async () => {
    await galata.notebook.setCell(0, 'raw', 'Just a raw cell');
    expect(await galata.notebook.getCellCount()).toBe(1);
    expect(await galata.notebook.getCellType(0)).toBe('raw');
  });

  test('Create a Markdown cell', async () => {
    await galata.notebook.addCell(
      'markdown',
      '## This is **bold** and *italic* [link to jupyter.org!](http://jupyter.org)'
    );
    await galata.notebook.runCell(1, true);
    expect(await galata.notebook.getCellCount()).toBe(2);
    expect(await galata.notebook.getCellType(1)).toBe('markdown');
  });

  test('Create a Code cell', async () => {
    await galata.notebook.addCell('code', '2 ** 3');
    expect(await galata.notebook.getCellCount()).toBe(3);
    expect(await galata.notebook.getCellType(2)).toBe('code');
  });

  test('Execute Code cell', async () => {
    await galata.notebook.runCell(2, true);
    const imageName = 'run-cell';
    const nbPanel = await galata.notebook.getNotebookInPanel();
    await galata.capture.screenshot(imageName, nbPanel);
    expect(await galata.capture.compareScreenshot(imageName)).toBe('same');
  });

  test('Re-edit after execution', async () => {
    await galata.notebook.setCell(2, 'code', '2 ** 6');
    const imageName = 'reedit-cell';
    const nbPanel = await galata.notebook.getNotebookInPanel();
    await galata.capture.screenshot(imageName, nbPanel);
    expect(await galata.capture.compareScreenshot(imageName)).toBe('same');
  });

  test('Execute again', async () => {
    await galata.notebook.runCell(2, true);
    const imageName = 'execute-again';
    const nbPanel = await galata.notebook.getNotebookInPanel();
    await galata.capture.screenshot(imageName, nbPanel);
    expect(await galata.capture.compareScreenshot(imageName)).toBe('same');
  });

  test('Copy-Paste cell', async () => {
    let imageName = 'copy-paste-cell';
    await galata.notebook.selectCells(1);
    await galata.menu.clickMenuItem('Edit>Copy Cells');
    await galata.notebook.selectCells(0);
    await galata.menu.clickMenuItem('Edit>Paste Cells Above');
    let nbPanel = await galata.notebook.getNotebookInPanel();
    await galata.capture.screenshot(imageName, nbPanel);
    expect(await galata.capture.compareScreenshot(imageName)).toBe('same');
  });

  test('Cut-Paste cell', async () => {
    const imageName = 'cut-paste-cell';
    await galata.notebook.selectCells(0);
    await galata.menu.clickMenuItem('Edit>Cut Cells');
    await galata.notebook.selectCells(2);
    await galata.menu.clickMenuItem('Edit>Paste Cells Below');
    const nbPanel = await galata.notebook.getNotebookInPanel();
    await galata.capture.screenshot(imageName, nbPanel);
    expect(await galata.capture.compareScreenshot(imageName)).toBe('same');
  });

  test('Paste-Replace cell', async () => {
    const imageName = 'paste-replace-cell';
    await galata.notebook.selectCells(0);
    await galata.menu.clickMenuItem('Edit>Copy Cells');
    await galata.notebook.selectCells(3);
    await galata.menu.clickMenuItem('Edit>Paste Cells and Replace');
    const nbPanel = await galata.notebook.getNotebookInPanel();
    await galata.capture.screenshot(imageName, nbPanel);
    expect(await galata.capture.compareScreenshot(imageName)).toBe('same');
  });

  test('Delete cell', async () => {
    const imageName = 'delete-cell';
    await galata.notebook.selectCells(3);
    await galata.menu.clickMenuItem('Edit>Delete Cells');
    const nbPanel = await galata.notebook.getNotebookInPanel();
    await galata.capture.screenshot(imageName, nbPanel);
    expect(await galata.capture.compareScreenshot(imageName)).toBe('same');
  });

  test('Select all cells', async () => {
    const imageName = 'select-all-cells';
    await galata.notebook.selectCells(3);
    await galata.menu.clickMenuItem('Edit>Select All Cells');
    const nbPanel = await galata.notebook.getNotebookInPanel();
    await galata.capture.screenshot(imageName, nbPanel);
    expect(await galata.capture.compareScreenshot(imageName)).toBe('same');
  });

  test('Deselect all cells', async () => {
    const imageName = 'deselect-all-cells';
    await galata.notebook.selectCells(3);
    await galata.menu.clickMenuItem('Edit>Deselect All Cells');
    const nbPanel = await galata.notebook.getNotebookInPanel();
    await galata.capture.screenshot(imageName, nbPanel);
    expect(await galata.capture.compareScreenshot(imageName)).toBe('same');
  });

  test('Move cells up', async () => {
    const imageName = 'move-cell-up';
    await galata.notebook.selectCells(1);
    await galata.menu.clickMenuItem('Edit>Move Cells Up');
    const nbPanel = await galata.notebook.getNotebookInPanel();
    await galata.capture.screenshot(imageName, nbPanel);
    expect(await galata.capture.compareScreenshot(imageName)).toBe('same');
  });

  test('Move cells down', async () => {
    const imageName = 'move-cell-down';
    await galata.notebook.selectCells(0);
    await galata.menu.clickMenuItem('Edit>Move Cells Down');
    const nbPanel = await galata.notebook.getNotebookInPanel();
    await galata.capture.screenshot(imageName, nbPanel);
    expect(await galata.capture.compareScreenshot(imageName)).toBe('same');
  });

  test('Split cell', async () => {
    const page = galata.context.page;
    const imageName = 'split-cell';
    await galata.notebook.enterCellEditingMode(2);
    await page.keyboard.press('End');
    await page.keyboard.press('Enter');
    await page.keyboard.insertText('3 ** 2');
    await page.keyboard.press('Home');
    await galata.menu.clickMenuItem('Edit>Split Cell');
    const nbPanel = await galata.notebook.getNotebookInPanel();
    await galata.capture.screenshot(imageName, nbPanel);
    expect(await galata.capture.compareScreenshot(imageName)).toBe('same');
  });

  test('Merge split cells', async () => {
    const imageName = 'merge-cells';
    await galata.notebook.selectCells(2, 3);
    await galata.menu.clickMenuItem('Edit>Merge Selected Cells');
    const nbPanel = await galata.notebook.getNotebookInPanel();
    await galata.capture.screenshot(imageName, nbPanel);
    expect(await galata.capture.compareScreenshot(imageName)).toBe('same');
  });

  test('Delete Notebook', async () => {
    await galata.contents.deleteFile(fileName);
    expect(await galata.contents.fileExists(fileName)).toBeFalsy();
  });
});
