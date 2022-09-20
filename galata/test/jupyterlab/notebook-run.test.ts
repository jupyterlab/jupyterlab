// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect, galata, test } from '@jupyterlab/galata';
import * as path from 'path';

const fileName = 'simple_notebook.ipynb';

test.use({ tmpPath: 'notebook-run-test' });

test.describe.serial('Notebook Run', () => {
  test.beforeAll(async ({ request, tmpPath }) => {
    const contents = galata.newContentsHelper(request);
    await contents.uploadFile(
      path.resolve(__dirname, `./notebooks/${fileName}`),
      `${tmpPath}/${fileName}`
    );
    await contents.uploadFile(
      path.resolve(__dirname, './notebooks/WidgetArch.png'),
      `${tmpPath}/WidgetArch.png`
    );
  });

  test.beforeEach(async ({ page, tmpPath }) => {
    await page.filebrowser.openDirectory(tmpPath);
  });

  test.afterAll(async ({ request, tmpPath }) => {
    const contents = galata.newContentsHelper(request);
    await contents.deleteDirectory(tmpPath);
  });

  test('Run Notebook and capture cell outputs', async ({ page, tmpPath }) => {
    await page.notebook.openByPath(`${tmpPath}/${fileName}`);
    await page.notebook.activate(fileName);

    let numNBImages = 0;

    const getCaptureImageName = (id: number): string => {
      return `notebook-panel-${id}.png`;
    };
    const captures = new Array<Buffer>();

    await page.notebook.runCellByCell({
      onBeforeScroll: async () => {
        const nbPanel = await page.notebook.getNotebookInPanel();
        if (nbPanel) {
          captures.push(await nbPanel.screenshot());
          numNBImages++;
        }
      }
    });

    // Save outputs for the next tests
    await page.notebook.save();

    const nbPanel = await page.notebook.getNotebookInPanel();
    captures.push(await nbPanel.screenshot());
    numNBImages++;

    for (let c = 0; c < numNBImages; ++c) {
      expect(captures[c]).toMatchSnapshot(getCaptureImageName(c));
    }
  });

  test('Check cell output 1', async ({ page, tmpPath }) => {
    await page.notebook.openByPath(`${tmpPath}/${fileName}`);
    const cellOutput = await page.notebook.getCellTextOutput(5);
    expect(parseInt(cellOutput[0])).toBe(4);
  });

  test('Check cell output 2', async ({ page, tmpPath }) => {
    await page.notebook.openByPath(`${tmpPath}/${fileName}`);
    const cellOutput = await page.notebook.getCellTextOutput(6);
    expect(parseFloat(cellOutput[0])).toBeGreaterThan(1.5);
  });

  test('Close Notebook', async ({ page, tmpPath }) => {
    await page.notebook.openByPath(`${tmpPath}/${fileName}`);
    await expect(page.notebook.close(true)).resolves.not.toThrow();
  });
});
