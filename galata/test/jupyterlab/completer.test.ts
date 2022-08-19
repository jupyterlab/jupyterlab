// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect, test } from '@jupyterlab/galata';

const fileName = 'notebook.ipynb';
const COMPLETER_SELECTOR = '.jp-Completer';

test.describe('Completer', () => {
  test.describe('Notebook', () => {
    test.beforeEach(async ({ page }) => {
      await page.notebook.createNew(fileName);
    });

    test('Open completer on notebook', async ({ page }) => {
      await page.notebook.setCell(
        0,
        'code',
        'option_1 = 1\n' + 'option_2 = lambda x: x\n' + 'option_3 = int'
      );
      await page.notebook.runCell(0, true);
      await page.notebook.addCell('code', 'option');
      await page.notebook.enterCellEditingMode(1);

      // we need to wait until the completer gets bound to the cell after entering it
      await page.waitForTimeout(50);
      await page.keyboard.press('Tab');
      let completer = page.locator(COMPLETER_SELECTOR);
      await completer.waitFor();
      await page.keyboard.press('Escape');
      await page.waitForTimeout(50);
      await expect(completer).toBeHidden();
      await page.keyboard.press('Tab');
      completer = page.locator(COMPLETER_SELECTOR);
      await completer.waitFor();
      const imageName = 'completer.png';
      // TODO: on first trigger types are not properly displayed, reference image will need updating
      expect(await completer.screenshot()).toMatchSnapshot(imageName);
    });

    test('Filter notebook completer suggestions by typing', async ({
      page
    }) => {
      // test against https://github.com/jupyterlab/jupyterlab/issues/11377

      // `getopt` did not change much in many years, it should be stable
      await page.notebook.setCell(0, 'code', 'import getopt');
      await page.notebook.runCell(0, true);
      await page.notebook.addCell('code', 'getopt.');
      await page.notebook.enterCellEditingMode(1);

      // we need to wait until the completer gets bound to the cell after entering it
      await page.waitForTimeout(50);
      await page.keyboard.press('Tab');

      let completer = page.locator(COMPLETER_SELECTOR);
      await completer.waitFor();
      await page.keyboard.press('Escape');
      await page.waitForTimeout(50);
      await expect(completer).toBeHidden();
      await page.keyboard.press('Tab');
      completer = page.locator(COMPLETER_SELECTOR);
      await completer.waitFor();
      await page.keyboard.type('g', { delay: 50 });

      const imageName = 'completer-filter.png';
      expect(await completer.screenshot()).toMatchSnapshot(imageName);
    });
  });

  test.describe('Console', () => {
    test.beforeEach(async ({ page }) => {
      await page.menu.clickMenuItem('File>New>Console');

      await page.click('button:has-text("Select")');

      await page.waitForSelector('[aria-label="Code Cell Content"]');
      await page.waitForSelector('text=| Idle');

      await page.keyboard.type('import getopt\ngetopt.');
      await page.keyboard.press('Tab');
      // we need to wait until the completer gets bound to the cell after entering it
      await page.waitForTimeout(50);
    });

    test('Open completer on console', async ({ page }) => {
      const completer = page.locator(COMPLETER_SELECTOR);
      await completer.waitFor();

      const imageName = 'completer-console.png';
      // TODO: on first trigger types are not properly displayed, reference image will need updating
      expect(await completer.screenshot()).toMatchSnapshot(imageName);
    });

    test('Filter console completer suggestions by typing', async ({ page }) => {
      const completer = page.locator(COMPLETER_SELECTOR);
      await completer.waitFor();

      await page.keyboard.type('g', { delay: 10 });

      const imageName = 'completer-console-filter.png';
      expect(await completer.screenshot()).toMatchSnapshot(imageName);
    });
  });
});
