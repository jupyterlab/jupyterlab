// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { describe, galata, test } from '@jupyterlab/galata';
import * as path from 'path';

jest.setTimeout(60000);

const fileName = 'toc_notebook.ipynb';

describe('Table of Contents', () => {
  beforeAll(async () => {
    await galata.resetUI();
    galata.context.capturePrefix = 'toc';
  });

  afterAll(async () => {
    galata.context.capturePrefix = '';
  });

  test('Upload files to JupyterLab', async () => {
    await galata.contents.moveFileToServer(
      path.resolve(__dirname, `./notebooks/${fileName}`),
      `uploaded/${fileName}`
    );
    await galata.contents.moveFileToServer(
      path.resolve(__dirname, './notebooks/WidgetArch.png'),
      'uploaded/WidgetArch.png'
    );
    expect(
      await galata.contents.fileExists(`uploaded/${fileName}`)
    ).toBeTruthy();
    expect(
      await galata.contents.fileExists('uploaded/WidgetArch.png')
    ).toBeTruthy();
  });

  test('Refresh File Browser', async () => {
    await expect(galata.filebrowser.refresh()).resolves.toBeUndefined();
  });

  test('Open directory uploaded', async () => {
    await galata.filebrowser.openDirectory('uploaded');
    expect(
      await galata.filebrowser.isFileListedInBrowser(fileName)
    ).toBeTruthy();
  });

  test('Open Notebook', async () => {
    await galata.notebook.open(fileName);
    expect(await galata.notebook.isOpen(fileName)).toBeTruthy();
    await galata.notebook.activate(fileName);
    expect(await galata.notebook.isActive(fileName)).toBeTruthy();
  });

  test('Add tags', async () => {
    await galata.sidebar.openTab('jp-property-inspector');
    const imageName = 'add-tags';
    const tagInputSelector = 'div.tag-holder input.add-tag';
    let piPanel = await galata.sidebar.getContentPanel('left');
    let addTagInput = await piPanel.$(tagInputSelector);
    await addTagInput.click();
    await galata.context.page.keyboard.insertText('tag1');
    await galata.context.page.keyboard.press('Enter');
    addTagInput = await piPanel.$(tagInputSelector);
    await addTagInput.click();
    await galata.context.page.keyboard.insertText('tag2');
    await galata.context.page.keyboard.press('Enter');
    const cellTagsPanel = await piPanel.$('.jp-NotebookTools-tool.jp-TagTool');
    await galata.capture.screenshot(imageName, cellTagsPanel);
    expect(await galata.capture.compareScreenshot(imageName)).toBe('same');
  });

  test('Assign tags to cells', async () => {
    await galata.notebook.activate(fileName);
    await galata.notebook.selectCells(6);

    await galata.sidebar.openTab('jp-property-inspector');
    const piPanel = await galata.sidebar.getContentPanel('left');
    const tags = await piPanel.$$('.lm-Widget.tag');
    expect(tags.length).toBe(3); // including Add Tag
    await tags[0].click();

    await galata.notebook.activate(fileName);
    await galata.notebook.selectCells(9);

    await galata.sidebar.openTab('jp-property-inspector');
    await tags[1].click();

    await galata.notebook.activate(fileName);
    await galata.notebook.selectCells(11);

    await galata.sidebar.openTab('jp-property-inspector');
    await tags[0].click();
    await tags[1].click();
  });

  test('Open Table of Contents panel', async () => {
    const imageName = 'toc-panel';
    await galata.notebook.activate(fileName);
    await galata.notebook.selectCells(0);

    await galata.sidebar.openTab('table-of-contents');
    const tocPanel = await galata.sidebar.getContentPanel('left');
    await galata.capture.screenshot(imageName, tocPanel);
    expect(await galata.capture.compareScreenshot(imageName)).toBe('same');
  });

  test('Toggle code', async () => {
    const tocPanel = await galata.sidebar.getContentPanel('left');
    const toolbarButtons = await tocPanel.$$('.toc-toolbar .toc-toolbar-icon');
    expect(toolbarButtons.length).toBe(4);

    const imageName = 'toggle-code';
    await toolbarButtons[0].click();
    await galata.capture.screenshot(imageName, tocPanel);
    expect(await galata.capture.compareScreenshot(imageName)).toBe('same');
    await toolbarButtons[0].click();
  });

  test('Toggle markdown', async () => {
    const tocPanel = await galata.sidebar.getContentPanel('left');
    const toolbarButtons = await tocPanel.$$('.toc-toolbar .toc-toolbar-icon');
    expect(toolbarButtons.length).toBe(4);

    const imageName = 'toggle-markdown';
    await toolbarButtons[1].click();
    await galata.capture.screenshot(imageName, tocPanel);
    expect(await galata.capture.compareScreenshot(imageName)).toBe('same');
    await toolbarButtons[1].click();
  });

  test('Toggle list', async () => {
    const tocPanel = await galata.sidebar.getContentPanel('left');
    const toolbarButtons = await tocPanel.$$('.toc-toolbar .toc-toolbar-icon');
    expect(toolbarButtons.length).toBe(4);

    const imageName = 'toggle-numbered-list';
    await toolbarButtons[2].click();
    await galata.capture.screenshot(imageName, tocPanel);
    expect(await galata.capture.compareScreenshot(imageName)).toBe('same');
    await toolbarButtons[2].click();
  });

  test('Toggle show tags', async () => {
    const tocPanel = await galata.sidebar.getContentPanel('left');
    const toolbarButtons = await tocPanel.$$('.toc-toolbar .toc-toolbar-icon');
    expect(toolbarButtons.length).toBe(4);

    // toggle code and markdown
    await toolbarButtons[0].click();
    await toolbarButtons[1].click();

    const imageName = 'show-tags';
    await toolbarButtons[3].click();
    await galata.capture.screenshot(imageName, tocPanel);
    expect(await galata.capture.compareScreenshot(imageName)).toBe('same');
  });

  test('Toggle tag 1', async () => {
    const tocPanel = await galata.sidebar.getContentPanel('left');

    const tags = await tocPanel.$$('.toc-tag');
    expect(tags.length).toBe(2);

    const imageName = 'toggle-tag-1';
    await tags[0].click();
    await galata.capture.screenshot(imageName, tocPanel);
    expect(await galata.capture.compareScreenshot(imageName)).toBe('same');
    await tags[0].click();
  });

  test('Toggle tag 2', async () => {
    const tocPanel = await galata.sidebar.getContentPanel('left');
    const tags = await tocPanel.$$('.toc-tag');

    const imageName = 'toggle-tag-2';
    await tags[1].click();
    await galata.capture.screenshot(imageName, tocPanel);
    expect(await galata.capture.compareScreenshot(imageName)).toBe('same');
    await tags[1].click();
  });

  test('Close Notebook', async () => {
    await expect(galata.notebook.activate(fileName)).resolves.toEqual(true);
    await expect(galata.notebook.close(true)).resolves.toEqual(true);
  });

  test('Open home directory', async () => {
    await galata.sidebar.openTab('filebrowser');
    await expect(galata.sidebar.isTabOpen('filebrowser')).resolves.toEqual(
      true
    );
    await expect(galata.filebrowser.openHomeDirectory()).resolves.toEqual(true);
  });

  test('Delete uploaded directory', async () => {
    await expect(galata.contents.deleteDirectory('uploaded')).resolves.toEqual(
      true
    );
  });
});
