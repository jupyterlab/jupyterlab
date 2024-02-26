// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect, galata, test } from '@jupyterlab/galata';

const fileName = 'toc_running.ipynb';
import * as path from 'path';

test.describe('ToC Running indicator', () => {
  test.beforeEach(async ({ page, tmpPath }) => {
    await page.notebook.openByPath(`${tmpPath}/${fileName}`);
    await page.notebook.activate(fileName);

    await page.sidebar.openTab('table-of-contents');
    // Wait until the last heading has loaded into the ToC
    await page.waitForSelector(
      '.jp-TableOfContents-content[data-document-type="notebook"] >> text=Title 1.3'
    );
  });

  test.beforeAll(async ({ request, tmpPath }) => {
    const contents = galata.newContentsHelper(request);

    await contents.uploadFile(
      path.resolve(__dirname, `./notebooks/${fileName}`),
      `${tmpPath}/${fileName}`
    );
  });

  test.afterAll(async ({ request, tmpPath }) => {
    const contents = galata.newContentsHelper(request);
    await contents.deleteDirectory(tmpPath);
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

  test('should display error indicators', async ({ page }) => {
    const tocPanel = await page.sidebar.getContentPanel(
      await page.sidebar.getTabPosition('table-of-contents')
    );
    const executed = page.notebook.run();
    await tocPanel.waitForSelector('[data-running="-0.5"]');
    expect(await tocPanel.screenshot()).toMatchSnapshot(
      'toc-running-indicator-error.png'
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
