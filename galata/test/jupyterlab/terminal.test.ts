/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import path from 'path';
import { type Locator, type Page } from '@playwright/test';
import { expect, galata, test } from '@jupyterlab/galata';

const TERMINAL_SELECTOR = '.jp-Terminal';
const TERMINAL_INPUT_SELECTOR = '[aria-label="Terminal input"]';
const TERMINAL_THEME_ATTRIBUTE = 'data-term-theme';

/**
 * Run a shell command in the visible terminal panel.
 *
 * @param page Playwright page (provided by galata fixture)
 * @param terminalLocator Locator that matches the terminal container
 * @param command Shell command to run
 */
async function runCommand(
  page: Page,
  terminalLocator: Locator,
  command: string,
  verify = false
): Promise<void> {
  await terminalLocator.waitFor({ state: 'visible' });
  await terminalLocator.locator('.jp-Terminal-body').focus();

  await terminalLocator
    .locator(TERMINAL_INPUT_SELECTOR)
    .waitFor({ state: 'visible' });

  await page.keyboard.type(command);
  if (verify) {
    await expect(terminalLocator.locator('.jp-Terminal-body')).toContainText(
      command
    );
  }
  await page.keyboard.press('Enter');
}

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
      await runCommand(page, terminal, 'seq 1006 2 1024');

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

test.describe('Terminal', () => {
  test.use({
    mockSettings: {
      ...galata.DEFAULT_SETTINGS,
      '@jupyterlab/terminal-extension:plugin': {
        ...galata.DEFAULT_SETTINGS['@jupyterlab/terminal-extension:plugin'],
        screenReaderMode: true
      }
    },
    tmpPath: 'terminal-test'
  });

  test.beforeAll(async ({ request, tmpPath }) => {
    const contents = galata.newContentsHelper(request);
    await contents.createDirectory(tmpPath);
  });

  test('Terminal should open in Launcher cwd', async ({ page, tmpPath }) => {
    await page
      .locator(`.jp-Launcher-cwd > h3:has-text("${tmpPath}")`)
      .waitFor();

    await page.locator('[role="main"] >> p:has-text("Terminal")').click();

    const terminal = page.locator(TERMINAL_SELECTOR);
    await terminal.waitFor();

    // use the local helper to run basename
    await runCommand(page, terminal, 'basename $PWD', true);

    // Wait for the basename to appear in the terminal output
    const basename = path.basename(tmpPath);
    const terminalBody = terminal.locator('.jp-Terminal-body:visible');
    await expect(terminalBody).toContainText(basename, { timeout: 5000 });

    expect(await terminal.screenshot()).toMatchSnapshot('launcher-term.png');
  });

  test('Terminal web link', async ({ page, tmpPath, browserName }) => {
    test.skip(browserName === 'firefox', 'Flaky on Firefox');

    await page
      .locator(`.jp-Launcher-cwd > h3:has-text("${tmpPath}")`)
      .waitFor();

    await page.locator('[role="main"] >> p:has-text("Terminal")').click();

    const terminal = page.locator(TERMINAL_SELECTOR);
    await terminal.waitFor();

    await runCommand(page, terminal, 'echo https://jupyter.org/', true);

    // Wait for the URL to appear in the terminal output
    const terminalBody = terminal.locator('.jp-Terminal-body:visible');
    await expect(terminalBody).toContainText('https://jupyter.org/', {
      timeout: 5000
    });

    // Hover over the link layer to trigger link highlighting
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
});

test.describe('Open in Terminal from File Browser', () => {
  test.use({
    mockSettings: {
      ...galata.DEFAULT_SETTINGS,
      '@jupyterlab/terminal-extension:plugin': {
        ...galata.DEFAULT_SETTINGS['@jupyterlab/terminal-extension:plugin'],
        screenReaderMode: true
      }
    }
  });

  test.beforeAll(async ({ request, tmpPath }) => {
    const contents = galata.newContentsHelper(request);
    await contents.createDirectory(tmpPath);
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

    // Assert exactly one terminal tab opened
    const terminalTabLocator = page.locator(
      '.lm-DockPanel-tabBar .lm-TabBar-tab:has-text("Terminal")'
    );
    await expect(terminalTabLocator).toHaveCount(1);

    // Get visible terminal panel (container)
    const terminalPanelLocator = page.locator(
      '.lm-DockPanel .jp-Terminal:visible'
    );
    await expect(terminalPanelLocator).toHaveCount(1);

    // Wait for terminal to be ready
    await terminalPanelLocator.locator('.jp-Terminal-body').waitFor();
    await terminalPanelLocator.click();

    // Use helper to execute pwd in the visible terminal container
    await runCommand(page, terminalPanelLocator, 'pwd');

    await expect(terminalPanelLocator).toContainText(folderName, {
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
    const activeTerminal = page.locator('.jp-Terminal-body:visible');
    const foundFolders = new Set<string>();
    for (let i = 0; i < 2; i++) {
      await tabs.nth(i).click();
      await activeTerminal.waitFor({ state: 'visible' });

      // Find the currently visible terminal body
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

    await page.contents.uploadContent(
      'content',
      'text',
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
    const activeTerminal = page.locator('.lm-DockPanel .jp-Terminal:visible');
    await activeTerminal.waitFor({ state: 'visible' });

    await runCommand(page, activeTerminal, 'pwd');

    const activeBody = activeTerminal.locator('.jp-Terminal-body:visible');
    await expect(activeBody).toContainText(folderName, { timeout: 5000 });
  });

  test('should not show the context menu item for files', async ({
    page,
    tmpPath
  }) => {
    //  Create a test file by simulating the UI actions
    const fileName = 'a-file.txt';
    const fullPath = `${tmpPath}/${fileName}`;
    await page.filebrowser.openDirectory(tmpPath);

    await page.contents.uploadContent('content', 'text', fullPath);
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
