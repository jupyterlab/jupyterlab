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

test.describe('Run Cell Button', () => {
  test.beforeEach(async ({ page }) => {
    await page.notebook.createNew();
    await page.notebook.setCell(0, 'code', '2**32');
  });

  test.describe('Button disabled', () => {
    test.use({
      mockSettings: {
        ...galata.DEFAULT_SETTINGS,
        '@jupyterlab/cell-toolbar-extension:prompt-button': {
          showButton: false
        }
      }
    });
    test('Should not have button', async ({ page }) => {
      const inputPrompt = (await page.notebook.getCellLocator(0))!.locator(
        '.jp-InputPrompt'
      );

      await inputPrompt?.hover();
      void expect(
        inputPrompt.locator('.jp-InputArea-prompt-button')
      ).not.toBeVisible();
    });
  });

  test.describe('Button enabled', () => {
    test.use({
      mockSettings: {
        ...galata.DEFAULT_SETTINGS,
        '@jupyterlab/cell-toolbar-extension:prompt-button': {
          showButton: true
        }
      }
    });

    test('Should have the run button', async ({ page }) => {
      const inputPrompt = (await page.notebook.getCellLocator(0))!.locator(
        '.jp-InputPrompt'
      );

      const cellInput = await page.notebook.getCellInputLocator(0);

      // The button should be displayed when the cell is hovered.
      await cellInput?.hover();
      void expect(
        inputPrompt.locator('.jp-InputArea-prompt-button')
      ).toBeVisible();

      // The button should be hidden when the cell is not hovered.
      await (await page.notebook.getToolbarLocator())?.hover();
      await expect(
        inputPrompt.locator('.jp-InputArea-prompt-button')
      ).not.toBeVisible();
    });

    test('Should run the code with the button', async ({ page }) => {
      const inputPrompt = (await page.notebook.getCellLocator(0))!.locator(
        '.jp-InputPrompt'
      );

      await expect(inputPrompt).toHaveText('[ ]:');

      await inputPrompt?.hover();
      await inputPrompt.locator('.jp-InputArea-prompt-button').click();

      await (await page.notebook.getToolbarLocator())?.hover();
      await expect(inputPrompt).toHaveText('[1]:');
    });

    test('Should not have button on raw/markdown cells', async ({ page }) => {
      const inputPrompt = (await page.notebook.getCellLocator(0))!.locator(
        '.jp-InputPrompt'
      );

      await inputPrompt?.hover();
      void expect(
        inputPrompt.locator('.jp-InputArea-prompt-button')
      ).toBeVisible();

      await page.notebook.setCellType(0, 'markdown');
      await inputPrompt?.hover();
      void expect(
        inputPrompt.locator('.jp-InputArea-prompt-button')
      ).not.toBeVisible();

      await page.notebook.setCellType(0, 'raw');
      await inputPrompt?.hover();
      void expect(
        inputPrompt.locator('.jp-InputArea-prompt-button')
      ).not.toBeVisible();

      await page.notebook.setCellType(0, 'code');
      await inputPrompt?.hover();
      void expect(
        inputPrompt.locator('.jp-InputArea-prompt-button')
      ).toBeVisible();
    });
  });
});
