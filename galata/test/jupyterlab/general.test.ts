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
});
