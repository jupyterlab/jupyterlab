// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { galata, test } from '@jupyterlab/galata';
import { expect } from '@playwright/test';
import * as path from 'path';

const fileName = 'toc_notebook.ipynb';

test.use({ tmpPath: 'test-toc' });

test.describe.serial('Table of Contents', () => {
  test.beforeAll(async ({ baseURL, tmpPath }) => {
    const contents = galata.newContentsHelper(baseURL);
    await contents.uploadFile(
      path.resolve(__dirname, `./notebooks/${fileName}`),
      `${tmpPath}/${fileName}`
    );
    await contents.uploadFile(
      path.resolve(__dirname, './notebooks/WidgetArch.png'),
      `${tmpPath}/WidgetArch.png`
    );
  });

  test.beforeEach(async ({ page, tmpPath }) => {
    await page.notebook.openByPath(`${tmpPath}/${fileName}`);
    await page.notebook.activate(fileName);
  });

  test.afterEach(async ({ page }) => {
    await page.notebook.close(true);
  });

  test.afterAll(async ({ baseURL, tmpPath }) => {
    const contents = galata.newContentsHelper(baseURL);
    await contents.deleteDirectory(tmpPath);
  });

  test('Add tags', async ({ page }) => {
    await page.sidebar.openTab('jp-property-inspector');
    const imageName = 'add-tags.png';
    const tagInputSelector = 'div.tag-holder input.add-tag';
    let piPanel = await page.sidebar.getContentPanel(
      await page.sidebar.getTabPosition('jp-property-inspector')
    );
    let addTagInput = await piPanel.$(tagInputSelector);
    await addTagInput.click();
    await page.keyboard.insertText('tag1');
    await page.keyboard.press('Enter');
    addTagInput = await piPanel.$(tagInputSelector);
    await addTagInput.click();
    await page.keyboard.insertText('tag2');
    await page.keyboard.press('Enter');
    await page.notebook.save();

    const cellTagsPanel = await piPanel.$('.jp-NotebookTools-tool.jp-TagTool');

    expect(await cellTagsPanel.screenshot()).toMatchSnapshot(imageName);
  });

  test('Assign tags to cells', async ({ page }) => {
    await page.notebook.selectCells(6);

    await page.sidebar.openTab('jp-property-inspector');
    let piPanel = await page.sidebar.getContentPanel(
      await page.sidebar.getTabPosition('jp-property-inspector')
    );
    const tags = await piPanel.$$('.lm-Widget.tag');
    expect(tags.length).toBe(3); // including Add Tag
    await tags[0].click();

    await page.notebook.activate(fileName);
    await page.notebook.selectCells(9);

    await page.sidebar.openTab('jp-property-inspector');
    await tags[1].click();

    await page.notebook.activate(fileName);
    await page.notebook.selectCells(11);

    await page.sidebar.openTab('jp-property-inspector');
    await tags[0].click();
    await tags[1].click();

    await page.notebook.activate(fileName);
    await page.notebook.save();
  });

  test('Open Table of Contents panel', async ({ page }) => {
    const imageName = 'toc-panel.png';
    await page.notebook.selectCells(0);

    await page.sidebar.openTab('table-of-contents');
    const tocPanel = await page.sidebar.getContentPanel(
      await page.sidebar.getTabPosition('table-of-contents')
    );

    expect(await tocPanel.screenshot()).toMatchSnapshot(imageName);
  });

  test('Toggle code', async ({ page }) => {
    await page.notebook.selectCells(0);
    await page.sidebar.openTab('table-of-contents');

    const tocPanel = await page.sidebar.getContentPanel(
      await page.sidebar.getTabPosition('table-of-contents')
    );
    const toolbarButtons = await tocPanel.$$('.toc-toolbar .toc-toolbar-icon');
    expect(toolbarButtons.length).toBe(4);

    const imageName = 'toggle-code.png';
    await toolbarButtons[0].click();

    expect(await tocPanel.screenshot()).toMatchSnapshot(imageName);
    await toolbarButtons[0].click();
  });

  test('Toggle markdown', async ({ page }) => {
    await page.notebook.selectCells(0);
    await page.sidebar.openTab('table-of-contents');

    const tocPanel = await page.sidebar.getContentPanel(
      await page.sidebar.getTabPosition('table-of-contents')
    );
    const toolbarButtons = await tocPanel.$$('.toc-toolbar .toc-toolbar-icon');
    expect(toolbarButtons.length).toBe(4);

    const imageName = 'toggle-markdown.png';
    await toolbarButtons[1].click();

    expect(await tocPanel.screenshot()).toMatchSnapshot(imageName);
    await toolbarButtons[1].click();
  });

  test('Toggle list', async ({ page }) => {
    await page.notebook.selectCells(0);
    await page.sidebar.openTab('table-of-contents');

    const tocPanel = await page.sidebar.getContentPanel(
      await page.sidebar.getTabPosition('table-of-contents')
    );
    const toolbarButtons = await tocPanel.$$('.toc-toolbar .toc-toolbar-icon');
    expect(toolbarButtons.length).toBe(4);

    const imageName = 'toggle-numbered-list.png';
    await toolbarButtons[2].click();

    expect(await tocPanel.screenshot()).toMatchSnapshot(imageName);
    await toolbarButtons[2].click();
  });

  test('Toggle show tags', async ({ page }) => {
    await page.notebook.selectCells(0);
    await page.sidebar.openTab('table-of-contents');

    const tocPanel = await page.sidebar.getContentPanel(
      await page.sidebar.getTabPosition('table-of-contents')
    );
    const toolbarButtons = await tocPanel.$$('.toc-toolbar .toc-toolbar-icon');
    expect(toolbarButtons.length).toBe(4);

    // toggle code and markdown
    await toolbarButtons[0].click();
    await toolbarButtons[1].click();

    const imageName = 'show-tags.png';
    await toolbarButtons[3].click();

    expect(await tocPanel.screenshot()).toMatchSnapshot(imageName);
  });

  test('Toggle tag 1', async ({ page }) => {
    await page.notebook.selectCells(0);
    await page.sidebar.openTab('table-of-contents');

    const tocPanel = await page.sidebar.getContentPanel(
      await page.sidebar.getTabPosition('table-of-contents')
    );
    const toolbarButtons = await tocPanel.$$('.toc-toolbar .toc-toolbar-icon');
    // toggle code and markdown
    await toolbarButtons[0].click();
    await toolbarButtons[1].click();
    await toolbarButtons[3].click();

    const tags = await tocPanel.$$('.toc-tag');
    expect(tags.length).toBe(2);

    const imageName = 'toggle-tag-1.png';
    await tags[0].click();

    expect(await tocPanel.screenshot()).toMatchSnapshot(imageName);
    await tags[0].click();
  });

  test('Toggle tag 2', async ({ page }) => {
    await page.notebook.selectCells(0);
    await page.sidebar.openTab('table-of-contents');

    const tocPanel = await page.sidebar.getContentPanel(
      await page.sidebar.getTabPosition('table-of-contents')
    );
    const toolbarButtons = await tocPanel.$$('.toc-toolbar .toc-toolbar-icon');
    // toggle code and markdown
    await toolbarButtons[0].click();
    await toolbarButtons[1].click();
    await toolbarButtons[3].click();

    const tags = await tocPanel.$$('.toc-tag');

    const imageName = 'toggle-tag-2.png';
    await tags[1].click();

    expect(await tocPanel.screenshot()).toMatchSnapshot(imageName);
    await tags[1].click();
  });

  test('Open context menu', async ({ page }) => {
    await page.notebook.selectCells(0);
    await page.sidebar.openTab('table-of-contents');

    const tocPanel = await page.sidebar.getContentPanel(
      await page.sidebar.getTabPosition('table-of-contents')
    );

    await (await tocPanel.$('li > .toc-level-size-1')).click({
      button: 'right'
    });

    const menu = await page.menu.getOpenMenu();
    expect(await menu.screenshot()).toMatchSnapshot(
      'notebook-context-menu.png'
    );
  });
});
