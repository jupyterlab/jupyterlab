// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { test } from '@jupyterlab/galata';
import { expect } from '@playwright/test';
import * as path from 'path';

const fileName = 'output_scrolling.ipynb';

const cellSelector = '[role="main"] >> .jp-NotebookPanel >> .jp-Cell';

test.describe('Output Scrolling', () => {
  test.beforeEach(async ({ page, tmpPath }) => {
    await page.contents.uploadFile(
      path.resolve(__dirname, `./notebooks/${fileName}`),
      `${tmpPath}/${fileName}`
    );

    await page.notebook.openByPath(`${tmpPath}/${fileName}`);
    await page.notebook.activate(fileName);
  });

  test.afterEach(async ({ page, tmpPath }) => {
    await page.contents.deleteDirectory(tmpPath);
  });

  test('Scrolling mode', async ({ page }) => {
    await page.evaluate(() => {
      return window.jupyterapp.commands.execute(
        'notebook:enable-output-scrolling'
      );
    });
    await page.notebook.selectCells(0);
    await expect(page.locator(`${cellSelector} >> nth=0`)).toHaveClass(
      /jp-mod-outputsScrolled/
    );

    const cell = await page.notebook.getCell(0);

    expect(await (await cell.$('.jp-OutputArea')).screenshot()).toMatchSnapshot(
      'cell-output-area-scrolling-mode.png'
    );

    await page.evaluate(() => {
      return window.jupyterapp.commands.execute(
        'notebook:disable-output-scrolling'
      );
    });
    await expect(page.locator(`${cellSelector} >> nth=0`)).not.toHaveClass(
      /jp-mod-outputsScrolled/
    );
  });

  test('Switching with prompt overlay', async ({ page }) => {
    await page
      .locator(`${cellSelector} >> nth=1 >> .jp-OutputArea-promptOverlay`)
      .hover();
    const cell = await page.notebook.getCell(1);
    expect(await cell.screenshot()).toMatchSnapshot(
      'prompt-overlay-hover-normal.png'
    );
    await page.click(
      `${cellSelector} >> nth=1 >> .jp-OutputArea-promptOverlay`
    );
    await expect(page.locator(`${cellSelector} >> nth=1`)).toHaveClass(
      /jp-mod-outputsScrolled/
    );
    expect(await cell.screenshot()).toMatchSnapshot(
      'prompt-overlay-hover-scroll.png'
    );
    await page.click(
      `${cellSelector} >> nth=1 >> .jp-OutputArea-promptOverlay`
    );
    await expect(page.locator(`${cellSelector} >> nth=1`)).not.toHaveClass(
      /jp-mod-outputsScrolled/
    );
  });
});
