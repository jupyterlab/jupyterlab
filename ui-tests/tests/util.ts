// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { galata, test } from '@jupyterlab/galata';

const menuPaths = [
  'File',
  'File>New',
  'File>Export Notebook As…',
  'Edit',
  'View',
  'Run',
  'Kernel',
  'Tabs',
  'Settings',
  'Settings>JupyterLab Theme',
  'Settings>Language',
  'Settings>Console Run Keystroke',
  'Settings>Text Editor Key Map',
  'Settings>Text Editor Theme',
  'Settings>Text Editor Indentation',
  'Settings>Terminal Theme',
  'Help'
];

const sidebarIds: galata.SidebarTabId[] = [
  'filebrowser',
  'jp-property-inspector',
  'jp-running-sessions',
  'table-of-contents',
  'extensionmanager.main-view'
];

// eslint-disable-next-line jest/no-export
export function runMenuOpenTest() {
  // wait for Export menu since it is populated async from server
  test('Wait for Export menu to populate', async () => {
    await galata.menu.open('File');
    await galata.waitFor(
      async (): Promise<boolean> => {
        return (
          (await galata.menu.getMenuItem('File>Export Notebook As…')) !== null
        );
      }
    );
    await galata.menu.closeAll();
  });

  test('Open menu items', async () => {
    for (const menuPath of menuPaths) {
      await galata.menu.open(menuPath);
      expect(await galata.menu.isOpen(menuPath)).toBeTruthy();

      const imageName = `opened-menu-${menuPath}`;
      const menu = await galata.menu.getOpenMenu();
      await galata.capture.screenshot(imageName, menu);
      expect(await galata.capture.compareScreenshot(imageName)).toBe('same');
    }
  });

  test('Close all menus', async () => {
    await galata.menu.closeAll();
  });
}

// eslint-disable-next-line jest/no-export
export function runSidebarOpenTest() {
  test('Open Sidebar tabs', async () => {
    for (const sidebarId of sidebarIds) {
      await galata.sidebar.openTab(sidebarId);
      expect(await galata.sidebar.isTabOpen(sidebarId)).toBeTruthy();

      const imageName = `opened-sidebar-${sidebarId}`;
      const position = await galata.sidebar.getTabPosition(sidebarId);
      const sidebar = await galata.sidebar.getContentPanel(position);
      await galata.capture.screenshot(imageName, sidebar);
      expect(await galata.capture.compareScreenshot(imageName)).toBe('same');
    }
  });

  test('Open file browser tab', async () => {
    await galata.sidebar.openTab('filebrowser');
  });
}
