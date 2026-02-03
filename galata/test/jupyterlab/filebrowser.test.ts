// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect, test } from '@jupyterlab/galata';
import { changeCodeFontSize, getFileListFontSize } from './utils';

test('Drag file from nested directory to parent via breadcrumb', async ({
  page,
  tmpPath
}) => {
  await page.contents.createDirectory(`${tmpPath}/dir1`);
  await page.contents.createDirectory(`${tmpPath}/dir1/dir2`);
  await page.filebrowser.refresh();
  // Open dir1
  await page.locator('.jp-DirListing-item:has-text("dir1")').dblclick();

  await page.locator('.jp-BreadCrumbs-item', { hasText: 'dir1' }).waitFor();

  // Open dir2
  await page.locator('.jp-DirListing-item:has-text("dir2")').dblclick();

  await page.locator('.jp-BreadCrumbs-item', { hasText: 'dir2' }).waitFor();

  const dir1Breadcrumb = page.locator('.jp-BreadCrumbs-item', {
    hasText: 'dir1'
  });
  const dir2Breadcrumb = page.locator('.jp-BreadCrumbs-item', {
    hasText: 'dir2'
  });

  const fileName = 'testfile.txt';
  await page.menu.clickMenuItem('File>New>Text File');
  await page
    .locator('.jp-DirListing-item:has-text("untitled.txt")')
    .waitFor({ state: 'visible' });
  await page.contents.renameFile(
    `${tmpPath}/dir1/dir2/untitled.txt`,
    `${tmpPath}/dir1/dir2/${fileName}`
  );
  const fileItem = page.locator(`.jp-DirListing-item:has-text("${fileName}")`);
  await fileItem.waitFor({ state: 'visible' });

  await fileItem.dragTo(dir1Breadcrumb);

  await fileItem.waitFor({ state: 'hidden' });
  expect(await page.filebrowser.isFileListedInBrowser(fileName)).toBeFalsy();
  // Navigate back to dir1 by clicking the breadcrumb
  await dir1Breadcrumb.click();
  await dir2Breadcrumb.waitFor({ state: 'hidden' });

  // Verify the file is now in dir1
  await fileItem.waitFor({ state: 'visible' });
  expect(await page.filebrowser.isFileListedInBrowser(fileName)).toBeTruthy();
});

test('Bulk rename files', async ({ page, tmpPath }) => {
  const file1 = 'test1.txt';
  const file2 = 'test2.py';
  const file3 = 'test3.md';
  const newBaseName = 'renamed';

  // Create test files
  await page.contents.uploadContent('test1', 'text', `${tmpPath}/${file1}`);
  await page.contents.uploadContent('test2', 'text', `${tmpPath}/${file2}`);
  await page.contents.uploadContent('test3', 'text', `${tmpPath}/${file3}`);

  // Wait for items to be visible
  const items = page.locator('.jp-DirListing-item');
  await items.nth(0).waitFor();
  await items.nth(1).waitFor();
  await items.nth(2).waitFor();

  // Force multi-selection using Shift-selection (most stable across OS)
  await items.nth(0).click();
  await page.keyboard.down('Shift');
  await items.nth(2).click();
  await page.keyboard.up('Shift');

  // Wait for selection state to update - verify items are selected
  await page.waitForFunction(() => {
    const selected = document.querySelectorAll(
      '.jp-DirListing-item.jp-mod-selected'
    );

    return selected.length >= 3;
  });

  // Open context menu
  await items.nth(0).click({ button: 'right' });

  // Wait for context menu to appear
  await page.waitForFunction(
    () => {
      return document.querySelector('.lm-Menu') !== null;
    },
    { timeout: 5000 }
  );

  // Verify menu is open and get the menu locator
  expect(await page.menu.isAnyOpen()).toBe(true);
  const menu = await page.menu.getOpenMenuLocator();
  expect(menu).not.toBeNull();

  // Click Bulk Rename (explicit command)
  const bulkRename = menu!.locator('[data-command="filebrowser:bulk-rename"]');
  await expect(bulkRename).toBeVisible();
  await bulkRename.click();

  // Assert dialog
  const dialog = page.locator('.jp-Dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('.jp-Dialog-header')).toHaveText('Bulk Rename');

  // Fill in the new base name
  await dialog.locator('input').fill(newBaseName);

  // Accept the dialog
  await dialog.locator('.jp-Dialog-button.jp-mod-accept').click();

  // Wait for the dialog to disappear
  await dialog.waitFor({ state: 'hidden' });

  // Verify renamed files
  await page
    .locator(`.jp-DirListing-item:has-text("${newBaseName}.txt")`)
    .waitFor();
  await page
    .locator(`.jp-DirListing-item:has-text("${newBaseName}.py")`)
    .waitFor();
  await page
    .locator(`.jp-DirListing-item:has-text("${newBaseName}.md")`)
    .waitFor();

  expect(
    await page.filebrowser.isFileListedInBrowser(`${newBaseName}.txt`)
  ).toBeTruthy();
  expect(
    await page.filebrowser.isFileListedInBrowser(`${newBaseName}.py`)
  ).toBeTruthy();
  expect(
    await page.filebrowser.isFileListedInBrowser(`${newBaseName}.md`)
  ).toBeTruthy();
  await page.unrouteAll({ behavior: 'ignoreErrors' });
});

test('File rename input respects UI font size', async ({ page }) => {
  await page.menu.clickMenuItem('File>New>Text File');
  await page
    .locator('.jp-DirListing-item:has-text("untitled.txt")')
    .waitFor({ state: 'visible' });

  await changeCodeFontSize(page, 'Increase UI Font Size');
  await changeCodeFontSize(page, 'Increase UI Font Size');
  await changeCodeFontSize(page, 'Increase UI Font Size');

  // Get the filename's font size when we are not renaming
  const normalFontSize = await getFileListFontSize(page);

  // Trigger rename
  await page
    .locator('.jp-DirListing-itemName:has-text("untitled.txt")')
    .click();
  await page.keyboard.press('F2');

  const renameInput = page.locator('.jp-DirListing-editor');
  await renameInput.waitFor({ state: 'visible' });

  const inputFontSize = await renameInput.evaluate(el =>
    parseInt(getComputedStyle(el).fontSize)
  );

  expect(Math.abs(inputFontSize - normalFontSize)).toBeLessThanOrEqual(1);
});
