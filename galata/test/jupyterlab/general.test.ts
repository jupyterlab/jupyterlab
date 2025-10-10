// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect, test } from '@jupyterlab/galata';

test.describe('General Tests', () => {
  test('Launch Screen', async ({ page }) => {
    const imageName = 'launch.png';
    expect(await page.screenshot()).toMatchSnapshot(imageName.toLowerCase());
  });

  test('Enter Simple Mode', async ({ page }) => {
    await page.setSimpleMode(true);
    expect(await page.isInSimpleMode()).toEqual(true);

    const imageName = 'simple-mode.png';
    expect(await page.screenshot()).toMatchSnapshot(imageName);
  });

  test('Leave Simple Mode', async ({ page }) => {
    await page.goto(page.url().replace('/lab', '/doc'));

    await page.setSimpleMode(false);
    expect(await page.isInSimpleMode()).toEqual(false);
  });

  test('Toggle Dark theme', async ({ page }) => {
    await page.theme.setDarkTheme();
    const imageName = 'dark-theme.png';
    expect(await page.screenshot()).toMatchSnapshot(imageName.toLowerCase());
  });

  test('Toggle Light theme', async ({ page }) => {
    await page.theme.setDarkTheme();

    await page.theme.setLightTheme();

    expect(await page.theme.getTheme()).toEqual('JupyterLab Light');
  });

  test('Toggle Dark High Contrast theme', async ({ page }) => {
    await page.theme.setDarkHighContrastTheme();
    expect(await page.theme.getTheme()).toEqual(
      'JupyterLab Dark High Contrast'
    );
  });

  test('Toggle adaptive theme', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.menu.clickMenuItem(
      'Settings>Theme>Synchronize with System Settings'
    );
    await page.reload();
    expect(await page.theme.getTheme()).toEqual('JupyterLab Dark');
  });

  test('Browser tab name updates to file name in /doc mode', async ({
    page
  }) => {
    // Switch to single-document mode
    const currentUrl = page.url();
    const docUrl = currentUrl.replace('/lab/', '/doc/');
    await page.goto(docUrl);

    // Create a new text file and wait for it to load
    await page.menu.clickMenuItem('File>New>Text File');
    await page.locator('.cm-editor:not(.jp-mod-readOnly)').first().waitFor();

    // Verify the browser's tab name matches the new file name
    const title = await page.title();
    expect(title).toBe('untitled.txt - JupyterLab');
  });

  test('Drag file from nested directory to parent via breadcrumb', async ({
    page
  }) => {
    // Create nested directories: dir1/dir2
    await page
      .locator('jp-button[data-command="filebrowser:create-new-directory"]')
      .click();
    await page
      .locator('input.jp-DirListing-editor')
      .waitFor({ state: 'visible', timeout: 1000 });
    await page.keyboard.type('dir1');
    await page.keyboard.press('Enter');
    await page
      .locator('.jp-DirListing-itemText:has-text("dir1")')
      .waitFor({ state: 'visible', timeout: 1000 });
    await page.keyboard.press('Enter');
    await page
      .locator('.jp-BreadCrumbs-item', { hasText: 'dir1' })
      .waitFor({ state: 'visible', timeout: 1000 });
    await page
      .locator('jp-button[data-command="filebrowser:create-new-directory"]')
      .click();
    await page
      .locator('input.jp-DirListing-editor')
      .waitFor({ state: 'visible', timeout: 1000 });
    await page.keyboard.type('dir2');
    await page.keyboard.press('Enter');
    await page
      .locator('.jp-DirListing-itemText:has-text("dir2")')
      .waitFor({ state: 'visible', timeout: 1000 });
    // Wait for the breadcrumb item 'dir' to be visible
    await page.keyboard.press('Enter');
    await page
      .locator('.jp-BreadCrumbs-item', { hasText: 'dir2' })
      .waitFor({ state: 'visible', timeout: 1000 });

    // Create a file in dir1/dir2
    const fileName = 'testfile';
    await page.menu.clickMenuItem('File>New>Text File');
    await page.locator('.jp-DirListing-item:has-text("untitled.txt")').click();
    await page.keyboard.press('F2');
    await page.keyboard.type(fileName);
    await page.keyboard.press('Enter');
    await page
      .locator('.jp-DirListing-item:has-text("testfile.txt")')
      .waitFor({ state: 'visible', timeout: 1000 });

    // Ensure the file exists in dir1/dir2
    expect(await page.filebrowser.isFileListedInBrowser(fileName)).toBeTruthy();

    // Drag the file to dir1 breadcrumb and drop it there
    const fileItem = page.locator(
      '.jp-DirListing-item:has-text("testfile.txt")'
    );
    const dir1Breadcrumb = page.locator('.jp-BreadCrumbs-item', {
      hasText: 'dir1'
    });
    await fileItem.dragTo(dir1Breadcrumb);

    await page
      .locator('.jp-DirListing-item:has-text("testfile.txt")')
      .waitFor({ state: 'hidden', timeout: 1000 });
    expect(await page.filebrowser.isFileListedInBrowser(fileName)).toBeFalsy();
    // Navigate back to dir1 by clicking the breadcrumb
    await dir1Breadcrumb.click();
    await page
      .locator('.jp-BreadCrumbs-item', { hasText: 'dir2' })
      .waitFor({ state: 'hidden', timeout: 1000 });

    // Verify the file is now in dir1
    expect(await page.filebrowser.isFileListedInBrowser(fileName)).toBeTruthy();
  });
});
