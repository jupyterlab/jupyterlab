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
  test.use({
    mockSettings: {
      '@jupyterlab/terminal-extension:plugin': {
        screenReaderMode: true
      }
    }
  });

  // Ensure a clean state before each test
  test.beforeEach(async ({ page }) => {
    await page.activity.closeAll();
  });

  test.afterEach(async ({ page }) => {
    await page.unrouteAll({ behavior: 'ignoreErrors' });
  });

  test('should open one terminal for a single selected directory', async ({
    page,
    tmpPath
  }) => {
    // a test directory
    const folderName = 'single-dir-test';
    await page.contents.createDirectory(`${tmpPath}/${folderName}`);
    await page.filebrowser.openDirectory(tmpPath);
    await page.filebrowser.refresh();

    // Right-click the directory and select "Open in Terminal"
    const folderLocator = page.locator(
      `.jp-DirListing-item:has-text("${folderName}")`
    );
    await folderLocator.waitFor({ state: 'visible' });
    await folderLocator.click({ button: 'right' });
    await page.getByRole('menuitem', { name: 'Open in Terminal' }).click();

    // Check that one terminal opened in the correct path
    const terminalTabLocator = page.activity.getTabLocator('Terminal 1');
    await expect(terminalTabLocator).toBeVisible();

    const terminalPanelLocator =
      await page.activity.getPanelLocator('Terminal 1');
    expect(terminalPanelLocator).not.toBeNull();

    // Wait for terminal body to be ready
    await terminalPanelLocator!.locator('.jp-Terminal-body').waitFor();
    await page.waitForTimeout(200);

    await terminalPanelLocator!.click();
    await page.waitForTimeout(200);

    await page.keyboard.type('pwd');
    await page.keyboard.press('Enter');

    await expect(terminalPanelLocator!).toContainText(folderName, {
      timeout: 5000
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
    await page.filebrowser.refresh();

    // Select both directories using name-based lookup and Shift-click
    const folderALocator = page.locator(
      `.jp-DirListing-item:has-text("${folderA}")`
    );
    const folderBLocator = page.locator(
      `.jp-DirListing-item:has-text("${folderB}")`
    );

    // Click first item
    await folderALocator.waitFor({ state: 'visible' });
    await folderALocator.click();

    // Shift-click second item to select range (A, B)
    await folderBLocator.waitFor({ state: 'visible' });
    await folderBLocator.click({ modifiers: ['Shift'] });

    // Right-click to open context menu on selection
    await folderBLocator.click({ button: 'right' });

    // Open in Terminal
    await page.getByRole('menuitem', { name: 'Open in Terminal' }).click();

    // Check that two terminal tabs opened in the dock panel
    const tabs = page.locator(
      '.lm-DockPanel-tabBar .lm-TabBar-tab:has-text("Terminal")'
    );
    await expect(tabs).toHaveCount(2, { timeout: 10000 });

    // Iterate through tabs, activate each, and check content
    const foundFolders = new Set<string>();
    for (let i = 0; i < 2; i++) {
      await tabs.nth(i).click();
      await page.waitForTimeout(500);

      // Find the currently visible terminal body
      const activeTerminal = page.locator('.jp-Terminal-body:visible');
      await expect(activeTerminal).toHaveCount(1);

      await activeTerminal.click();
      await page.keyboard.type('pwd');
      await page.keyboard.press('Enter');

      await expect(activeTerminal).toContainText(
        new RegExp(`${folderA}|${folderB}`),
        { timeout: 10000 }
      );

      const text = await activeTerminal.textContent();
      if (text?.includes(folderA)) {
        foundFolders.add(folderA);
      }
      if (text?.includes(folderB)) {
        foundFolders.add(folderB);
      }
    }
    expect(foundFolders.size).toBe(2);
    expect(foundFolders.has(folderA)).toBe(true);
    expect(foundFolders.has(folderB)).toBe(true);
  });

  test('should open terminal for directory in mixed selection', async ({
    page,
    tmpPath
  }) => {
    // Create Dir A and File B
    const folderName = 'mixed-dir';
    const fileName = 'mixed-file.txt';
    await page.contents.createDirectory(`${tmpPath}/${folderName}`);

    await page.menu.clickMenuItem('File>New>Text File');
    await page.contents.renameFile(
      `${tmpPath}/untitled.txt`,
      `${tmpPath}/${fileName}`
    );
    await page.filebrowser.refresh();

    // Select both using Shift-click
    const folderLocator = page.locator(
      `.jp-DirListing-item:has-text("${folderName}")`
    );
    const fileLocator = page.locator(
      `.jp-DirListing-item:has-text("${fileName}")`
    );

    await folderLocator.waitFor({ state: 'visible' });
    await folderLocator.click();

    await fileLocator.waitFor({ state: 'visible' });
    // Use Shift for consistent multi-selection
    await fileLocator.click({ modifiers: ['Shift'] });

    // Right-click the folder to trigger context menu on multiselection
    await folderLocator.click({ button: 'right' });

    // Open in Terminal
    await page.getByRole('menuitem', { name: 'Open in Terminal' }).click();

    // Expect exactly 1 terminal (for the folder)
    const tabs = page.locator(
      '.lm-DockPanel-tabBar .lm-TabBar-tab:has-text("Terminal")'
    );
    await expect(tabs).toHaveCount(1, { timeout: 10000 });

    // Verify content is the directory
    const activeTerminal = page.locator('.jp-Terminal-body:visible');

    if ((await tabs.count()) > 0) {
      await tabs.first().click();
    }
    await page.waitForTimeout(500);

    await activeTerminal.click();
    await page.keyboard.type('pwd');
    await page.keyboard.press('Enter');

    await expect(activeTerminal).toContainText(folderName, { timeout: 5000 });
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
    await page.filebrowser.refresh();

    // Right-click the file
    const fileLocator = page.locator(
      `.jp-DirListing-item:has-text("${fileName}")`
    );
    await fileLocator.waitFor({ state: 'visible' });
    await fileLocator.click({ button: 'right' });

    // Assert: The context menu is open (checking for a known item like "Rename")
    await expect(page.getByRole('menuitem', { name: 'Rename' })).toBeVisible();

    // Assert: The "Open in Terminal" menu item should NOT be visible
    await expect(
      page.getByRole('menuitem', { name: 'Open in Terminal' })
    ).not.toBeVisible();
  });
});
