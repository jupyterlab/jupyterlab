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

    await page.locator('text=1/21').waitFor();

    await page.click('button[title="Show Replace"]');

    await page.fill('[placeholder="Replace"]', 'egg');

    await page.click('button:has-text("Replace")');

    await page.locator('text=1/20').waitFor();

    const nbPanel = await page.notebook.getNotebookInPanelLocator();

    expect(await nbPanel!.screenshot()).toMatchSnapshot('replace-in-cell.png');
  });

  test('Substitute groups of regular expressions', async ({ page }) => {
    await page.keyboard.press('Control+f');

    await page.click('button[title="Use Regular Expression"]');
    await page.fill('[placeholder="Find"]', 'text/(\\w+)');
    await page.locator('text=1/3').waitFor();

    await page.click('button[title="Show Replace"]');
    await page.fill('[placeholder="Replace"]', 'script/$1');
    const cell = await page.notebook.getCellLocator(2);
    await expect(page.locator('body')).not.toContainText('script/plain');

    await page.click('button:has-text("Replace")');
    await page.locator('text=1/2').waitFor();

    await cell!.locator('text=script/plain').waitFor();
    await expect(page.locator('body')).toContainText('script/plain');
  });

  test('Replace on markdown rendered cell', async ({ page }) => {
    // Open search box
    await page.keyboard.press('Control+f');

    await page.fill('[placeholder="Find"]', 'with');

    await page.locator('text=1/21').waitFor();

    // Click next button
    await page.click('button[title^="Next Match"]', {
      clickCount: 4
    });

    await page.click('button[title="Show Replace"]');

    await page.fill('[placeholder="Replace"]', 'egg');

    await page.click('button:has-text("Replace")');

    await page.locator('text=5/20').waitFor();

    const cell = await page.notebook.getCellLocator(1);

    expect(
      await cell!.locator('.jp-Editor').first().screenshot()
    ).toMatchSnapshot('replace-in-markdown-rendered-cell.png');
  });

  test('Replace all', async ({ page, browserName }) => {
    test.skip(browserName === 'firefox', 'Flaky on Firefox');

    // Open search box
    await page.keyboard.press('Control+f');

    await page.fill('[placeholder="Find"]', 'with');

    await page.locator('text=1/21').waitFor();

    await page.click('button[title="Show Replace"]');

    await page.fill('[placeholder="Replace"]', 'egg');

    await page.click('button:has-text("Replace All")');

    await page.locator('text=-/-').waitFor();

    const nbPanel = await page.notebook.getNotebookInPanelLocator();

    expect(await nbPanel!.screenshot()).toMatchSnapshot('replace-all.png');
  });

  ['code', 'markdown', 'raw'].forEach(cell1Type => {
    ['code', 'markdown', 'raw'].forEach(cell2Type => {
      test(`Replace step-by-step across ${cell1Type} and ${cell2Type} cell boundaries`, async ({
        page,
        browserName
      }) => {
        test.skip(browserName === 'firefox', 'Flaky on Firefox');

        // Create a small test notebook
        await page.notebook.createNew();
        await page.notebook.setCell(0, cell1Type, 'test\ntest');
        await page.notebook.addCell(cell2Type, 'test\ntest');

        await page.keyboard.press('Control+f');
        await page.fill('[placeholder="Find"]', 'test');

        await page.click('button[title="Show Replace"]');
        await page.fill('[placeholder="Replace"]', 'egg');

        // TODO: Next Match press count should be one less
        // (the -/4 state should not be necessary).
        await page.locator('text=-/4').waitFor();
        await page.click('button[title^="Next Match"]', {
          clickCount: 3
        });

        await page.locator('text=1/4').waitFor();
        await page.click('button:has-text("Replace")');

        await page.locator('text=1/3').waitFor();
        await page.click('button:has-text("Replace")');

        // At this point we should be in the second cell
        await page.locator('text=1/2').waitFor();
        await page.click('button:has-text("Replace")');

        await page.locator('text=1/1').waitFor();

        await page.click('button:has-text("Replace")');
        await page.locator('text=-/-').waitFor();
      });

      test(`Replace in a ${cell1Type} cell and a ${cell2Type} cell with a string containing the query string`, async ({
        page,
        browserName
      }) => {
        test.skip(browserName === 'firefox', 'Flaky on Firefox');
        // Create a small test notebook
        await page.notebook.createNew();
        await page.notebook.setCell(0, cell1Type, 'test\ntest');
        await page.notebook.addCell(cell2Type, 'test\ntest');

        await page.keyboard.press('Control+f');
        await page.fill('[placeholder="Find"]', 'test');

        await page.click('button[title="Show Replace"]');
        await page.fill('[placeholder="Replace"]', 'tester');

        // TODO: Next Match press count should be one less
        // (the -/4 state should not be necessary).
        await page.locator('text=-/4').waitFor();
        await page.click('button[title^="Next Match"]', {
          clickCount: 3
        });

        await page.locator('text=1/4').waitFor();
        await page.click('button:has-text("Replace")');

        await page.locator('text=2/4').waitFor();
        await page.click('button:has-text("Replace")');

        // At this point we should be in the second cell
        await page.locator('text=3/4').waitFor();
        await page.click('button:has-text("Replace")');

        await page.locator('text=4/4').waitFor();

        await page.click('button:has-text("Replace")');
        await page.locator('text=1/4').waitFor();
      });

      test(`Replace in a ${cell1Type} cell and a ${cell2Type} cell with a string containing the query string twice`, async ({
        page,
        browserName
      }) => {
        test.skip(browserName === 'firefox', 'Flaky on Firefox');
        // Create a small test notebook
        await page.notebook.createNew();
        await page.notebook.setCell(0, cell1Type, 'test\ntest');
        await page.notebook.addCell(cell2Type, 'test\ntest');

        await page.keyboard.press('Control+f');
        await page.fill('[placeholder="Find"]', 'test');

        await page.click('button[title="Show Replace"]');
        await page.fill('[placeholder="Replace"]', 'testtest');

        // TODO: Next Match press count should be one less
        // (the -/4 state should not be necessary).
        await page.locator('text=-/4').waitFor();
        await page.click('button[title^="Next Match"]', {
          clickCount: 3
        });

        await page.locator('text=1/4').waitFor();
        await page.click('button:has-text("Replace")');

        // We should move to the first match after the first replacement.
        await page.locator('text=3/5').waitFor();
        await page.click('button:has-text("Replace")');

        // At this point we should be in the second cell
        await page.locator('text=5/6').waitFor();
        await page.click('button:has-text("Replace")');

        await page.locator('text=7/7').waitFor();

        await page.click('button:has-text("Replace")');
        await page.locator('text=1/8').waitFor();
      });

      test(`Replace in a ${cell1Type} cell and a ${cell2Type} cell with a string containing the query string three times`, async ({
        page,
        browserName
      }) => {
        test.skip(browserName === 'firefox', 'Flaky on Firefox');
        // Create a small test notebook
        await page.notebook.createNew();
        await page.notebook.setCell(0, cell1Type, 'test\ntest');
        await page.notebook.addCell(cell2Type, 'test\ntest');

        await page.keyboard.press('Control+f');
        await page.fill('[placeholder="Find"]', 'test');

        await page.click('button[title="Show Replace"]');
        await page.fill('[placeholder="Replace"]', 'testtesttest');

        // TODO: Next Match press count should be one less
        // (the -/4 state should not be necessary).
        await page.locator('text=-/4').waitFor();
        await page.click('button[title^="Next Match"]', {
          clickCount: 3
        });

        await page.locator('text=1/4').waitFor();
        await page.click('button:has-text("Replace")');

        // We should move to the first match after the first replacement.
        await page.locator('text=4/6').waitFor();
        await page.click('button:has-text("Replace")');

        // At this point we should be in the second cell
        await page.locator('text=7/8').waitFor();
        await page.click('button:has-text("Replace")');

        await page.locator('text=10/10').waitFor();

        await page.click('button:has-text("Replace")');
        await page.locator('text=1/12').waitFor();
      });
    });
  });
});
