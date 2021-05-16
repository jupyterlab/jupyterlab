// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { galata, describe, test } from '@jupyterlab/galata';
import * as path from 'path';

jest.setTimeout(100000);

describe('Notebook Run', () => {
  beforeAll(async () => {
    await galata.resetUI();
    galata.context.capturePrefix = 'notebook-run';
  });

  afterAll(async () => {
    galata.context.capturePrefix = '';
  });

  test('Upload files to JupyterLab', async () => {
    await galata.contents.moveDirectoryToServer(path.resolve(__dirname, `./notebooks`), 'uploaded');
    expect(await galata.contents.fileExists('uploaded/simple_notebook.ipynb')).toBeTruthy();
    expect(await galata.contents.fileExists('uploaded/WidgetArch.png')).toBeTruthy();
  });

  test('Refresh File Browser', async () => {
    await galata.filebrowser.refresh();
  });

  test('Open directory uploaded', async () => {
    await galata.filebrowser.openDirectory('uploaded');
    expect(await galata.filebrowser.isFileListedInBrowser('simple_notebook.ipynb')).toBeTruthy();
  });

  test('Run notebook simple_notebook.ipynb and capture cell outputs', async () => {
    const notebook = 'simple_notebook.ipynb';
    await galata.notebook.open(notebook);
    expect(await galata.notebook.isOpen(notebook)).toBeTruthy();
    await galata.notebook.activate(notebook);
    expect(await galata.notebook.isActive(notebook)).toBeTruthy();

    let numNBImages = 0;

    const getCaptureImageName = (id: number): string => {
      return `cell-${id}`;
    };

    await galata.notebook.runCellByCell({
      onBeforeScroll: async () => {
        const nbPanel = await galata.notebook.getNotebookInPanel();
        if (nbPanel) {
          if (await galata.capture.screenshot(getCaptureImageName(numNBImages), nbPanel)) {
            numNBImages++;
          }
        }
      }
    });

    const nbPanel = await galata.notebook.getNotebookInPanel();
    if (await galata.capture.screenshot(getCaptureImageName(numNBImages), nbPanel)) {
      numNBImages++;
    }

    for (let c = 0; c < numNBImages; ++c) {
      expect(await galata.capture.compareScreenshot(getCaptureImageName(c))).toBe('same');
    }
  });

  test('Check cell output 1', async () => {
    const cellOutput = await galata.notebook.getCellTextOutput(5);
    expect(parseInt(cellOutput[0])).toBe(4);
  });

  test('Check cell output 2', async () => {
    const cellOutput = await galata.notebook.getCellTextOutput(6);
    expect(parseFloat(cellOutput[0])).toBeGreaterThan(1.5);
  });

  test('Close notebook simple_notebook.ipynb', async () => {
    await galata.notebook.close(true);
  });

  test('Open home directory', async () => {
    await galata.filebrowser.openHomeDirectory();
  });

  test('Delete uploaded directory', async () => {
    await galata.contents.deleteDirectory('uploaded');
  });
});
