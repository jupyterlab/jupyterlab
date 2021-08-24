// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { describe, galata, test } from '@jupyterlab/galata';
import * as path from 'path';

const fileName = 'markdown_notebook.ipynb';

jest.setTimeout(60000);

describe('Notebook Markdown', () => {
  beforeAll(async () => {
    await galata.resetUI();
    galata.context.capturePrefix = 'notebook-markdown';
  });

  afterAll(() => {
    galata.context.capturePrefix = '';
  });

  test('Upload files to JupyterLab', async () => {
    await galata.contents.moveFileToServer(
      path.resolve(__dirname, `./notebooks/${fileName}`),
      `uploaded/${fileName}`
    );
    expect(
      await galata.contents.fileExists(`uploaded/${fileName}`)
    ).toBeTruthy();
  });

  test('Refresh File Browser', async () => {
    await expect(galata.filebrowser.refresh()).resolves.toBeUndefined();
  });

  test('Open directory uploaded', async () => {
    await galata.filebrowser.openDirectory('uploaded');
    expect(
      await galata.filebrowser.isFileListedInBrowser(fileName)
    ).toBeTruthy();
  });

  test('Open Notebook', async () => {
    await galata.notebook.open(fileName);
    expect(await galata.notebook.isOpen(fileName)).toBeTruthy();
    await galata.notebook.activate(fileName);
    expect(await galata.notebook.isActive(fileName)).toBeTruthy();
  });

  test('Highlight LaTeX syntax', async () => {
    const imageName = 'highlight-latex';
    await galata.notebook.enterCellEditingMode(0);
    const cell = await galata.notebook.getCell(0);
    await galata.capture.screenshot(imageName, cell);
    expect(await galata.capture.compareScreenshot(imageName)).toBe('same');
  });

  test('Do not highlight non-LaTeX syntax', async () => {
    const imageName = 'do-not-highlight-not-latex';
    await galata.notebook.enterCellEditingMode(1);
    const cell = await galata.notebook.getCell(1);
    await galata.capture.screenshot(imageName, cell);
    expect(await galata.capture.compareScreenshot(imageName)).toBe('same');
  });

  test('Close Notebook', async () => {
    await expect(galata.notebook.activate(fileName)).resolves.toEqual(true);
    await expect(galata.notebook.close(true)).resolves.toEqual(true);
  });

  test('Open home directory', async () => {
    await galata.sidebar.openTab('filebrowser');
    await expect(galata.sidebar.isTabOpen('filebrowser')).resolves.toEqual(
      true
    );
    await expect(galata.filebrowser.openHomeDirectory()).resolves.toEqual(true);
  });

  test('Delete uploaded directory', async () => {
    await expect(galata.contents.deleteDirectory('uploaded')).resolves.toEqual(
      true
    );
  });
});
