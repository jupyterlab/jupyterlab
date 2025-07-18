// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect, galata, test } from '@jupyterlab/galata';
import * as path from 'path';

const fileName = 'simple_notebook.ipynb';

test.describe('Cells', () => {
  test.beforeEach(async ({ page, request, tmpPath }) => {
    const contents = galata.newContentsHelper(request);
    await contents.uploadFile(
      path.resolve(__dirname, `./notebooks/${fileName}`),
      `${tmpPath}/${fileName}`
    );
    await contents.uploadFile(
      path.resolve(__dirname, './notebooks/WidgetArch.png'),
      `${tmpPath}/WidgetArch.png`
    );

    await page.notebook.openByPath(`${tmpPath}/${fileName}`);
    await page.notebook.activate(fileName);
  });

  test('should collapse a cell', async ({ page }) => {
    await page.notebook.run();

    await page.locator('.jp-Cell-inputCollapser').nth(2).click();

    expect(await page.locator('.jp-Cell').nth(2).screenshot()).toMatchSnapshot(
      'collapsed-cell.png'
    );
  });
});

test.describe('Run Cells', () => {
  test.beforeEach(async ({ page }) => {
    await page.notebook.createNew();
  });

  test('Run code cell with Ctrl + Enter', async ({ page }) => {
    await page.notebook.setCell(0, 'code', '2**32');
    await page.notebook.enterCellEditingMode(0);
    const initialOutput = await page.notebook.getCellTextOutput(0);
    expect(initialOutput).toBe(null);
    await page.keyboard.press('Control+Enter');

    // Confirm that the cell has be executed by checking output
    const output = await page.notebook.getCellTextOutput(0);
    expect(output).toEqual(['4294967296']);

    // Expect the input to NOT include an extra line;
    const text = await page.notebook.getCellTextInput(0);
    expect(text).toBe('2**32');
  });

  test('Should update the cell execution counter', async ({ page }) => {
    await page.notebook.setCell(0, 'code', '2**32');
    const inputPrompt = (await page.notebook.getCellLocator(0))!.locator(
      '.jp-InputPrompt'
    );

    // Input prompt should be updated when the cell is executed.
    await page.notebook.runCell(0);
    await expect(inputPrompt).toHaveText('[1]:');
    await page.notebook.runCell(0);
    await expect(inputPrompt).toHaveText('[2]:');

    // Input prompt should be reset when an empty cell is executed.
    const cell = await page.notebook.getCellLocator(0);
    await cell?.getByRole('textbox').press('Control+A');
    await cell?.getByRole('textbox').press('Delete');

    await page.notebook.runCell(0);
    await expect(inputPrompt).toHaveText('[ ]:');
  });
});
