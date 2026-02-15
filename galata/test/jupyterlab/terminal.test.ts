/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { expect, test } from '@jupyterlab/galata';

const TERMINAL_SELECTOR = '.jp-Terminal';
const TERMINAL_INPUT_SELECTOR = '[aria-label="Terminal input"]';
const TERMINAL_THEME_ATTRIBUTE = 'data-term-theme';

test.describe('Terminal', () => {
  test.beforeEach(async ({ page }) => {
    await page.menu.clickMenuItem('File>New>Terminal');
    await page.locator(TERMINAL_SELECTOR).waitFor();
  });

  test.describe('Open', () => {
    test('should appear in the sidebar', async ({ page }) => {
      await page.sidebar.openTab('jp-running-sessions');
      // The number at the end is the identifier of the terminal.
      // We allow any because concurrent execution of tests means
      // that server can assign an identifier different than `1`.
      await expect(page.locator('text=/terminals\\/\\d+/')).toBeVisible();
    });
  });

  test.describe('Theme', () => {
    test('Light theme terminal inherit', async ({ page }) => {
      const terminal = page.locator(TERMINAL_SELECTOR);
      await terminal.waitFor();
      await expect(terminal).toHaveAttribute(
        TERMINAL_THEME_ATTRIBUTE,
        'inherit'
      );
      await terminal.focus();
      expect(await terminal.screenshot()).toMatchSnapshot(
        'light-term-inherit.png'
      );
    });

    test('Light theme terminal light', async ({ page }) => {
      const terminal = page.locator(TERMINAL_SELECTOR);
      await terminal.waitFor();
      await page.menu.clickMenuItem('Settings>Terminal Theme>Light');
      await expect(terminal).toHaveAttribute(TERMINAL_THEME_ATTRIBUTE, 'light');
      expect(await terminal.screenshot()).toMatchSnapshot(
        'light-term-light.png'
      );
    });

    test('Light theme terminal dark', async ({ page }) => {
      const terminal = page.locator(TERMINAL_SELECTOR);
      await terminal.waitFor();
      await page.menu.clickMenuItem('Settings>Terminal Theme>Dark');
      await expect(terminal).toHaveAttribute(TERMINAL_THEME_ATTRIBUTE, 'dark');
      await terminal.focus();
      expect(await terminal.screenshot()).toMatchSnapshot(
        'light-term-dark.png'
      );
    });

    test('Dark theme terminal inherit', async ({ page }) => {
      const terminal = page.locator(TERMINAL_SELECTOR);
      await terminal.waitFor();
      await page.theme.setDarkTheme();
      await expect(terminal).toHaveAttribute(
        TERMINAL_THEME_ATTRIBUTE,
        'inherit'
      );
      await terminal.focus();
      expect(await terminal.screenshot()).toMatchSnapshot(
        'dark-term-inherit.png'
      );
    });

    test('Dark theme terminal light', async ({ page }) => {
      const terminal = page.locator(TERMINAL_SELECTOR);
      await terminal.waitFor();
      await page.theme.setDarkTheme();
      await page.menu.clickMenuItem('Settings>Terminal Theme>Light');
      await expect(terminal).toHaveAttribute(TERMINAL_THEME_ATTRIBUTE, 'light');
      await terminal.focus();
      expect(await terminal.screenshot()).toMatchSnapshot(
        'dark-term-light.png'
      );
    });

    test('Dark theme terminal dark', async ({ page }) => {
      const terminal = page.locator(TERMINAL_SELECTOR);
      await terminal.waitFor();
      await page.theme.setDarkTheme();
      await page.menu.clickMenuItem('Settings>Terminal Theme>Dark');
      await expect(terminal).toHaveAttribute(TERMINAL_THEME_ATTRIBUTE, 'dark');
      await terminal.focus();
      expect(await terminal.screenshot()).toMatchSnapshot('dark-term-dark.png');
    });
  });

  test.describe('Search', () => {
    test('should highlight matches', async ({ page }) => {
      const terminal = page.locator(TERMINAL_SELECTOR);
      await terminal.waitFor();

      // Display some content in terminal.
      await page.locator('div.xterm-screen').click();
      await page.keyboard.type('seq 1006 2 1024');
      await page.keyboard.press('Enter');

      // Perform search.
      const searchText = '101';
      await page.evaluate(async searchText => {
        await window.jupyterapp.commands.execute('documentsearch:start', {
          searchText
        });
      }, searchText);

      // Wait for search to be performed and terminal canvas rerendered.
      await page.waitForSelector('.xterm-find-active-result-decoration');

      expect(await terminal.screenshot()).toMatchSnapshot('search.png');
    });
  });
});

test('Terminal should open in Launcher cwd', async ({ page, tmpPath }) => {
  await page.locator(`.jp-Launcher-cwd > h3:has-text("${tmpPath}")`).waitFor();

  await page.locator('[role="main"] >> p:has-text("Terminal")').click();

  const terminal = page.locator(TERMINAL_SELECTOR);
  await terminal.waitFor();

  await terminal.locator(TERMINAL_INPUT_SELECTOR).waitFor();
  await page.keyboard.type('basename $PWD');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(1000);
  expect(await terminal.screenshot()).toMatchSnapshot('launcher-term.png');
});

test('Terminal web link', async ({ page, tmpPath, browserName }) => {
  test.skip(browserName === 'firefox', 'Flaky on Firefox');

  await page.locator(`.jp-Launcher-cwd > h3:has-text("${tmpPath}")`).waitFor();

  await page.locator('[role="main"] >> p:has-text("Terminal")').click();

  const terminal = page.locator(TERMINAL_SELECTOR);
  await terminal.waitFor();

  await terminal.locator(TERMINAL_INPUT_SELECTOR).waitFor();
  await page.keyboard.type('echo https://jupyter.org/');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(1000);
  await Promise.all([
    terminal.locator('.jp-Terminal-body .xterm-cursor-pointer').waitFor(),
    terminal.locator('canvas.xterm-link-layer').hover({
      position: {
        x: 60,
        y: 23
      }
    })
  ]);
  expect(await terminal.screenshot()).toMatchSnapshot('web-links-term.png');
});
