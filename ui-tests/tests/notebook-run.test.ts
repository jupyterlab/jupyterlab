// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { describe, galata, test } from '@jupyterlab/galata';
import * as path from 'path';

jest.setTimeout(60000);

const fileName = 'simple_notebook.ipynb';

describe('Notebook Run', () => {
  beforeAll(async () => {
    await galata.resetUI();
    galata.context.capturePrefix = 'notebook-run';
  });

  afterAll(async () => {
    galata.context.capturePrefix = '';
  });

  test('Upload files to JupyterLab', async () => {
    await galata.contents.moveFileToServer(
      path.resolve(__dirname, `./notebooks/${fileName}`),
      `uploaded/${fileName}`
    );
    await galata.contents.moveFileToServer(
      path.resolve(__dirname, './notebooks/WidgetArch.png'),
      'uploaded/WidgetArch.png'
    );
    expect(
      await galata.contents.fileExists(`uploaded/${fileName}`)
    ).toBeTruthy();
    expect(
      await galata.contents.fileExists('uploaded/WidgetArch.png')
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

  test('Run Notebook and capture cell outputs', async () => {
    await galata.notebook.open(fileName);
    expect(await galata.notebook.isOpen(fileName)).toBeTruthy();
    await galata.notebook.activate(fileName);
    expect(await galata.notebook.isActive(fileName)).toBeTruthy();

    let numNBImages = 0;

    const getCaptureImageName = (id: number): string => {
      return `page-${id}`;
    };

    await galata.notebook.runCellByCell({
      onBeforeScroll: async () => {
        const nbPanel = await galata.notebook.getNotebookInPanel();
        if (nbPanel) {
          if (
            await galata.capture.screenshot(
              getCaptureImageName(numNBImages),
              nbPanel
            )
          ) {
            numNBImages++;
          }
        }
      }
    });

    const nbPanel = await galata.notebook.getNotebookInPanel();
    if (
      await galata.capture.screenshot(getCaptureImageName(numNBImages), nbPanel)
    ) {
      numNBImages++;
    }

    for (let c = 0; c < numNBImages; ++c) {
      expect(
        await galata.capture.compareScreenshot(getCaptureImageName(c))
      ).toBe('same');
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

  test('Close Notebook', async () => {
    await expect(galata.notebook.close(true)).resolves.toEqual(true);
  });

  test('Open home directory', async () => {
    await expect(galata.filebrowser.openHomeDirectory()).resolves.toEqual(true);
  });

  test('Delete uploaded directory', async () => {
    await expect(galata.contents.deleteDirectory('uploaded')).resolves.toEqual(
      true
    );
  });
});
