// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { galata, test } from '@jupyterlab/galata';

const menuPaths = [
  'File', 'File>New', 'File>Export Notebook As…', 'Edit', 'View', 'View>Text Editor Syntax Highlighting', 'Run', 'Kernel', 'Tabs', 'Settings', 'Settings>JupyterLab Theme', 'Settings>Language', 'Settings>Console Run Keystroke', 'Settings>Text Editor Key Map', 'Settings>Text Editor Theme', 'Settings>Text Editor Indentation', 'Settings>Terminal Theme', 'Help'
];

const sidebarIds: galata.SidebarTabId[] = [
  'filebrowser', 'jp-property-inspector', 'jp-running-sessions', 'table-of-contents', 'extensionmanager.main-view'
];

export
function runMenuOpenTest() {
  test('Open menu items', async () => {
    for (const menuPath of menuPaths) {
      await galata.menu.open(menuPath);
      expect(await galata.menu.isOpen(menuPath)).toBeTruthy();

      const menu = await galata.menu.getOpenMenu();
      await galata.capture.screenshot(`opened-menu-${menuPath}`, menu);
    }
  });

  test('Close all menus', async () => {
    await galata.menu.closeAll();
  });
}

export
function runSidebarOpenTest() {
  test('Open sidebar tabs', async () => {
    for (const sidebarId of sidebarIds) {
      await galata.sidebar.openTab(sidebarId);
      expect(await galata.sidebar.isTabOpen(sidebarId)).toBeTruthy();

      await galata.capture.screenshot(`opened-sidebar-${sidebarId}`);
    }
  });

  test('Open file browser tab', async () => {
    await galata.sidebar.openTab('filebrowser');
  });
}
