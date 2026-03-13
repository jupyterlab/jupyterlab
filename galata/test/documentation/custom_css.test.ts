// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect, galata, test } from '@jupyterlab/galata';
import { filterContent } from './utils';
import fs from 'fs';
import path from 'path';

test.use({
  autoGoto: false,
  mockState: galata.DEFAULT_DOCUMENTATION_STATE,
  viewport: { height: 720, width: 1280 }
});

test.describe('Use custom CSS layout', () => {
  test('should apply custom CSS to main page', async ({ page }) => {
    await galata.Mock.mockCustomCSS(
      page,
      fs.readFileSync(path.resolve(__dirname, './data/custom-jupyter.css'), {
        encoding: 'utf-8'
      })
    );
    await galata.Mock.freezeContentLastModified(page, filterContent);
    await page.goto();
    await page.addStyleTag({
      content: `.jp-LabShell.jp-mod-devMode {
        border-top: none;
      }`
    });

    expect(await page.screenshot()).toMatchSnapshot('custom-css-main.png');
  });

  test('should apply custom CSS to h1 headings', async ({ page, tmpPath }) => {
    await galata.Mock.mockCustomCSS(
      page,
      fs.readFileSync(path.resolve(__dirname, './data/custom-markdown.css'), {
        encoding: 'utf-8'
      })
    );
    const fileName = 'markdownCells.ipynb';
    await page.contents.uploadFile(
      path.resolve(__dirname, `./data/${fileName}`),
      `${tmpPath}/${fileName}`
    );
    await page.goto();

    await page.notebook.openByPath(`${tmpPath}/${fileName}`);
    await page.notebook.activate(fileName);
    const panel = (await page.activity.getPanelLocator())!;

    expect(await panel.locator('.jp-Notebook').screenshot()).toMatchSnapshot(
      'custom-css-notebook-markdown.png'
    );
  });
});
