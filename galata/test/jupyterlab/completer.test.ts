// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect, galata, test } from '@jupyterlab/galata';
import * as path from 'path';

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
      expect(await completer.screenshot()).toMatchSnapshot(imageName);
    });

    test('Show documentation panel', async ({ page, tmpPath }) => {
      const scriptName = 'completer_panel.py';
      await page.contents.uploadFile(
        path.resolve(__dirname, `./notebooks/${scriptName}`),
        `${tmpPath}/${scriptName}`
      );
      await galata.Mock.mockSettings(page, [], {
        ...galata.DEFAULT_SETTINGS,
        '@jupyterlab/completer-extension:manager': {
          showDocumentationPanel: true
        }
      });
      await page.notebook.save();
      await page.goto();
      await page.notebook.openByPath(fileName);

      await page.notebook.setCell(
        0,
        'code',
        'from completer_panel import option_1, option_2'
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
      await page.waitForSelector('.jp-Completer-loading-bar');
      await page.waitForSelector('.jp-Completer-loading-bar', {
        state: 'detached'
      });
      const imageName = 'completer-with-doc-panel.png';
      expect(await completer.screenshot()).toMatchSnapshot(imageName);
    });

    test('Token completions show up without running the cell when in the same cell', async ({
      page
    }) => {
      await page.notebook.setCell(
        0,
        'code',
        'option_1 = 1\n' +
          'option_2 = lambda x: x\n' +
          'option_3 = int\n' +
          'option'
      );
      await page.notebook.enterCellEditingMode(0);
      // move to the end of cell
      await page.keyboard.press('PageDown');
      await page.keyboard.press('End');

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
      const imageName = 'token-completer.png';
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
