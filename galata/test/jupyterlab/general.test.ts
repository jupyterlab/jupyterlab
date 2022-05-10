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
});
