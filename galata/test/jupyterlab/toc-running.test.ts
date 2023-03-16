// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect, test } from '@jupyterlab/galata';

test.describe('ToC Running indicator', () => {
  test.beforeEach(async ({ page }) => {
    await page.notebook.createNew();
    await page.notebook.setCell(0, 'markdown', '# Title 1');
    await page.notebook.addCell('code', 'from time import sleep');
    await page.notebook.addCell('code', 'sleep(2)');
    await page.notebook.addCell('markdown', '## Title 1.1');
    await page.notebook.addCell('markdown', 'No heading');
    await page.notebook.addCell('code', 'sleep(2)');
    await page.notebook.addCell('markdown', '## Title 1.2');
    await page.notebook.addCell('code', 'sleep(1)');

    await page.sidebar.openTab('table-of-contents');
    await page.waitForSelector(
      '.jp-TableOfContents-content[data-document-type="notebook"] >> text=Title 1.2'
    );
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
    await page.notebook.run();

    // Collapse ToC
    await page.click(
      '[aria-label="Table of Contents section"] >> button:left-of(:text("Title 1"))'
    );

    const executed = page.notebook.runCell(5);

    await tocPanel.waitForSelector('[data-running="1"]');
    expect(await tocPanel.screenshot()).toMatchSnapshot(
      'toc-running-indicator-top-level.png'
    );

    await executed;
  });
});
