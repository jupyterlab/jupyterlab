// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
import { test } from '@jupyterlab/galata';
import { expect } from '@playwright/test';

const DEFAULT_NAME = 'untitled.txt';

test.beforeEach(async ({ page }) => {
  await page.menu.clickMenuItem('File>New>Text File');
  await page.locator(`[role="main"] >> text=${DEFAULT_NAME}`).waitFor();
  await page.activity.closeAll();
});

test.afterEach(async ({ page, tmpPath }) => {
  if (
    await page.filebrowser.contents.fileExists(`${tmpPath}/${DEFAULT_NAME}`)
  ) {
    await page.filebrowser.contents.deleteFile(`${tmpPath}/${DEFAULT_NAME}`);
  }
});

test('Should open the document and activate it by default', async ({
  page,
  tmpPath
}) => {
  await page.evaluate(async filename => {
    await window.jupyterapp.commands.execute('docmanager:open', {
      path: filename
    });
  }, `${tmpPath}/${DEFAULT_NAME}`);

  const tab = page.activity.getTabLocator(DEFAULT_NAME);
  await expect(tab).toHaveClass(/jp-mod-active/);
});

test('Should open the document and not activate it', async ({
  page,
  tmpPath
}) => {
  await page.evaluate(async filename => {
    await window.jupyterapp.commands.execute('docmanager:open', {
      path: filename,
      options: {
        activate: false
      }
    });
  }, `${tmpPath}/${DEFAULT_NAME}`);

  const tab = page.activity.getTabLocator(DEFAULT_NAME);
  await expect(tab).not.toHaveClass(/jp-mod-active/);
});
