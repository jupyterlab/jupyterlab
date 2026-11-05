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

  test('Notebook scrolls to a heading after its cell was edited', async ({
    page
  }) => {
    // The ToC numbers a heading once it has mapped it to its element
    await page
      .getByRole('button', { name: 'Show heading number in the document' })
      .click();
    await expect(
      page
        .locator('.jp-Notebook h2', { hasText: 'another one' })
        .locator('.numbering-entry')
    ).toHaveText('1.2.');

    // Rendering the edited cell replaces its heading element
    await page.notebook.enterCellEditingMode(2);
    await page.keyboard.press('ControlOrMeta+End');
    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter');
    await page.keyboard.type('New text');
    await page.keyboard.press('Shift+Enter');
    await page
      .locator('.jp-Notebook .jp-RenderedMarkdown', { hasText: 'New text' })
      .waitFor();

    const toc = page.locator('.jp-TableOfContents-tree');
    const headingOffset = async (text: string) => {
      const heading = await page
        .locator('.jp-Notebook h2', { hasText: text })
        .boundingBox();
      const notebook = await page
        .locator('.jp-Notebook .jp-WindowedPanel-outer')
        .boundingBox();
      return heading!.y - notebook!.y;
    };

    // Where scrolling puts a heading whose cell was not edited. It depends on
    // the heading's scroll-margin-top and the offset applied by the ToC.
    await toc.getByText('a subtitle').click();
    await waitForNotebookScrollEnd(page);
    const expected = await headingOffset('a subtitle');

    // The heading of the edited cell is scrolled to the same place
    await toc.getByText('another one').click();
    await waitForNotebookScrollEnd(page);
    const offset = await headingOffset('another one');
    expect(Math.abs(offset - expected)).toBeLessThan(2);
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
