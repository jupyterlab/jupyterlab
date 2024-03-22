// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect, galata, test } from '@jupyterlab/galata';
import { filterContent } from './utils';

test.use({
  autoGoto: false,
  mockState: galata.DEFAULT_DOCUMENTATION_STATE,
  viewport: { height: 720, width: 1280 }
});

// Use serial mode to avoid flaky screenshots
test.describe.configure({ mode: 'serial' });

test.describe('Default', () => {
  test('should use default layout', async ({ page }) => {
    await galata.Mock.freezeContentLastModified(page, filterContent);
    await page.goto();
    await page.addStyleTag({
      content: `.jp-LabShell.jp-mod-devMode {
        border-top: none;
      }`
    });

    await page.sidebar.setWidth();

    await page.menu.clickMenuItem('File>New>Terminal');

    await page.locator('.jp-Terminal').waitFor();

    expect(await page.screenshot()).toMatchSnapshot(
      'default-terminal-position-single.png'
    );
  });

  test('should use default toolbars', async ({ page }) => {
    await page.goto();
    await page.addStyleTag({
      content: `.jp-LabShell.jp-mod-devMode {
        border-top: none;
      }`
    });

    await page.sidebar.setWidth();

    await page.dblclick(
      '[aria-label="File Browser Section"] >> text=notebooks'
    );
    await page.dblclick('text=Lorenz.ipynb');

    await page.locator('div[role="main"] >> text=Lorenz.ipynb').waitFor();

    // Wait for kernel to settle on idle
    await page
      .locator('.jp-DebuggerBugButton[aria-disabled="false"]')
      .waitFor();
    await page
      .locator('.jp-Notebook-ExecutionIndicator[data-status="idle"]')
      .waitFor();

    expect(
      await page
        .locator('div[role="main"] >> .jp-NotebookPanel-toolbar')
        .screenshot()
    ).toMatchSnapshot('default-notebook-toolbar.png');
  });

  test('should use default menu bar', async ({ page }) => {
    await galata.Mock.freezeContentLastModified(page, filterContent);
    await page.goto();
    await page.addStyleTag({
      content: `.jp-LabShell.jp-mod-devMode {
        border-top: none;
      }`
    });

    await page.sidebar.setWidth();

    await page.click('text=Tabs');

    await page.locator('#jp-mainmenu-tabs').waitFor();

    expect(
      await page.screenshot({ clip: { x: 0, y: 0, width: 800, height: 200 } })
    ).toMatchSnapshot('default-menu-bar.png');
  });

  test('should use default context menu', async ({ page }) => {
    await galata.Mock.freezeContentLastModified(page, filterContent);
    await page.goto();
    await page.addStyleTag({
      content: `.jp-LabShell.jp-mod-devMode {
        border-top: none;
      }`
    });

    await page.sidebar.setWidth();

    await page.dblclick(
      '[aria-label="File Browser Section"] >> text=notebooks'
    );
    await page.click('text=Lorenz.ipynb', { button: 'right' });

    await page.hover('ul[role="menu"] >> text=New File');

    expect(
      await page.screenshot({ clip: { x: 0, y: 0, width: 500, height: 500 } })
    ).toMatchSnapshot('default-context-menu.png');
  });
});

test.describe('Customized', () => {
  test.use({
    mockSettings: {
      ...galata.DEFAULT_SETTINGS,
      '@jupyterlab/application-extension:context-menu': {
        contextMenu: [
          // Disable New notebook entry
          {
            command: 'notebook:create-new',
            selector: '.jp-DirListing-content',
            args: {
              isContextMenu: true
            },
            disabled: true
          },
          // Add new entry on notebook file to export them as Markdown
          {
            command: 'notebook:export-to-format',
            selector: '.jp-DirListing-item[data-file-type="notebook"]',
            rank: 3,
            // Command arguments
            args: {
              format: 'markdown',
              label: 'Export as Markdown'
            }
          }
        ]
      },
      '@jupyterlab/application-extension:shell': {
        layout: {
          single: {
            'Linked Console': { area: 'down' },
            Inspector: { area: 'down' },
            'Cloned Output': { area: 'down' },
            // Add new terminals in the down area in simple mode
            Terminal: { area: 'down' }
          },
          multiple: {
            // Add new terminals in the right sidebar in default mode
            Terminal: { area: 'right' }
          }
        }
      },
      '@jupyterlab/notebook-extension:panel': {
        toolbar: [
          // Disable the restart and run all button
          {
            name: 'restart-and-run',
            disabled: true
          },
          // Add a new button to clear all cell outputs
          {
            name: 'clear-all-outputs',
            command: 'notebook:clear-all-cell-outputs'
          }
        ]
      },
      '@jupyterlab/mainmenu-extension:plugin': {
        menus: [
          {
            // Disable the Run menu
            id: 'jp-mainmenu-run',
            disabled: true
          },
          {
            // Move the Tabs menu to the end by changing its rank
            id: 'jp-mainmenu-tabs',
            rank: 1100,
            items: [
              // Add a new entry in the Tabs menu
              {
                command: 'launcher:create',
                rank: 0
              }
            ]
          }
        ]
      }
    }
  });
  test('should use customized layout', async ({ page }) => {
    await galata.Mock.freezeContentLastModified(page, filterContent);
    await page.goto();
    await page.addStyleTag({
      content: `.jp-LabShell.jp-mod-devMode {
        border-top: none;
      }`
    });

    await page.sidebar.setWidth();

    await page.menu.clickMenuItem('File>New>Terminal');

    await page.locator('.jp-Terminal').waitFor();

    await page.sidebar.setWidth(271, 'right');

    expect(await page.screenshot()).toMatchSnapshot(
      'customized-terminal-position-single.png'
    );
  });

  test('should use customized toolbars', async ({ page }) => {
    await page.goto();
    await page.addStyleTag({
      content: `.jp-LabShell.jp-mod-devMode {
        border-top: none;
      }`
    });

    await page.sidebar.setWidth();

    await page.dblclick(
      '[aria-label="File Browser Section"] >> text=notebooks'
    );
    await page.dblclick('text=Lorenz.ipynb');

    await page.locator('div[role="main"] >> text=Lorenz.ipynb').waitFor();

    await page.locator('text=Python 3 (ipykernel) | Idle').waitFor();

    expect(
      await page
        .locator('div[role="main"] >> .jp-NotebookPanel-toolbar')
        .screenshot()
    ).toMatchSnapshot('customized-notebook-toolbar.png');
  });

  test('should use customized menu bar', async ({ page }) => {
    await galata.Mock.freezeContentLastModified(page, filterContent);
    await page.goto();
    await page.addStyleTag({
      content: `.jp-LabShell.jp-mod-devMode {
        border-top: none;
      }`
    });

    await page.sidebar.setWidth();

    await page.click('text=Tabs');

    await page.locator('#jp-mainmenu-tabs').waitFor();

    expect(
      await page.screenshot({ clip: { x: 0, y: 0, width: 800, height: 200 } })
    ).toMatchSnapshot('customized-menu-bar.png');
  });

  test('should use customized context menu', async ({ page }) => {
    await galata.Mock.freezeContentLastModified(page, filterContent);
    await page.goto();
    await page.addStyleTag({
      content: `.jp-LabShell.jp-mod-devMode {
        border-top: none;
      }`
    });

    await page.sidebar.setWidth();

    await page.dblclick(
      '[aria-label="File Browser Section"] >> text=notebooks'
    );
    await page.click('text=Lorenz.ipynb', { button: 'right' });

    await page.hover('ul[role="menu"] >> text=New File');

    expect(
      await page.screenshot({ clip: { x: 0, y: 0, width: 500, height: 500 } })
    ).toMatchSnapshot('customized-context-menu.png');
  });
});
