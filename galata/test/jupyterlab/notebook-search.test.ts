// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { test } from '@jupyterlab/galata';
import { expect } from '@playwright/test';
import * as path from 'path';

const fileName = 'search.ipynb';

test.describe('Notebook Search', () => {
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

  test('Search', async ({ page }) => {
    // Open search box
    await page.keyboard.press('Control+f');

    await page.fill('[placeholder="Find"]', 'with');

    await page.waitForSelector('text=1/21');

    const nbPanel = await page.notebook.getNotebookInPanel();

    expect(await nbPanel.screenshot()).toMatchSnapshot('search.png');
  });

  test('Typing in search box', async ({ page }) => {
    // Check against React being too eager with controling state of input box
    await page.keyboard.press('Control+f');

    await page.fill('[placeholder="Find"]', '14');
    await page.press('[placeholder="Find"]', 'ArrowLeft');
    await page.type('[placeholder="Find"]', '2');
    await page.type('[placeholder="Find"]', '3');

    await expect(page.locator('[placeholder="Find"]')).toHaveValue('1234');
  });

  test('RegExp parsing failure', async ({ page }) => {
    await page.keyboard.press('Control+f');

    await page.fill('[placeholder="Find"]', 'test\\');

    await page.click('button[title="Use Regular Expression"]');

    await expect(page.locator('.jp-DocumentSearch-regex-error')).toBeVisible();

    const overlay = page.locator('.jp-DocumentSearch-overlay');

    expect(await overlay.screenshot()).toMatchSnapshot(
      'regexp-parsing-failure.png'
    );
  });

  test('Multi-line search', async ({ page }) => {
    await page.keyboard.press('Control+f');

    await page.fill(
      '[placeholder="Find"]',
      'one notebook withr\n\n\nThis is a multi'
    );

    await page.waitForSelector('text=1/1');

    // Show replace buttons to check for visual regressions
    await page.click('button[title="Toggle Replace"]');
    await page.fill('[placeholder="Replace"]', 'line1\nline2');

    const overlay = page.locator('.jp-DocumentSearch-overlay');
    expect(await overlay.screenshot()).toMatchSnapshot('multi-line-search.png');
  });

  test('Search selected', async ({ page }) => {
    // Enter first cell
    await page.notebook.enterCellEditingMode(0);

    // Go to first line
    await page.keyboard.press('PageUp');

    // Select first line
    await page.keyboard.press('Shift+End');

    // Open search box
    await page.keyboard.press('Control+f');

    // Expect it to be populated with first line
    await page.waitForSelector(
      '[placeholder="Find"] >> text="Test with one notebook withr"'
    );

    // Expect both matches to be found (xfail)
    // await page.waitForSelector('text=1/2');

    await expect(page.locator('.jp-DocumentSearch-overlay')).toBeVisible();
  });

  test('Close with Escape', async ({ page }) => {
    // Open search box
    await page.keyboard.press('Control+f');
    await expect(page.locator('.jp-DocumentSearch-overlay')).toBeVisible();

    // Close search box
    await page.keyboard.press('Escape');
    await expect(page.locator('.jp-DocumentSearch-overlay')).toBeHidden();
  });

  test('Close with Escape from Notebook', async ({ page }) => {
    // Open search box
    await page.keyboard.press('Control+f');
    await expect(page.locator('.jp-DocumentSearch-overlay')).toBeVisible();

    // Enter first cell
    await page.notebook.enterCellEditingMode(0);

    // First escape should NOT close the search box (but leave the editing mode)
    await page.keyboard.press('Escape');
    await page.waitForTimeout(250);
    expect(await page.notebook.isCellInEditingMode(0)).toBeFalsy();
    expect(await page.isVisible('.jp-DocumentSearch-overlay')).toBeTruthy();

    // Second escape should close the search box (even if it is not focused)
    await page.keyboard.press('Escape');
    await expect(page.locator('.jp-DocumentSearch-overlay')).toBeHidden();
  });

  test('Search within outputs', async ({ page }) => {
    // Open search box
    await page.keyboard.press('Control+f');

    await page.fill('[placeholder="Find"]', 'with');

    await page.click('button[title="Show Search Filters"]');

    await page.click('text=Search Cell Outputs');

    await page.waitForSelector('text=1/29');

    const cell = await page.notebook.getCell(5);
    await cell.scrollIntoViewIfNeeded();

    const nbPanel = await page.notebook.getNotebookInPanel();

    expect(await nbPanel.screenshot()).toMatchSnapshot(
      'search-within-outputs.png'
    );
  });

  test('Search in selected cells', async ({ page }) => {
    // Open search box
    await page.keyboard.press('Control+f');

    await page.fill('[placeholder="Find"]', 'with');

    await page.click('button[title="Show Search Filters"]');

    await page.click('text=Search Selected Cell(s)');

    await page.waitForSelector('text=1/4');

    const nbPanel = await page.notebook.getNotebookInPanel();

    expect(await nbPanel.screenshot()).toMatchSnapshot(
      'search-in-selected-cells.png'
    );
  });

  test('Highlight next hit same editor', async ({ page }) => {
    // Open search box
    await page.keyboard.press('Control+f');

    await page.fill('[placeholder="Find"]', 'with');

    await page.waitForSelector('text=1/21');

    // Click next button
    await page.click('button[title="Next Match"]');

    const cell = await page.notebook.getCell(0);

    expect(await (await cell.$('.jp-Editor')).screenshot()).toMatchSnapshot(
      'highlight-next-in-editor.png'
    );
  });

  test('Highlight next hit in the next cell', async ({ page }) => {
    // Open search box
    await page.keyboard.press('Control+f');

    await page.fill('[placeholder="Find"]', 'with');

    await page.waitForSelector('text=1/21');

    // Click next button
    await page.click('button[title="Next Match"]', {
      clickCount: 4
    });

    const cell = await page.notebook.getCell(1);

    expect(await cell.screenshot()).toMatchSnapshot('highlight-next-cell.png');
  });

  test('Highlight previous hit', async ({ page }) => {
    // Open search box
    await page.keyboard.press('Control+f');

    await page.fill('[placeholder="Find"]', 'with');

    await page.waitForSelector('text=1/21');

    const cell = await page.notebook.getCell(5);
    await cell.click();
    await page.keyboard.press('Escape');
    await cell.scrollIntoViewIfNeeded();

    // Click previous button
    await page.click('button[title="Previous Match"]');
    await page.waitForSelector('text=19/21');

    const hit = await page.notebook.getCell(2);
    expect(await hit.screenshot()).toMatchSnapshot(
      'highlight-previous-element.png'
    );
  });

  test('Highlight on markdown rendered state change', async ({ page }) => {
    // Open search box
    await page.keyboard.press('Control+f');

    await page.fill('[placeholder="Find"]', 'with');

    await page.waitForSelector('text=1/21');

    // Click next button
    await page.click('button[title="Next Match"]', {
      clickCount: 4
    });

    const cell = await page.notebook.getCell(1);

    await cell.dblclick();

    expect(await (await cell.$('.jp-Editor')).screenshot()).toMatchSnapshot(
      'highlight-markdown-switch-state.png'
    );
  });

  test('Search on typing', async ({ page }) => {
    // Open search box
    await page.keyboard.press('Control+f');

    await page.fill('[placeholder="Find"]', 'with');

    await page.notebook.setCell(5, 'code', 'with');

    const cell = await page.notebook.getCell(5);
    expect(await cell.screenshot()).toMatchSnapshot('search-typing.png');
  });

  test('Search new outputs', async ({ page }) => {
    // Open search box
    await page.keyboard.press('Control+f');

    await page.fill('[placeholder="Find"]', 'with');

    await page.click('button[title="Show Search Filters"]');

    await page.click('text=Search Cell Outputs');

    await page.waitForSelector('text=1/29');

    const cell = await page.notebook.getCell(5);

    await cell.click();

    await page.notebook.runCell(5);
    expect(await cell.screenshot()).toMatchSnapshot('search-new-outputs.png');
  });

  test('Search on new cell', async ({ page }) => {
    // Open search box
    await page.keyboard.press('Control+f');

    await page.fill('[placeholder="Find"]', 'with');

    await page.waitForSelector('text=1/21');

    const cell = await page.notebook.getCell(5);
    await cell.click();
    await page.notebook.clickToolbarItem('insert');
    await page.notebook.setCell(6, 'code', 'with');

    const nbPanel = await page.notebook.getNotebookInPanel();

    expect(await nbPanel.screenshot()).toMatchSnapshot(
      'search-on-new-cell.png'
    );
  });

  test('Search on deleted cell', async ({ page }) => {
    // Open search box
    await page.keyboard.press('Control+f');

    await page.fill('[placeholder="Find"]', 'with');

    await page.waitForSelector('text=1/21');

    const cell = await page.notebook.getCell(5);
    await cell.click();
    await page.keyboard.press('Escape');
    await cell.scrollIntoViewIfNeeded();

    await page.keyboard.press('d');
    await page.keyboard.press('d');

    await page.waitForSelector('text=-/19');

    const nbPanel = await page.notebook.getNotebookInPanel();

    expect(await nbPanel.screenshot()).toMatchSnapshot(
      'search-on-deleted-cell.png'
    );
  });
});
