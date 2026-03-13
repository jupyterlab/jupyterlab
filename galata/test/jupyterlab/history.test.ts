/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { expect, galata, test } from '@jupyterlab/galata';

test.describe('test kernel history keybindings', () => {
  test.use({
    mockSettings: {
      ...galata.DEFAULT_SETTINGS,
      '@jupyterlab/notebook-extension:tracker': {
        accessKernelHistory: true
      }
    }
  });
  test('Use history keybindings', async ({ page }) => {
    await page.notebook.createNew('notebook.ipynb');
    await page.notebook.setCell(0, 'code', '1 + 2');
    await page.notebook.addCell('code', '2 + 3');
    await page.notebook.addCell('code', '3 + 4');
    await page.notebook.run();

    await page.notebook.enterCellEditingMode(2);
    await page.keyboard.press('Alt+ArrowUp');
    // input: 2+3
    await page.keyboard.press('End');
    await page.notebook.enterCellEditingMode(1);
    await page.keyboard.press('End');
    await page.notebook.enterCellEditingMode(2);
    await page.keyboard.press('Alt+ArrowUp');
    // test fails without this wait
    await page.waitForTimeout(100);
    // input: 3+4
    await page.keyboard.press('Alt+ArrowDown');
    // input 2+3
    await page.keyboard.press('Alt+ArrowUp');
    // input 3+4
    await page.keyboard.press('Alt+ArrowUp');
    // input 1+2

    const imageName = 'history.png';
    const nbPanel = await page.notebook.getNotebookInPanelLocator();

    expect(await nbPanel!.screenshot()).toMatchSnapshot(imageName);
  });
});
