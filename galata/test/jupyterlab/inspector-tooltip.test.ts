// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect, test } from '@jupyterlab/galata';

const fileName = 'notebook.ipynb';
const TOOLTIP_SELECTOR = '.jp-Tooltip';

test.describe('Inspector (contextual help) tooltip', () => {
  test.beforeEach(async ({ page }) => {
    await page.notebook.createNew(fileName);
  });

  test('Should show up on Shift + Tab', async ({ page }) => {
    await page.notebook.setCell(0, 'code', 'int');
    await page.notebook.enterCellEditingMode(0);
    // Ensure the cursor is at the end of the cell, after "int"
    await page.keyboard.press('End');
    // Ensure kernel is ready
    await page.locator('text=| Idle').waitFor();
    const tooltip = page.locator(TOOLTIP_SELECTOR);
    // There should be no tooltip yet
    await expect(tooltip).toHaveCount(0);
    // Invoke the tooltip
    await page.keyboard.press('Shift+Tab');
    // There should be a tooltip now
    await expect(tooltip).toHaveCount(1);
    await expect(tooltip).toContainText('int');
  });

  test('Should dismiss on Escape after clicking inside tooltip', async ({
    page
  }) => {
    await page.notebook.setCell(0, 'code', 'int');
    await page.notebook.enterCellEditingMode(0);
    await page.keyboard.press('End');
    await page.locator('text=| Idle').waitFor();
    const tooltip = page.locator(TOOLTIP_SELECTOR);
    await page.keyboard.press('Shift+Tab');
    await expect(tooltip).toHaveCount(1);
    await tooltip.click();
    await page.keyboard.press('Escape');
    await expect(tooltip).toHaveCount(0);
  });
});
