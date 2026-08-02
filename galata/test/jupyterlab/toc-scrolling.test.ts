// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect, galata, test } from '@jupyterlab/galata';
import type { Page } from '@playwright/test';
import * as path from 'path';

const fileName = 'toc_scrolling_notebook.ipynb';

test.use({ tmpPath: 'test-toc-scrolling' });

test.describe('Table of Contents scrolling to heading', () => {
  test.beforeAll(async ({ request, tmpPath }) => {
    const contents = galata.newContentsHelper(request);
    await contents.uploadFile(
      path.resolve(__dirname, `./notebooks/${fileName}`),
      `${tmpPath}/${fileName}`
    );
  });

  test.beforeEach(async ({ page, tmpPath }) => {
    await page.notebook.openByPath(`${tmpPath}/${fileName}`);
    await page.notebook.activate(fileName);

    await page.sidebar.openTab('table-of-contents');
  });

  test.afterEach(async ({ page }) => {
    await page.notebook.close(true);
  });

  test('Notebook scrolls to heading', async ({ page }) => {
    await page.notebook.selectCells(0);

    await page.keyboard.press('Enter');
    await page.getByText('Mode: Edit').waitFor();

    const contentPanel = page.sidebar.getContentPanelLocator(
      (await page.sidebar.getTabPosition('table-of-contents')) ?? undefined
    );
    await contentPanel.waitFor();

    await page
      .locator('.jp-TableOfContents-tree')
      .getByText('the last one')
      .click();
    await waitForNotebookScrollEnd(page);

    // Should switch to command mode
    await expect.soft(page.getByText('Mode: Command')).toBeVisible();

    const nbPanel = await page.notebook.getNotebookInPanelLocator();
    expect
      .soft(await nbPanel!.screenshot())
      .toMatchSnapshot('scrolled-to-bottom-heading.png');

    // Scroll up
    const bbox = await nbPanel!.boundingBox();
    await page.mouse.move(
      bbox!.x + 0.5 * bbox!.width,
      bbox!.y + 0.5 * bbox!.height
    );
    await page.mouse.wheel(0, -1200);
    await waitForNotebookScrollEnd(page);

    await page
      .locator('.jp-TableOfContents-tree')
      .getByText('the last one')
      .click();
    await waitForNotebookScrollEnd(page);

    expect(await nbPanel!.screenshot()).toMatchSnapshot(
      'scrolled-to-bottom-heading.png'
    );
  });
});

/**
 * Wait for the notebook scroll position to stabilise across one animation frame.
 * scrollIntoView fires inside a Promise chain after scrollToItem resolves.
 * This checks that scrollTop is unchanged between two consecutive frames.
 */
async function waitForNotebookScrollEnd(page: Page): Promise<void> {
  await page.waitForFunction(() => {
    const outer = document.querySelector(
      '.jp-Notebook .jp-WindowedPanel-outer'
    );
    if (!outer) {
      return true;
    }
    return new Promise<boolean>(resolve => {
      const pos = outer.scrollTop;
      requestAnimationFrame(() => resolve(outer.scrollTop === pos));
    });
  });
}
