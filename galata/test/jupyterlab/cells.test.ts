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

    // This starts execution, but does not wait for it to finish,
    // which is why we need to use `expect().toPass()` below.
    await page.keyboard.press('Control+Enter');

    // Confirm that the cell has be executed by checking output
    await expect(async () => {
      const output = await page.notebook.getCellTextOutput(0);
      expect(output).toEqual(['4294967296']);
    }).toPass();

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

test.describe('Cell Toolbar Delete', () => {
  test.beforeEach(async ({ page }) => {
    await page.notebook.createNew();
    // Create two specific cells to identify deletions easily
    await page.notebook.setCell(0, 'code', 'print("cell-A")');
    await page.notebook.addCell('code', 'print("cell-B")');
    await page.notebook.selectCells(0);
  });

  test('should show confirmation dialog and cancel deletion', async ({
    page
  }) => {
    await page.hover('.jp-Cell >> nth=0');

    await page
      .locator('.jp-Cell [data-jp-item-name="delete-cell"] jp-button')
      .first()
      .click();

    // Verify dialog appears
    const dialog = page.locator('.jp-Dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText(
      'Are you sure you want to delete this cell?'
    );

    await dialog.locator('button.jp-mod-reject').click();

    // Verify no deletion occurred
    await expect(dialog).toBeHidden();
    expect(await page.notebook.getCellCount()).toBe(2);
    expect(await page.notebook.getCellTextInput(0)).toContain('cell-A');
  });

  test('should delete cell when confirmed', async ({ page }) => {
    await page.hover('.jp-Cell >> nth=0');

    await page
      .locator('.jp-Cell [data-jp-item-name="delete-cell"] jp-button')
      .first()
      .click();

    const dialog = page.locator('.jp-Dialog');
    await expect(dialog).toBeVisible();
    await dialog.locator('button.jp-mod-warn').click();

    await expect(dialog).toBeHidden();
    expect(await page.notebook.getCellCount()).toBe(1);
    expect(await page.notebook.getCellTextInput(0)).toContain('cell-B');
  });

  test('should respect "Do not ask me again" preference', async ({ page }) => {
    await page.hover('.jp-Cell >> nth=0');
    await page
      .locator('.jp-Cell [data-jp-item-name="delete-cell"] jp-button')
      .first()
      .click();

    const dialog = page.locator('.jp-Dialog');
    await expect(dialog).toBeVisible();

    // Check "Do not ask me again"
    await dialog.locator('input[type="checkbox"]').check();

    await dialog.locator('button.jp-mod-warn').click();

    // Verify first deletion
    expect(await page.notebook.getCellCount()).toBe(1);
    expect(await page.notebook.getCellTextInput(0)).toContain('cell-B');

    await page.hover('.jp-Cell >> nth=0');
    await page
      .locator('.jp-Cell [data-jp-item-name="delete-cell"] jp-button')
      .first()
      .click();

    // Wait for deletion to happen
    await expect(
      page.locator('.jp-Cell .jp-InputArea-editor').first()
    ).not.toContainText('cell-B');
    await expect(dialog).toBeHidden();

    // Verify second deletion worked
    expect(await page.notebook.getCellCount()).toBe(1);
    const content = await page.notebook.getCellTextInput(0);
    expect(content).not.toContain('cell-B');
  });
});
