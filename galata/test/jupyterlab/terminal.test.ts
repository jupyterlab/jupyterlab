/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { expect, test } from '@jupyterlab/galata';

const TERMINAL_SELECTOR = '.jp-Terminal';
const TERMINAL_THEME_ATTRIBUTE = 'data-term-theme';

test.describe('Terminal', () => {
  test.beforeEach(async ({ page }) => {
    await page.menu.clickMenuItem('File>New>Terminal');
    await page.locator(TERMINAL_SELECTOR).waitFor();
  });

  test.describe('Open', () => {
    test('should appear in the sidebar', async ({ page }) => {
      await page.sidebar.openTab('jp-running-sessions');
      await expect(page.locator('text=terminals/1')).toBeVisible();
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
      await page.waitForTimeout(500);

      expect(await terminal.screenshot()).toMatchSnapshot('search.png');
    });
  });
});

test('Terminal should open in Launcher cwd', async ({ page, tmpPath }) => {
  await page.locator(`.jp-Launcher-cwd > h3:has-text("${tmpPath}")`).waitFor();

  await page.locator('[role="main"] >> p:has-text("Terminal")').click();

  const terminal = page.locator(TERMINAL_SELECTOR);
  await terminal.waitFor();

  await page.waitForTimeout(1000);
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

  await page.waitForTimeout(1000);
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

test.describe('Open in Terminal from File Browser', () => {
  // Ensure a clean state before each test
  test.beforeEach(async ({ page }) => {
    await page.activity.closeAll();
  });

  test('should open one terminal for a single selected directory', async ({
    page,
    tmpPath
  }) => {
    // a test directory
    const folderName = 'single-dir-test';
    await page.contents.createDirectory(`${tmpPath}/${folderName}`);
    await page.filebrowser.openDirectory(tmpPath);

    // Right-click the directory and select "Open in Terminal"
    const folderLocator = page.locator(
      `.jp-DirListing-item[data-path="${tmpPath}/${folderName}"]`
    );
    await folderLocator.click({ button: 'right' });
    await page.getByRole('menuitem', { name: 'Open in Terminal' }).click();

    // Check that one terminal opened in the correct path
    const terminalTabLocator = page.activity.getTabLocator('Terminal 1');
    await expect(terminalTabLocator).toBeVisible();

    const terminalPanelLocator =
      await page.activity.getPanelLocator('Terminal 1');
    expect(terminalPanelLocator).not.toBeNull();
    await terminalPanelLocator!.click();
    await page.keyboard.type('pwd');
    await page.keyboard.press('Enter');

    await expect(terminalPanelLocator!).toContainText(folderName, {
      timeout: 2000
    });
  });

  test('should open multiple terminals for multiple selected directories', async ({
    page,
    tmpPath
  }) => {
    // Create two test directories
    const folderA = 'multi-dir-a';
    const folderB = 'multi-dir-b';
    await page.contents.createDirectory(`${tmpPath}/${folderA}`);
    await page.contents.createDirectory(`${tmpPath}/${folderB}`);
    await page.filebrowser.openDirectory(tmpPath);

    // Control-click to select both directories, then right-click
    const folderALocator = page.locator(
      `.jp-DirListing-item[data-path="${tmpPath}/${folderA}"]`
    );
    const folderBLocator = page.locator(
      `.jp-DirListing-item[data-path="${tmpPath}/${folderB}"]`
    );

    await folderALocator.click();
    await folderBLocator.click({ modifiers: ['Control'] });
    await folderBLocator.click({ button: 'right' });
    await page.getByRole('menuitem', { name: 'Open in Terminal' }).click();

    // Check that two terminals opened, each in the correct path
    const term1Panel = await page.activity.getPanelLocator('Terminal 1');
    await expect(term1Panel).not.toBeNull();
    await expect(term1Panel!).toBeVisible();
    await term1Panel!.click();
    await page.keyboard.type('pwd');
    await page.keyboard.press('Enter');
    await expect(term1Panel!).toContainText(folderA, { timeout: 2000 });

    const term2Panel = await page.activity.getPanelLocator('Terminal 2');
    await expect(term2Panel).not.toBeNull();
    await expect(term2Panel!).toBeVisible();
    await term2Panel!.click();
    await page.keyboard.type('pwd');
    await page.keyboard.press('Enter');
    await expect(term2Panel!).toContainText(folderB, { timeout: 2000 });
  });

  test('should not show the context menu item for files', async ({
    page,
    tmpPath
  }) => {
    //  Create a test file by simulating the UI actions
    const fileName = 'a-file.txt';
    const fullPath = `${tmpPath}/${fileName}`;
    await page.filebrowser.openDirectory(tmpPath);

    await page.menu.clickMenuItem('File>New>Text File');
    await page.contents.renameFile(`${tmpPath}/untitled.txt`, fullPath);

    // Right-click the file
    const fileLocator = page.locator(
      `.jp-DirListing-item[data-path="${fullPath}"]`
    );
    await fileLocator.waitFor({ state: 'visible' });
    await fileLocator.click({ button: 'right' });

    // Assert: The "Open in Terminal" menu item should NOT be visible
    await expect(
      page.getByRole('menuitem', { name: 'Open in Terminal' })
    ).not.toBeVisible();
  });
});
