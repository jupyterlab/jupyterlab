// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { test } from '@jupyterlab/galata';
import { expect } from '@playwright/test';

test.describe('ToC Running indicator', () => {
  test.beforeEach(async ({ page }) => {
    await page.notebook.createNew();
    await page.notebook.addCell('markdown', '# Title 1');
    await page.notebook.addCell('code', 'from time import sleep');
    await page.notebook.addCell('code', 'sleep(2)');
    await page.notebook.addCell('markdown', '## Title 1.1');
    await page.notebook.addCell('code', 'sleep(2)');
    await page.notebook.addCell('markdown', '## Title 1.2');
    await page.notebook.addCell('code', 'sleep(1)');

    await page.notebook.run();

    await page.sidebar.openTab('table-of-contents');
  });

  test('should display running indicators', async ({ page }) => {
    const tocPanel = await page.sidebar.getContentPanel(
      await page.sidebar.getTabPosition('table-of-contents')
    );
    const executed = page.notebook.run();

    await tocPanel.waitForSelector('[data-running="1"]');
    expect(await tocPanel.screenshot()).toMatchSnapshot(
      'toc-running-indicators.png'
    );

    await executed;
  });

  test('should display running indicator on first visible top level', async ({
    page
  }) => {
    const tocPanel = await page.sidebar.getContentPanel(
      await page.sidebar.getTabPosition('table-of-contents')
    );
    // Collapse ToC
    await page.click(
      '[aria-label="Table of Contents section"] li >> :nth-match(div, 3)'
    );

    const executed = page.notebook.runCell(5);

    await tocPanel.waitForSelector('[data-running="1"]');
    expect(await tocPanel.screenshot()).toMatchSnapshot(
      'toc-running-indicator-top-level.png'
    );

    await executed;
  });

  test('should display running indicator in prompt', async ({ page }) => {
    const tocPanel = await page.sidebar.getContentPanel(
      await page.sidebar.getTabPosition('table-of-contents')
    );
    const toolbarButtons = await tocPanel.$$('.toc-toolbar .toc-toolbar-icon');
    await toolbarButtons[0].click();

    const executed = page.notebook.runCell(3);

    await expect(
      tocPanel.waitForSelector('li:has-text("[*]: xxxxxxxxxx sleep(2)")')
    ).toBeDefined();

    await executed;
  });
});
