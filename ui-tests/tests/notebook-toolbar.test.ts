// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { describe, galata, test } from '@jupyterlab/galata';

const fileName = 'notebook.ipynb';

jest.setTimeout(60000);

describe('Notebook Toolbar', () => {
  beforeAll(async () => {
    await galata.resetUI();
    galata.context.capturePrefix = 'notebook-toolbar';
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

  test('Save Notebook', async () => {
    await galata.notebook.save();
    expect(await galata.contents.fileExists(fileName)).toBeTruthy();
  });

  test('Insert cells', async () => {
    const imageName = 'insert-cells';
    await galata.notebook.selectCells(0);
    await galata.notebook.clickToolbarItem('insert');
    await galata.notebook.selectCells(2);
    await galata.notebook.clickToolbarItem('insert');
    const nbPanel = await galata.notebook.getNotebookInPanel();
    await galata.capture.screenshot(imageName, nbPanel);
    expect(await galata.capture.compareScreenshot(imageName)).toBe('same');
  });

  test('Copy-Paste cell', async () => {
    const imageName = 'copy-paste-cell';
    await galata.notebook.selectCells(2);
    await galata.notebook.clickToolbarItem('copy');
    await galata.notebook.selectCells(0);
    await galata.notebook.clickToolbarItem('paste');
    const nbPanel = await galata.notebook.getNotebookInPanel();
    await galata.capture.screenshot(imageName, nbPanel);
    expect(await galata.capture.compareScreenshot(imageName)).toBe('same');
  });

  test('Cut cell', async () => {
    const imageName = 'cut-cell';
    await galata.notebook.selectCells(1);
    await galata.notebook.clickToolbarItem('cut');
    const nbPanel = await galata.notebook.getNotebookInPanel();
    await galata.capture.screenshot(imageName, nbPanel);
    expect(await galata.capture.compareScreenshot(imageName)).toBe('same');
  });

  test('Paste cell', async () => {
    const imageName = 'paste-cell';
    await galata.notebook.selectCells(4);
    await galata.notebook.clickToolbarItem('paste');
    const nbPanel = await galata.notebook.getNotebookInPanel();
    await galata.capture.screenshot(imageName, nbPanel);
    expect(await galata.capture.compareScreenshot(imageName)).toBe('same');
  });

  test('Delete cells', async () => {
    const imageName = 'delete-cell';
    await galata.notebook.selectCells(1, 3);
    await galata.menu.clickMenuItem('Edit>Delete Cells');
    const nbPanel = await galata.notebook.getNotebookInPanel();
    await galata.capture.screenshot(imageName, nbPanel);
    expect(await galata.capture.compareScreenshot(imageName)).toBe('same');
  });

  test('Run cell', async () => {
    const imageName = 'run-cell';
    await galata.notebook.selectCells(1);
    await galata.notebook.clickToolbarItem('run');
    await galata.notebook.waitForRun();
    const nbPanel = await galata.notebook.getNotebookInPanel();
    await galata.capture.screenshot(imageName, nbPanel);
    expect(await galata.capture.compareScreenshot(imageName)).toBe('same');
  });

  test('Change cell type to Markdown', async () => {
    const imageName = 'change-to-markdown';
    await galata.notebook.selectCells(1);
    await galata.notebook.clickToolbarItem('cellType');
    await galata.context.page.keyboard.press('m');
    await galata.context.page.keyboard.press('Enter');
    await galata.notebook.selectCells(1);
    const nbPanel = await galata.notebook.getNotebookInPanel();
    await galata.capture.screenshot(imageName, nbPanel);
    expect(await galata.capture.compareScreenshot(imageName)).toBe('same');
  });

  test('Re-run cell', async () => {
    const imageName = 're-run-cell';
    await galata.notebook.selectCells(1);
    await galata.notebook.clickToolbarItem('run');
    await galata.notebook.waitForRun();
    const nbPanel = await galata.notebook.getNotebookInPanel();
    await galata.capture.screenshot(imageName, nbPanel);
    expect(await galata.capture.compareScreenshot(imageName)).toBe('same');
  });

  test('Delete Notebook', async () => {
    await galata.contents.deleteFile(fileName);
    expect(await galata.contents.fileExists(fileName)).toBeFalsy();
  });
});
