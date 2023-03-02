// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { test } from '@jupyterlab/galata';
import { expect } from '@playwright/test';
import * as path from 'path';

const fileName = 'search.ipynb';

test.describe('Notebook Search and Replace', () => {
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

  test('Replace in cell', async ({ page }) => {
    // Open search box
    await page.keyboard.press('Control+f');

    await page.fill('[placeholder="Find"]', 'with');

    await page.waitForSelector('text=1/21');

    await page.click('button[title="Toggle Replace"]');

    await page.fill('[placeholder="Replace"]', 'egg');

    await page.click('button:has-text("Replace")');

    await page.waitForSelector('text=1/20');

    const nbPanel = await page.notebook.getNotebookInPanel();

    expect(await nbPanel.screenshot()).toMatchSnapshot('replace-in-cell.png');
  });

  test('Substitute groups of regular expressions', async ({ page }) => {
    await page.keyboard.press('Control+f');

    await page.click('button[title="Use Regular Expression"]');
    await page.fill('[placeholder="Find"]', 'text/(\\w+)');
    await page.waitForSelector('text=1/3');

    await page.click('button[title="Toggle Replace"]');
    await page.fill('[placeholder="Replace"]', 'script/$1');
    const cell = await page.notebook.getCell(2);
    await expect(page.locator('body')).not.toContainText('script/plain');

    await page.click('button:has-text("Replace")');
    await page.waitForSelector('text=1/2');

    await cell.waitForSelector('text=script/plain');
    await expect(page.locator('body')).toContainText('script/plain');
  });

  test('Replace on markdown rendered cell', async ({ page }) => {
    // Open search box
    await page.keyboard.press('Control+f');

    await page.fill('[placeholder="Find"]', 'with');

    await page.waitForSelector('text=1/21');

    // Click next button
    await page.click('button[title="Next Match"]', {
      clickCount: 4
    });

    await page.click('button[title="Toggle Replace"]');

    await page.fill('[placeholder="Replace"]', 'egg');

    await page.click('button:has-text("Replace")');

    await page.waitForSelector('text=5/20');

    const cell = await page.notebook.getCell(1);

    expect(await (await cell.$('.jp-Editor')).screenshot()).toMatchSnapshot(
      'replace-in-markdown-rendered-cell.png'
    );
  });

  test('Replace all', async ({ page }) => {
    // Open search box
    await page.keyboard.press('Control+f');

    await page.fill('[placeholder="Find"]', 'with');

    await page.waitForSelector('text=1/21');

    await page.click('button[title="Toggle Replace"]');

    await page.fill('[placeholder="Replace"]', 'egg');

    await page.click('button:has-text("Replace All")');

    await page.waitForSelector('text=-/-');

    const nbPanel = await page.notebook.getNotebookInPanel();

    expect(await nbPanel.screenshot()).toMatchSnapshot('replace-all.png');
  });
});
