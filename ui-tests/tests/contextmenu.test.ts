// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { describe, galata, test } from '@jupyterlab/galata';

import * as path from 'path';

const filebrowserId = 'filebrowser';
const testFileName = 'simple.md';
const testNotebook = 'simple_notebook.ipynb';
const testFolderName = 'test-folder';

jest.setTimeout(60000);

describe('Application Context Menu', () => {
  beforeAll(async () => {
    // Create some dummy content
    await galata.contents.moveFileToServer(
      path.resolve(__dirname, `./notebooks/${testNotebook}`)
    );
    await galata.contents.moveFileToServer(
      path.resolve(__dirname, `./notebooks/${testFileName}`)
    );
    // Create a dummy folder
    await galata.contents.createDirectory(testFolderName);

    galata.context.capturePrefix = 'contextmenu';
    await galata.resetUI();
  });

  afterEach(async () => {
    // Close menu
    await galata.context.page.keyboard.press('Escape');
  });

  afterAll(async () => {
    galata.context.capturePrefix = '';
    if (await galata.contents.fileExists(testNotebook)) {
      await galata.contents.deleteFile(testNotebook);
    }
    if (await galata.contents.fileExists(testFileName)) {
      await galata.contents.deleteFile(testFileName);
    }
    if (await galata.contents.directoryExists(testFolderName)) {
      await galata.contents.deleteDirectory(testFolderName);
    }
  });

  test('Open file browser context menu on folder', async () => {
    await galata.sidebar.openTab(filebrowserId);
    expect(await galata.sidebar.isTabOpen(filebrowserId)).toBeTruthy();
    await galata.filebrowser.refresh();

    await galata.context.page.click(
      `.jp-DirListing-item span:has-text("${testFolderName}")`,
      {
        button: 'right'
      }
    );
    // Context menu should be available
    expect(await galata.menu.isAnyOpen()).toBe(true);

    const imageName = `folder`;
    const menu = await galata.menu.getOpenMenu();
    await galata.capture.screenshot(imageName, menu);
    expect(await galata.capture.compareScreenshot(imageName)).toBe('same');
  });

  test('Open file browser context menu on file', async () => {
    await galata.sidebar.openTab(filebrowserId);
    expect(await galata.sidebar.isTabOpen(filebrowserId)).toBeTruthy();

    await galata.context.page.click(
      `.jp-DirListing-item span:has-text("${testFileName}")`,
      {
        button: 'right'
      }
    );
    // Context menu should be available
    expect(await galata.menu.isAnyOpen()).toBe(true);

    const imageName = `file`;
    const menu = await galata.menu.getOpenMenu();
    await galata.capture.screenshot(imageName, menu);
    expect(await galata.capture.compareScreenshot(imageName)).toBe('same');
  });

  test('Open file browser context submenu open with', async () => {
    await galata.sidebar.openTab(filebrowserId);
    expect(await galata.sidebar.isTabOpen(filebrowserId)).toBeTruthy();

    await galata.context.page.click(
      `.jp-DirListing-item span:has-text("${testFileName}")`,
      {
        button: 'right'
      }
    );
    // Context menu should be available
    expect(await galata.menu.isAnyOpen()).toBe(true);

    await galata.context.page.hover('text=Open With');
    await galata.context.page.waitForSelector(
      'li[role="menuitem"]:has-text("Editor")'
    );

    const imageName = `file-openwith`;
    // Get the last menu -> will be submenu
    const menu = await galata.menu.getOpenMenu();
    await galata.capture.screenshot(imageName, menu);
    expect(await galata.capture.compareScreenshot(imageName)).toBe('same');
  });

  test('Open tab context menu', async () => {
    await galata.context.page.click('div[role="main"] >> text=Launcher', {
      button: 'right'
    });
    // Context menu should be available
    expect(await galata.menu.isAnyOpen()).toBe(true);

    const imageName = `tab-launcher`;
    const menu = await galata.menu.getOpenMenu();
    await galata.capture.screenshot(imageName, menu);
    expect(await galata.capture.compareScreenshot(imageName)).toBe('same');
  });

  describe('Notebook context menus', () => {
    beforeAll(async () => {
      await galata.notebook.openByPath(testNotebook);
    });

    afterEach(async () => {
      await galata.context.page.keyboard.press('Escape');
    });

    test('Open notebook tab context menu', async () => {
      await galata.context.page.click(
        'div[role="main"] >> text=simple_notebook.ipynb',
        {
          button: 'right'
        }
      );
      // Context menu should be available
      expect(await galata.menu.isAnyOpen()).toBe(true);

      const imageName = `tab-notebook`;
      const menu = await galata.menu.getOpenMenu();
      await galata.capture.screenshot(imageName, menu);
      expect(await galata.capture.compareScreenshot(imageName)).toBe('same');
    });

    test('Open context on markdown cell', async () => {
      await galata.context.page.click('text=Test Notebook¶', {
        button: 'right'
      });
      expect(await galata.menu.isAnyOpen()).toBe(true);

      const imageName = `notebook-md`;
      const menu = await galata.menu.getOpenMenu();
      await galata.capture.screenshot(imageName, menu);
      expect(await galata.capture.compareScreenshot(imageName)).toBe('same');
    });

    test('Open context on code cell', async () => {
      await galata.context.page.click(
        'text=from IPython.display import Image',
        { button: 'right' }
      );
      expect(await galata.menu.isAnyOpen()).toBe(true);

      const imageName = `notebook-code`;
      const menu = await galata.menu.getOpenMenu();
      await galata.capture.screenshot(imageName, menu);
      expect(await galata.capture.compareScreenshot(imageName)).toBe('same');
    });
  });

  test('Open file editor context menu', async () => {
    await galata.sidebar.openTab(filebrowserId);
    expect(await galata.sidebar.isTabOpen(filebrowserId)).toBeTruthy();

    await galata.context.page.dblclick(`span:has-text("${testFileName}")`);

    await galata.context.page.click('text=# Title', {
      button: 'right'
    });
    expect(await galata.menu.isAnyOpen()).toBe(true);

    const imageName = `fileeditor`;
    const menu = await galata.menu.getOpenMenu();
    await galata.capture.screenshot(imageName, menu);
    expect(await galata.capture.compareScreenshot(imageName)).toBe('same');
  });
});
