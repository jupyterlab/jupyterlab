// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect, galata, test } from '@jupyterlab/galata';
import { filterContent } from './utils';

test.use({
  autoGoto: false,
  mockState: galata.DEFAULT_DOCUMENTATION_STATE,
  viewport: { height: 720, width: 1280 }
});

test.describe('Media Files', () => {
  test('should open and display audio file', async ({ page }) => {
    await galata.Mock.freezeContentLastModified(page, filterContent);
    await page.goto();
    await page.addStyleTag({
      content: `.jp-LabShell.jp-mod-devMode {
        border-top: none;
      }`
    });

    await page.filebrowser.open('data/rocket.wav');

    await page.locator('.jp-AudioViewer').waitFor();

    const audioElement = page.locator('.jp-AudioViewer audio');
    await expect(audioElement).toBeVisible();
    await expect(audioElement).toHaveAttribute('controls');
    await expect(audioElement).toHaveAttribute('src', /rocket\.wav/);
  });

  test('should open and display video file', async ({ page }) => {
    await galata.Mock.freezeContentLastModified(page, filterContent);
    await page.goto();
    await page.addStyleTag({
      content: `.jp-LabShell.jp-mod-devMode {
        border-top: none;
      }`
    });

    await page.filebrowser.open('data/jupiter.mp4');

    await page.locator('.jp-VideoViewer').waitFor();

    const videoElement = page.locator('.jp-VideoViewer video');
    await expect(videoElement).toBeVisible();
    await expect(videoElement).toHaveAttribute('controls');
    await expect(videoElement).toHaveAttribute('src', /jupiter\.mp4/);
  });
});
