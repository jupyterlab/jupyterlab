// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect, galata, test } from '@jupyterlab/galata';

const sidebarIds: galata.SidebarTabId[] = [
  'filebrowser',
  'jp-property-inspector',
  'jp-running-sessions',
  'table-of-contents',
  'extensionmanager.main-view'
];

test.describe('Sidebars', () => {
  sidebarIds.forEach(sidebarId => {
    test(`Open Sidebar tab ${sidebarId}`, async ({ page }) => {
      await page.sidebar.openTab(sidebarId);
      expect(await page.sidebar.isTabOpen(sidebarId)).toEqual(true);

      const imageName = `opened-sidebar-${sidebarId.replace('.', '-')}.png`;
      const position = await page.sidebar.getTabPosition(sidebarId);
      const sidebar = await page.sidebar.getContentPanel(position);
      expect(await sidebar.screenshot()).toMatchSnapshot(
        imageName.toLowerCase()
      );
    });
  });

  test('File Browser has no unused rules', async ({ page }) => {
    await page.sidebar.openTab('filebrowser');
    const contextmenu = await page.menu.openContextMenu(
      '.jp-DirListing-headerItem'
    );
    const item = await page.menu.getMenuItemInMenu(
      contextmenu,
      'Show File Checkboxes'
    );
    await item.click();
    await page.notebook.createNew('notebook.ipynb');

    const unusedRules = await page.style.findUnusedStyleRules({
      page,
      fragments: ['jp-DirListing', 'jp-FileBrowser'],
      exclude: [
        // active during renaming
        'jp-DirListing-editor',
        // hidden files
        '[data-is-dot]',
        // filtering results
        '.jp-DirListing-content mark',
        // only added after resizing
        'jp-DirListing-narrow'
      ]
    });
    expect(unusedRules.length).toEqual(0);
  });

  test('Toggle Light theme', async ({ page }) => {
    await page.theme.setDarkTheme();

    await page.theme.setLightTheme();

    expect(await page.theme.getTheme()).toEqual('JupyterLab Light');
  });

  test('Move File Browser to right', async ({ page }) => {
    await page.sidebar.moveTabToRight('filebrowser');
    expect(await page.sidebar.getTabPosition('filebrowser')).toBe('right');
  });

  test('Open File Browser on right', async ({ page }) => {
    await page.sidebar.moveTabToRight('filebrowser');
    await page.sidebar.openTab('filebrowser');
    expect(await page.sidebar.isTabOpen('filebrowser')).toEqual(true);
  });

  test('Open Sidebar on right', async ({ page }) => {
    await page.sidebar.open('right');
    expect(await page.sidebar.isOpen('right')).toEqual(true);
  });

  test('Close Sidebar on right', async ({ page }) => {
    await page.sidebar.open('right');
    await page.menu.clickMenuItem('View>Appearance>Show Right Sidebar');
    expect(await page.sidebar.isOpen('right')).toEqual(false);
  });

  test('Capture File Browser on right', async ({ page }) => {
    await page.sidebar.moveTabToRight('filebrowser');
    await page.sidebar.openTab('filebrowser');

    let imageName = 'filebrowser-right.png';
    expect(await page.screenshot()).toMatchSnapshot(imageName);
  });

  test('Move Debugger to left', async ({ page }) => {
    await page.sidebar.moveTabToLeft('jp-debugger-sidebar');
    expect(await page.sidebar.getTabPosition('jp-debugger-sidebar')).toEqual(
      'left'
    );
  });
});
