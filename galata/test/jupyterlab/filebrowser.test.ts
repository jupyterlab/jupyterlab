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
  await page.filebrowser.openDirectory(`${tmpPath}/dir1/dir2`);
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

  await page.filebrowser.openDirectory(tmpPath);

  const item1 = page.locator(`.jp-DirListing-item:has-text("${file1}")`);
  const item2 = page.locator(`.jp-DirListing-item:has-text("${file2}")`);
  const item3 = page.locator(`.jp-DirListing-item:has-text("${file3}")`);

  // Wait for items to be visible
  await item1.waitFor();
  await item2.waitFor();
  await item3.waitFor();

  // Multi-select using Shift+Click
  await item1.click();
  await item2.click({ modifiers: ['Control'] });
  await item3.click({ modifiers: ['Control'] });

  // Right click to open context menu
  await item1.click({ button: 'right' });

  // Trigger Rename
  const bulkRename = page.locator(
    '.jp-Menu-item[data-command="filebrowser:bulk-rename"]'
  );
  await expect(bulkRename).toBeVisible();
  await bulkRename.click();

  // Wait for the bulk rename dialog
  const dialog = page.getByRole('dialog', { name: 'Bulk Rename' });
  await expect(dialog).toBeVisible({ timeout: 10000 });
  expect(await dialog.locator('.jp-Dialog-header').textContent()).toBe(
    'Bulk Rename'
  );

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

  expect(inputFontSize).toEqual(normalFontSize);
});
