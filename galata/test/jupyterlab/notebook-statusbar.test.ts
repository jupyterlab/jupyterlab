// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect, test } from '@jupyterlab/galata';

const fileName = 'statusbar-item.ipynb';

test.describe('Notebook status bar', () => {
  test('Open go-to-cell popup from cell counter item', async ({ page }) => {
    const imageName = 'cell-counter-popup.png';

    await page.notebook.createNew(fileName);
    await page.notebook.addCell('code', 'cell 2');
    await page.notebook.addCell('code', 'cell 3');

    const statusBar = page.locator('#jp-main-statusbar');
    await expect(statusBar).toBeVisible();

    const counterItem = statusBar.getByTitle('Go to cell…').first();
    await expect.soft(counterItem).toHaveText(/Cell\s+\d+\/\d+/);

    await counterItem.click();

    const popup = page.locator('.jp-StatusBar-HoverItem .jp-lineFormSearch');
    await expect(popup).toBeVisible();

    expect(await popup.screenshot()).toMatchSnapshot(imageName);
  });

  test('Navigates to the specified cell via the popup input', async ({
    page
  }) => {
    await page.notebook.createNew(fileName);

    // Add enough cells so cell 4 is distinct from the default active cell 1
    await page.notebook.addCell('code', 'cell 2');
    await page.notebook.addCell('code', 'cell 3');
    await page.notebook.addCell('code', 'cell 4');
    await page.notebook.addCell('code', 'cell 5');

    // Click on cell 1 to ensure it is the active starting cell
    const firstCell = await page.notebook.getCellLocator(0);
    await firstCell!.click();

    const statusBar = page.locator('#jp-main-statusbar');
    const counterItem = statusBar.getByTitle('Go to cell…').first();
    await expect(counterItem).toHaveText(/Cell\s+1\//);

    // Open the popup
    await counterItem.click();
    const input = page.locator('.jp-StatusBar-HoverItem .jp-lineFormInput');
    await expect(input).toBeVisible();

    // Type the target cell number and submit
    await input.fill('4');
    await input.press('Enter');

    // The popup should close and cell 4 (index 3) should become active
    await expect(
      page.locator('.jp-StatusBar-HoverItem .jp-lineFormSearch')
    ).toHaveCount(0);

    // Verify the 4th cell (0-based index 3) has the active class
    const activeCells = page.locator('.jp-Notebook-cell.jp-mod-active');
    await expect(activeCells).toHaveCount(1);
    const activeCell = await page.notebook.getCellLocator(3);
    await expect(activeCell!).toHaveClass(/jp-mod-active/);

    // Status bar should now reflect the new position
    await expect(counterItem).toHaveText(/Cell\s+4\//);
  });
});
