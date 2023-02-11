// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect, galata, test } from '@jupyterlab/galata';

import * as path from 'path';

const filebrowserId = 'filebrowser';
const testFileName = 'simple.md';
const testNotebook = 'simple_notebook.ipynb';
const testFolderName = 'test-folder';

test.use({
  tmpPath: 'test-contextmenu'
});

test.describe('Application Context Menu', () => {
  test.beforeAll(async ({ request, tmpPath }) => {
    const contents = galata.newContentsHelper(request);

    // Create some dummy content
    await contents.uploadFile(
      path.resolve(__dirname, `./notebooks/${testNotebook}`),
      `${tmpPath}/${testNotebook}`
    );
    await contents.uploadFile(
      path.resolve(__dirname, `./notebooks/${testFileName}`),
      `${tmpPath}/${testFileName}`
    );
    // Create a dummy folder
    await contents.createDirectory(`${tmpPath}/${testFolderName}`);
  });

  test.beforeEach(async ({ page, tmpPath }) => {
    await page.filebrowser.openDirectory(tmpPath);
  });

  test.afterEach(async ({ page }) => {
    // Close menu
    await page.keyboard.press('Escape');

    await page.filebrowser.openHomeDirectory();
  });

  test.afterAll(async ({ request, tmpPath }) => {
    const contents = galata.newContentsHelper(request);
    await contents.deleteDirectory(tmpPath);
  });

  test('Open file browser context menu on folder', async ({ page }) => {
    await page.sidebar.openTab(filebrowserId);
    expect(await page.sidebar.isTabOpen(filebrowserId)).toBeTruthy();
    await page.filebrowser.refresh();

    await page.click(`.jp-DirListing-item span:has-text("${testFolderName}")`, {
      button: 'right'
    });
    // Context menu should be available
    expect(await page.menu.isAnyOpen()).toBe(true);

    const imageName = 'folder.png';
    const menu = await page.menu.getOpenMenu();
    expect(await menu.screenshot()).toMatchSnapshot(imageName);
  });

  test('Open file browser context menu on file', async ({ page }) => {
    await page.sidebar.openTab(filebrowserId);
    expect(await page.sidebar.isTabOpen(filebrowserId)).toBeTruthy();

    await page.click(`.jp-DirListing-item span:has-text("${testFileName}")`, {
      button: 'right'
    });
    // Context menu should be available
    expect(await page.menu.isAnyOpen()).toBe(true);

    const imageName = 'file.png';
    const menu = await page.menu.getOpenMenu();
    expect(await menu.screenshot()).toMatchSnapshot(imageName);
  });

  test('Open file browser context menu on notebook with kernel', async ({
    page,
    tmpPath
  }) => {
    await page.notebook.openByPath(`${tmpPath}/${testNotebook}`);
    // Wait for kernel to be idle
    expect(
      await page.waitForSelector(`#jp-main-statusbar >> text=Idle`)
    ).toBeTruthy();

    await page.click(`.jp-DirListing-item span:has-text("${testNotebook}")`, {
      button: 'right'
    });
    // Context menu should be available
    expect(await page.menu.isAnyOpen()).toBe(true);

    const imageName = 'running-notebook.png';
    const menu = await page.menu.getOpenMenu();
    expect(await menu.screenshot()).toMatchSnapshot(imageName);
  });

  test('Open file browser context submenu open with', async ({ page }) => {
    await page.sidebar.openTab(filebrowserId);
    expect(await page.sidebar.isTabOpen(filebrowserId)).toBeTruthy();

    await page.click(`.jp-DirListing-item span:has-text("${testFileName}")`, {
      button: 'right'
    });
    // Context menu should be available
    expect(await page.menu.isAnyOpen()).toBe(true);

    await page.hover('text=Open With');
    await page.waitForSelector(
      '.lm-Menu li[role="menuitem"]:has-text("Editor")'
    );

    const imageName = `file-openwith.png`;
    // Get the last menu -> will be submenu
    const menu = await page.menu.getOpenMenu();

    expect(await menu.screenshot()).toMatchSnapshot(imageName);
  });

  test('Open tab context menu', async ({ page }) => {
    await page.click('div[role="main"] >> text=Launcher', {
      button: 'right'
    });
    // Context menu should be available
    expect(await page.menu.isAnyOpen()).toBe(true);

    const imageName = `tab-launcher.png`;
    const menu = await page.menu.getOpenMenu();
    expect(await menu.screenshot()).toMatchSnapshot(imageName);
  });

  test.describe('Notebook context menus', () => {
    test.beforeEach(async ({ page, tmpPath }) => {
      await page.notebook.openByPath(`${tmpPath}/${testNotebook}`);
    });

    test.afterEach(async ({ page }) => {
      await page.keyboard.press('Escape');
    });

    test('Open notebook tab context menu', async ({ page }) => {
      await page.click('div[role="main"] >> text=simple_notebook.ipynb', {
        button: 'right'
      });
      // Context menu should be available
      expect(await page.menu.isAnyOpen()).toBe(true);

      const imageName = `tab-notebook.png`;
      const menu = await page.menu.getOpenMenu();
      expect(await menu.screenshot()).toMatchSnapshot(imageName);
    });

    test('Open context on markdown cell', async ({ page }) => {
      await page.click('text=Test Notebook¶', {
        button: 'right'
      });
      expect(await page.menu.isAnyOpen()).toBe(true);

      const imageName = `notebook-md.png`;
      const menu = await page.menu.getOpenMenu();
      expect(await menu.screenshot()).toMatchSnapshot(imageName);
    });

    test('Open context on code cell', async ({ page }) => {
      await page.click('text=from IPython.display import Image', {
        button: 'right'
      });
      expect(await page.menu.isAnyOpen()).toBe(true);

      const imageName = `notebook-code.png`;
      const menu = await page.menu.getOpenMenu();
      expect(await menu.screenshot()).toMatchSnapshot(imageName);
    });
  });

  test('Open file editor context menu', async ({ page }) => {
    await page.sidebar.openTab(filebrowserId);
    expect(await page.sidebar.isTabOpen(filebrowserId)).toBeTruthy();

    await page.dblclick(`span:has-text("${testFileName}")`);

    await page.click('text=# Title', {
      button: 'right'
    });
    expect(await page.menu.isAnyOpen()).toBe(true);

    const imageName = `fileeditor.png`;
    const menu = await page.menu.getOpenMenu();
    expect(await menu.screenshot()).toMatchSnapshot(imageName);
  });
});
