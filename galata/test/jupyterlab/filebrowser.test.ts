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
