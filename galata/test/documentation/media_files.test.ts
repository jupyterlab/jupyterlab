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

    await page.dblclick('[aria-label="File Browser Section"] >> text=data');

    await page.locator('text=rocket.wav').waitFor();
    await page.dblclick('text=rocket.wav');

    await page.locator('.jp-AudioViewer').waitFor();

    const audioElement = page.locator('.jp-AudioViewer audio');
    await expect(audioElement).toBeVisible();
    await expect(audioElement).toHaveAttribute('controls');

    const src = await audioElement.getAttribute('src');
    expect(src).toContain('rocket.wav');
  });

  test('should open and display video file', async ({ page }) => {
    await galata.Mock.freezeContentLastModified(page, filterContent);
    await page.goto();
    await page.addStyleTag({
      content: `.jp-LabShell.jp-mod-devMode {
        border-top: none;
      }`
    });

    await page.dblclick('[aria-label="File Browser Section"] >> text=data');

    await page.locator('text=jupiter.mp4').waitFor();
    await page.dblclick('text=jupiter.mp4');

    await page.locator('.jp-VideoViewer').waitFor();

    const videoElement = page.locator('.jp-VideoViewer video');
    await expect(videoElement).toBeVisible();
    await expect(videoElement).toHaveAttribute('controls');

    const src = await videoElement.getAttribute('src');
    expect(src).toContain('jupiter.mp4');
  });
});
