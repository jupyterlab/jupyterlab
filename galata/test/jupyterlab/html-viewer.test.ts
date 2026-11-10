/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { expect, galata, test } from '@jupyterlab/galata';
import type { Frame, Page } from '@playwright/test';
import * as path from 'path';

const fileName = 'test.html';
const secondFileName = 'test-2.html';

test.describe('HTML Viewer', () => {
  test.use({ tmpPath: 'test-html-viewer' });

  test.beforeAll(async ({ request, tmpPath }) => {
    const contents = galata.newContentsHelper(request);
    await contents.uploadFile(
      path.resolve(__dirname, `./notebooks/${fileName}`),
      `${tmpPath}/${fileName}`
    );
    await contents.uploadFile(
      path.resolve(__dirname, `./notebooks/${fileName}`),
      `${tmpPath}/${secondFileName}`
    );
  });

  test.beforeEach(async ({ page }) => {
    await page.getByRole('listitem', { name: fileName }).dblclick();
    await page.waitForSelector('iframe[src^="blob:"]', { timeout: 5000 });
  });

  test('should notify links are blocked for untrusted file', async ({
    page
  }) => {
    await page.waitForTimeout(100);
    const frame = await waitForFrame(page, {
      url: url => url.protocol == 'blob:'
    });
    await frame.getByRole('link', { name: 'GitHub' }).hover();

    const warningCount = await frame.evaluate(() => {
      let count = 0;
      for (const link of document.querySelectorAll('a')) {
        count +=
          window.getComputedStyle(link, '::after').content ==
          '"Action disabled as the file is not trusted."'
            ? 1
            : 0;
      }
      return count;
    });

    expect(warningCount).toEqual(1);
  });

  test('should allow links for trusted file', async ({ page }) => {
    const iframe = page.locator('.jp-HTMLViewer iframe').first();
    const untrustedUrl = await iframe.getAttribute('src');
    expect(untrustedUrl).toMatch(/^blob:/);
    await page.getByRole('button', { name: 'Trust HTML' }).click();
    // Changing the iframe sandbox must reload the document even if its source is unchanged.
    await expect.poll(() => iframe.getAttribute('src')).not.toBe(untrustedUrl);
    const frame = await waitForFrame(page, {
      url: url => url.protocol == 'blob:'
    });
    await frame.getByRole('link', { name: 'GitHub' }).hover();

    const warningCount = await frame.evaluate(() => {
      let count = 0;
      for (const link of document.querySelectorAll('a')) {
        count +=
          window.getComputedStyle(link, '::after').content ==
          '"Action disabled as the file is not trusted."'
            ? 1
            : 0;
      }
      return count;
    });

    expect(warningCount).toEqual(0);
  });

  test('should not reload when switching tabs', async ({ page }) => {
    const firstIframe = page.locator('.jp-HTMLViewer iframe').first();
    const initialUrl = await firstIframe.getAttribute('src');
    expect(initialUrl).toMatch(/^blob:/);
    const firstFrame = await waitForFrame(page, {
      url: url => url.protocol == 'blob:'
    });
    await firstFrame.locator('body').evaluate(body => {
      body.dataset.viewerState = 'preserved';
    });

    await page.getByRole('listitem', { name: secondFileName }).dblclick();

    const secondIframe = page.locator('.jp-HTMLViewer iframe').nth(1);
    await expect(secondIframe).toHaveAttribute('src', /^blob:/);

    await page.getByRole('tab', { name: fileName }).click();
    await expect(firstIframe).toBeVisible();

    // Wait for the next frame after the tab is visible, without a fixed delay.
    await firstIframe.evaluate(
      () =>
        new Promise<void>(resolve => {
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
        })
    );
    await expect(firstIframe).toHaveAttribute('src', initialUrl!);
    await expect(firstFrame.locator('body')).toHaveAttribute(
      'data-viewer-state',
      'preserved'
    );
  });

  test('should rerender when explicitly refreshed', async ({ page }) => {
    const iframe = page.locator('.jp-HTMLViewer iframe').first();
    const initialUrl = await iframe.getAttribute('src');
    expect(initialUrl).toMatch(/^blob:/);

    await page.getByRole('button', { name: 'Rerender HTML Document' }).click();
    await expect.poll(() => iframe.getAttribute('src')).not.toBe(initialUrl);
  });

  test('should not render before the file is loaded', async ({ page }) => {
    // Hold the file contents back, so that the tab is shown before they arrive.
    await page.route(/\/api\/contents\/.*test-2\.html\?/, async route => {
      await new Promise(resolve => setTimeout(resolve, 500));
      await route.continue();
    });
    await page.getByRole('listitem', { name: secondFileName }).dblclick();

    const iframe = page.locator('.jp-HTMLViewer iframe').nth(1);
    await expect(iframe).toHaveAttribute('src', /^blob:/);
    const firstUrl = await iframe.getAttribute('src');
    await expect(
      iframe.contentFrame().getByRole('link', { name: 'GitHub' })
    ).toBeVisible();
    await expect(iframe).toHaveAttribute('src', firstUrl!);
  });
});

async function waitForFrame(
  page: Page,
  frameSelector: Parameters<Page['frame']>[0]
): Promise<Frame> {
  const loops = 200;
  const pause = 10;
  for (let i = 0; i < loops; i++) {
    const frame = page.frame(frameSelector);
    if (frame) {
      return frame;
    }
    await page.waitForTimeout(pause);
  }
  throw Error(`Frame was not found after ${pause * loops}ms`);
}
