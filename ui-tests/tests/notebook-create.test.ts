// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { describe, galata, test } from '@jupyterlab/galata';
import { runMenuOpenTest } from './util';

const fileName = 'notebook.ipynb';

jest.setTimeout(60000);

describe('Notebook Create', () => {
  beforeAll(async () => {
    await galata.resetUI();
    galata.context.capturePrefix = 'notebook-create';
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

  runMenuOpenTest();

  test('Run cells', async () => {
    await galata.notebook.run();
    await galata.notebook.save();
    const imageName = 'run-cells';

    expect((await galata.notebook.getCellTextOutput(2))[0]).toBe('8');

    const nbPanel = await galata.notebook.getNotebookInPanel();
    await galata.capture.screenshot(imageName, nbPanel);
    expect(await galata.capture.compareScreenshot(imageName)).toBe('same');
  });

  test('Toggle Dark theme', async () => {
    await galata.theme.setDarkTheme();
    const nbPanel = await galata.notebook.getNotebookInPanel();
    const imageName = 'dark-theme';
    await galata.capture.screenshot(imageName, nbPanel);
    expect(await galata.capture.compareScreenshot(imageName)).toBe('same');
  });

  test('Toggle Light theme', async () => {
    await galata.theme.setLightTheme();
    await expect(galata.theme.getTheme()).resolves.toEqual('JupyterLab Light');
  });

  test('Delete Notebook', async () => {
    await galata.contents.deleteFile(fileName);
    expect(await galata.contents.fileExists(fileName)).toBeFalsy();
  });
});
