// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { test } from '@jupyterlab/galata';
import { expect } from '@playwright/test';
import * as path from 'path';

const fileName = 'scroll.ipynb';

test.describe('Notebook Scroll', () => {
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

  const cellLinks = {
    'penultimate cell using heading, legacy format': 18,
    'penultimate cell using heading, explicit fragment': 18,
    'last cell using heading, legacy format': 19,
    'last cell using heading, explicit fragment': 19,
    'last cell using cell identifier': 19
  };
  for (const [link, cellIdx] of Object.entries(cellLinks)) {
    test(`Scroll to ${link}`, async ({ page }) => {
      const firstCell = await page.notebook.getCell(0);
      await firstCell.scrollIntoViewIfNeeded();
      expect(await firstCell.boundingBox()).toBeTruthy();

      await page.click(`a:has-text("${link}")`);

      await firstCell.waitForElementState('hidden');
      expect(await firstCell.boundingBox()).toBeFalsy();

      const lastCell = await page.notebook.getCell(cellIdx);
      await lastCell.waitForElementState('visible');
      expect(await lastCell.boundingBox()).toBeTruthy();
    });
  }
});
