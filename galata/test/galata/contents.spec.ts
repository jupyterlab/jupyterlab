// Copyright (c) Jupyter Development Team.
// Copyright (c) Bloomberg Finance LP.
// Distributed under the terms of the Modified BSD License.

import * as path from 'path';

import { expect, test } from '@jupyterlab/galata';

test.describe('Contents API Tests', () => {
  test('Upload directory to server', async ({ page, tmpPath }) => {
    await page.contents.uploadDirectory(
      path.resolve(__dirname, './upload'),
      tmpPath
    );

    // Upload removed existing tmpPath, so we need to get inside
    await page.dblclick(`text=${tmpPath}`);

    expect(await page.waitForSelector('text=sub_folder')).toBeTruthy();
    expect(await page.waitForSelector('text=upload_image.png')).toBeTruthy();
    expect(
      await page.waitForSelector('text=upload_notebook.ipynb')
    ).toBeTruthy();
  });

  test('File operations', async ({ page, tmpPath }) => {
    await page.contents.uploadFile(
      path.resolve(__dirname, './upload/upload_image.png'),
      `${tmpPath}/upload_image.png`
    );
    await page.contents.renameFile(
      `${tmpPath}/upload_image.png`,
      `${tmpPath}/renamed_image.png`
    );
    expect(
      await page.contents.fileExists(`${tmpPath}/renamed_image.png`)
    ).toEqual(true);

    await page.filebrowser.openDirectory(tmpPath);
    expect(await page.filebrowser.getCurrentDirectory()).toEqual(tmpPath);
    expect(
      await page.contents.deleteFile(`${tmpPath}/renamed_image.png`)
    ).toEqual(true);
  });

  test('Go to home directory', async ({ page }) => {
    expect(await page.filebrowser.openHomeDirectory()).toEqual(true);
  });

  test('File Explorer visibility', async ({ page, tmpPath }) => {
    await page.contents.uploadDirectory(
      path.resolve(__dirname, './upload'),
      tmpPath
    );

    await page.contents.deleteFile(`${tmpPath}/upload_image.png`);

    expect(
      await page.filebrowser.isFileListedInBrowser('upload_image.png')
    ).toEqual(false);
    await page.filebrowser.revealFileInBrowser(
      `${tmpPath}/sub_folder/upload_image.png`
    );
    expect(
      await page.filebrowser.isFileListedInBrowser('upload_image.png')
    ).toEqual(true);
  });

  test('Delete uploads', async ({ page, tmpPath }) => {
    await page.contents.uploadFile(
      path.resolve(__dirname, './upload/upload_notebook.ipynb'),
      `${tmpPath}/sub_dir/notebook.ipynb`
    );

    expect(
      await page.contents.deleteFile(`${tmpPath}/sub_dir/notebook.ipynb`)
    ).toEqual(true);
    expect(await page.contents.deleteDirectory(`${tmpPath}/sub_dir`)).toEqual(
      true
    );
  });
});
