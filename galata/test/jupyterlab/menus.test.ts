// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect, test } from '@jupyterlab/galata';
import type { ISettingRegistry } from '@jupyterlab/settingregistry';

const menuPaths = [
  'File',
  'File>New',
  'Edit',
  'View',
  'View>Appearance',
  'Run',
  'Kernel',
  'Tabs',
  'Settings',
  'Settings>Theme',
  'Settings>Console Run Keystroke',
  'Settings>Text Editor Theme',
  'Settings>Text Editor Indentation',
  'Settings>Terminal Theme',
  'Help'
];

test.describe('General Tests', () => {
  test.use({ autoGoto: false });

  menuPaths.forEach(menuPath => {
    test(`Open menu item ${menuPath}`, async ({ page }) => {
      await page.goto();
      await page.menu.open(menuPath);
      expect(await page.menu.isOpen(menuPath)).toBeTruthy();

      const imageName = `opened-menu-${menuPath.replace(/>/g, '-')}.png`;
      const menu = await page.menu.getOpenMenu();
      expect(await menu.screenshot()).toMatchSnapshot(imageName.toLowerCase());
    });
  });

  test('Open language menu', async ({ page }) => {
    await page.route(/.*\/api\/translation.*/, (route, request) => {
      if (request.method() === 'GET') {
        return route.fulfill({
          status: 200,
          body: '{"data": {"en": {"displayName": "English", "nativeName": "English"}}, "message": ""}'
        });
      } else {
        return route.continue();
      }
    });
    await page.goto();

    const menuPath = 'Settings>Language';
    await page.menu.open(menuPath);
    expect(await page.menu.isOpen(menuPath)).toBeTruthy();

    const imageName = `opened-menu-settings-language.png`;
    const menu = await page.menu.getOpenMenu();
    expect(await menu.screenshot()).toMatchSnapshot(imageName.toLowerCase());
  });

  test('Close all menus', async ({ page }) => {
    await page.goto();
    await page.menu.open('File>New');
    await page.menu.closeAll();
    expect(await page.menu.isAnyOpen()).toEqual(false);
  });
});

const EXPECTED_MISSING_COMMANDS_MAINMENU = ['hub:control-panel', 'hub:logout'];

test('Main menu definition must target an valid command', async ({ page }) => {
  const [menus, commands] = await page.evaluate(async () => {
    const settings = await window.galata.getPlugin(
      '@jupyterlab/apputils-extension:settings'
    );
    const menus = await settings.get(
      '@jupyterlab/mainmenu-extension:plugin',
      'menus'
    );
    const commandIds = window.jupyterapp.commands.listCommands();

    return Promise.resolve([
      menus.composite as ISettingRegistry.IMenu[],
      commandIds
    ]);
  });

  commands.push(...EXPECTED_MISSING_COMMANDS_MAINMENU);

  const missingCommands = menus.reduce((agg, current) => {
    const items =
      current.items?.reduce((agg, item) => {
        const testedItem = reduceItem(item, commands);
        if (testedItem !== null) {
          agg.push(testedItem);
        }
        return agg;
      }, []) ?? [];
    if (items.length > 0) {
      const r = {};
      r[current.label ?? 'unknown'] = items;
      agg.push(r);
    }

    return agg;
  }, []);

  expect(missingCommands).toEqual([]);
});

test('Context menu definition must target an valid command', async ({
  page
}) => {
  const [items, commands] = await page.evaluate(async () => {
    const settings = await window.galata.getPlugin(
      '@jupyterlab/apputils-extension:settings'
    );
    const items = await settings.get(
      '@jupyterlab/application-extension:context-menu',
      'contextMenu'
    );
    const commandIds = window.jupyterapp.commands.listCommands();

    return Promise.resolve([
      items.composite as ISettingRegistry.IMenuItem[],
      commandIds
    ]);
  });

  commands.push(...EXPECTED_MISSING_COMMANDS_MAINMENU);

  const missingCommands = items.reduce((agg, item) => {
    const testedItem = reduceItem(item, commands);
    if (testedItem !== null) {
      agg.push(testedItem);
    }
    return agg;
  }, []);

  expect(missingCommands).toEqual([]);
});

function reduceItem(
  item: ISettingRegistry.IMenuItem,
  commands: string[]
):
  | ISettingRegistry.IMenuItem
  | { [id: string]: ISettingRegistry.IMenuItem[] }
  | null {
  switch (item.type ?? 'command') {
    case 'command':
      if (!commands.includes(item.command)) {
        return item;
      }
      break;
    case 'submenu': {
      const items =
        item.submenu?.items?.reduce((agg, item) => {
          const testedItem = reduceItem(item, commands);
          if (testedItem !== null) {
            agg.push(testedItem);
          }
          return agg;
        }, []) ?? [];
      if (items.length === 0) {
        return null;
      } else {
        const r = {};
        r[item.submenu?.label ?? 'unknown'] = items;
        return r;
      }
    }
    default:
      break;
  }
  return null;
}

test.describe('Top menu keyboard navigation @a11y', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto();
    const fileMenu = page.getByRole('menuitem', { name: 'File' });
    // eslint-disable-next-line no-constant-condition
    while (true) {
      await page.keyboard.press('Tab');
      let fileClass = ((await fileMenu.getAttribute('class')) ?? '').split(' ');
      if (fileClass.includes('lm-mod-active')) {
        break;
      }
    }
  });

  test('open file menu with keyboard', async ({ page }) => {
    await page.keyboard.press('Enter');

    expect(await page.menu.isOpen('File')).toBeTruthy();
  });

  test('Open edit menu with keyboard', async ({ page }) => {
    const editMenu = page.getByRole('menuitem', { name: 'Edit' });
    // eslint-disable-next-line no-constant-condition
    while (true) {
      await page.keyboard.press('ArrowRight');
      let editClass = ((await editMenu.getAttribute('class')) ?? '').split(' ');
      if (editClass.includes('lm-mod-active')) {
        break;
      }
    }
    await page.keyboard.press('Enter');

    expect(await page.menu.isOpen('Edit')).toBeTruthy();
  });

  test('Open view menu with keyboard', async ({ page }) => {
    const viewMenu = page.getByRole('menuitem', { name: 'View' });
    // eslint-disable-next-line no-constant-condition
    while (true) {
      await page.keyboard.press('ArrowRight');
      let viewClass = ((await viewMenu.getAttribute('class')) ?? '').split(' ');
      if (viewClass.includes('lm-mod-active')) {
        break;
      }
    }
    await page.keyboard.press('Enter');

    expect(await page.menu.isOpen('View')).toBeTruthy();
  });

  test('Open run menu with keyboard', async ({ page }) => {
    const runMenu = page.getByRole('menuitem', { name: 'Run' });
    // eslint-disable-next-line no-constant-condition
    while (true) {
      await page.keyboard.press('ArrowRight');
      let runClass = ((await runMenu.getAttribute('class')) ?? '').split(' ');
      if (runClass.includes('lm-mod-active')) {
        break;
      }
    }
    await page.keyboard.press('Enter');

    expect(await page.menu.isOpen('Run')).toBeTruthy();
  });

  test('Open kernel menu with keyboard', async ({ page }) => {
    const kernelMenu = page.getByRole('menuitem', { name: 'Kernel' });
    // eslint-disable-next-line no-constant-condition
    while (true) {
      await page.keyboard.press('ArrowRight');
      let kernelClass = ((await kernelMenu.getAttribute('class')) ?? '').split(
        ' '
      );
      if (kernelClass.includes('lm-mod-active')) {
        break;
      }
    }
    await page.keyboard.press('Enter');

    expect(await page.menu.isOpen('Kernel')).toBeTruthy();
  });

  test('Open tabs menu with keyboard', async ({ page }) => {
    const tabsMenu = page.getByRole('menuitem', { name: 'Tabs' });
    // eslint-disable-next-line no-constant-condition
    while (true) {
      await page.keyboard.press('ArrowRight');
      let tabsClass = ((await tabsMenu.getAttribute('class')) ?? '').split(' ');
      if (tabsClass.includes('lm-mod-active')) {
        break;
      }
    }
    await page.keyboard.press('Enter');

    expect(await page.menu.isOpen('Tabs')).toBeTruthy();
  });

  test('Open settings menu with keyboard', async ({ page }) => {
    const settingsMenu = page.getByRole('menuitem', { name: 'Settings' });
    // eslint-disable-next-line no-constant-condition
    while (true) {
      await page.keyboard.press('ArrowRight');
      let settingsClass = (
        (await settingsMenu.getAttribute('class')) ?? ''
      ).split(' ');
      if (settingsClass.includes('lm-mod-active')) {
        break;
      }
    }
    await page.keyboard.press('Enter');

    expect(await page.menu.isOpen('Settings')).toBeTruthy();
  });

  test('Open help menu with keyboard', async ({ page }) => {
    const helpMenu = page.getByRole('menuitem', { name: 'Help' });

    // eslint-disable-next-line no-constant-condition
    while (true) {
      await page.keyboard.press('ArrowRight');
      let helpClass = ((await helpMenu.getAttribute('class')) ?? '').split(' ');
      if (helpClass.includes('lm-mod-active')) {
        break;
      }
    }

    await page.keyboard.press('Enter');

    expect(await page.menu.isOpen('Help')).toBeTruthy();
  });

  test('Open file > New with keyboard', async ({ page }) => {
    await page.keyboard.press('Enter');
    const fileNew = page.locator('[data-type="submenu"]', { hasText: 'New' });

    // eslint-disable-next-line no-constant-condition
    while (true) {
      await page.keyboard.press('ArrowDown');
      let fileNewClass = ((await fileNew.getAttribute('class')) ?? '').split(
        ' '
      );
      if (fileNewClass.includes('lm-mod-active')) {
        break;
      }
    }
    await page.keyboard.press('Enter');
    const menuPath = 'File>New';

    expect(await page.menu.isOpen(menuPath)).toBeTruthy();
  });

  test('Open new launcher via top menu bar with keyboard', async ({ page }) => {
    const fileNewLauncher = page.getByRole('menuitem', {
      name: 'New Launcher'
    });
    const secondLauncher = page.locator('#tab-key-2-1');

    await page.keyboard.press('Enter');

    expect(await page.menu.isOpen('File')).toBeTruthy();

    // eslint-disable-next-line no-constant-condition
    while (true) {
      await page.keyboard.press('ArrowDown');
      let fileNewLauncherClass = (
        (await fileNewLauncher.getAttribute('class')) ?? ''
      ).split(' ');
      if (fileNewLauncherClass.includes('lm-mod-active')) {
        break;
      }
    }
    await page.keyboard.press('Enter');
    let secondLauncherClass = (
      (await secondLauncher.getAttribute('class')) ?? ''
    ).split(' ');

    expect(secondLauncherClass.includes('jp-mod-current')).toBeTruthy;
  });

  test('close tab via top menu bar with keyboard', async ({ page }) => {
    const fileMenu = page.getByRole('menuitem', { name: 'File' });
    const fileNewLauncher = page.getByRole('menuitem', {
      name: 'New Launcher'
    });
    const fileCloseTab = page.getByRole('menuitem', {
      name: 'Close Tab'
    });
    const secondLauncher = page.locator('#tab-key-2-1');

    await page.keyboard.press('Enter');

    expect(await page.menu.isOpen('File')).toBeTruthy();

    // eslint-disable-next-line no-constant-condition
    while (true) {
      await page.keyboard.press('ArrowDown');
      let fileNewLauncherClass = (
        (await fileNewLauncher.getAttribute('class')) ?? ''
      ).split(' ');
      if (fileNewLauncherClass.includes('lm-mod-active')) {
        break;
      }
    }
    await page.keyboard.press('Enter');
    let secondLauncherClass = (
      (await secondLauncher.getAttribute('class')) ?? ''
    ).split(' ');

    expect(secondLauncherClass.includes('jp-mod-current')).toBeTruthy;

    // eslint-disable-next-line no-constant-condition
    while (true) {
      await page.keyboard.press('Tab');
      let fileClass = ((await fileMenu.getAttribute('class')) ?? '').split(' ');
      if (fileClass.includes('lm-mod-active')) {
        break;
      }
    }
    await page.keyboard.press('Enter');

    expect(await page.menu.isOpen('File')).toBeTruthy();

    // eslint-disable-next-line no-constant-condition
    while (true) {
      await page.keyboard.press('ArrowDown');
      let fileCloseTabClass = (
        (await fileCloseTab.getAttribute('class')) ?? ''
      ).split(' ');
      if (fileCloseTabClass.includes('lm-mod-active')) {
        break;
      }
    }
    await page.keyboard.press('Enter');

    expect(secondLauncherClass.includes('jp-mod-current')).not.toBeTruthy;
  });

  test('Close all tabs with keyboard', async ({ page }) => {
    await page.goto();
    const closeAllTabs = page.getByRole('menuitem', {
      name: 'Close All Tabs'
    });
    const fileMenu = page.getByRole('menuitem', { name: 'File' });
    const secondLauncher = page.locator('#tab-key-2-1');
    const thirdLauncher = page.locator('#tab-key-2-2');

    await page.menu.clickMenuItem('File>New Launcher');
    let secondLauncherClass = (
      (await secondLauncher.getAttribute('class')) ?? ''
    ).split(' ');
    expect(secondLauncherClass.includes('jp-mod-current')).toBeTruthy;
    await page.menu.clickMenuItem('File>New Launcher');
    let thirdLauncherClass = (
      (await thirdLauncher.getAttribute('class')) ?? ''
    ).split(' ');
    expect(thirdLauncherClass.includes('jp-mod-current')).toBeTruthy;

    // eslint-disable-next-line no-constant-condition
    while (true) {
      await page.keyboard.press('Tab');
      let fileClass = ((await fileMenu.getAttribute('class')) ?? '').split(' ');
      if (fileClass.includes('lm-mod-active')) {
        break;
      }
    }
    await page.keyboard.press('Enter');
    // eslint-disable-next-line no-constant-condition
    while (true) {
      await page.keyboard.press('ArrowDown');
      let closeAllTabsClass = (
        (await closeAllTabs.getAttribute('class')) ?? ''
      ).split(' ');
      if (closeAllTabsClass.includes('lm-mod-active')) {
        break;
      }
    }
    await page.keyboard.press('Enter');

    expect(secondLauncherClass.includes('jp-mod-current')).not.toBeTruthy;
    expect(thirdLauncherClass.includes('jp-mod-current')).not.toBeTruthy;
  });

  test('Open Activate command palette with keyboard', async ({ page }) => {
    const activateCommandPalette = page.getByRole('menuitem', {
      name: 'Activate Command Palette'
    });

    const viewMenu = page.getByRole('menuitem', { name: 'View' });

    // eslint-disable-next-line no-constant-condition
    while (true) {
      await page.keyboard.press('ArrowRight');
      let viewMenuClass = ((await viewMenu.getAttribute('class')) ?? '').split(
        ' '
      );
      if (viewMenuClass.includes('lm-mod-active')) {
        break;
      }
    }
    await page.keyboard.press('Enter');

    // eslint-disable-next-line no-constant-condition
    while (true) {
      await page.keyboard.press('ArrowDown');
      let activateCommandPaletteClass = (
        (await activateCommandPalette.getAttribute('class')) ?? ''
      ).split(' ');
      if (activateCommandPaletteClass.includes('lm-mod-active')) {
        break;
      }
    }
    await page.keyboard.press('Enter');

    await expect(page.locator('#command-palette')).not.toBeHidden();
  });

  test('Open File Browser with keyboard', async ({ page }) => {
    const fileBrowserMenu = page.getByRole('menuitem', {
      name: 'File Browser'
    });

    const viewMenu = page.getByRole('menuitem', { name: 'View', exact: true });

    // eslint-disable-next-line no-constant-condition
    while (true) {
      await page.keyboard.press('ArrowRight');
      let viewMenuClass = ((await viewMenu.getAttribute('class')) ?? '').split(
        ' '
      );
      if (viewMenuClass.includes('lm-mod-active')) {
        break;
      }
    }
    await page.keyboard.press('Enter');

    // eslint-disable-next-line no-constant-condition
    while (true) {
      await page.keyboard.press('ArrowDown');
      let fileBrowserMenuClass = (
        (await fileBrowserMenu.getAttribute('class')) ?? ''
      ).split(' ');
      if (fileBrowserMenuClass.includes('lm-mod-active')) {
        break;
      }
    }
    await page.keyboard.press('Enter');

    expect(await page.sidebar.isTabOpen('filebrowser')).toEqual(false);

    // eslint-disable-next-line no-constant-condition
    while (true) {
      await page.keyboard.press('Tab');
      let viewMenuClass = ((await viewMenu.getAttribute('class')) ?? '').split(
        ' '
      );
      if (viewMenuClass.includes('lm-mod-active')) {
        break;
      }
    }
    await page.keyboard.press('Enter');

    // eslint-disable-next-line no-constant-condition
    while (true) {
      await page.keyboard.press('ArrowDown');
      let fileBrowserMenuClass = (
        (await fileBrowserMenu.getAttribute('class')) ?? ''
      ).split(' ');
      if (fileBrowserMenuClass.includes('lm-mod-active')) {
        break;
      }
    }
    await page.keyboard.press('Enter');

    expect(await page.sidebar.isTabOpen('filebrowser')).toEqual(true);
  });

  test('Open Property Inspector with keyboard', async ({ page }) => {
    const propertyInspectorMenu = page.getByRole('menuitem', {
      name: 'Property Inspector'
    });
    const viewMenu = page.getByRole('menuitem', { name: 'View' });

    // eslint-disable-next-line no-constant-condition
    while (true) {
      await page.keyboard.press('ArrowRight');
      let viewMenuClass = ((await viewMenu.getAttribute('class')) ?? '').split(
        ' '
      );
      if (viewMenuClass.includes('lm-mod-active')) {
        break;
      }
    }
    await page.keyboard.press('Enter');

    // eslint-disable-next-line no-constant-condition
    while (true) {
      await page.keyboard.press('ArrowDown');
      let propertyInspectorClass = (
        (await propertyInspectorMenu.getAttribute('class')) ?? ''
      ).split(' ');
      if (propertyInspectorClass.includes('lm-mod-active')) {
        break;
      }
    }
    await page.keyboard.press('Enter');

    expect(await page.sidebar.isTabOpen('jp-property-inspector')).toEqual(true);
  });

  test('Open Sessions and Tabs with keyboard', async ({ page }) => {
    const sessionsAndTabsMenu = page.getByRole('menuitem', {
      name: 'Sessions and Tabs'
    });
    const viewMenu = page.getByRole('menuitem', { name: 'View' });

    // eslint-disable-next-line no-constant-condition
    while (true) {
      await page.keyboard.press('ArrowRight');
      let viewMenuClass = ((await viewMenu.getAttribute('class')) ?? '').split(
        ' '
      );
      if (viewMenuClass.includes('lm-mod-active')) {
        break;
      }
    }
    await page.keyboard.press('Enter');

    // eslint-disable-next-line no-constant-condition
    while (true) {
      await page.keyboard.press('ArrowDown');
      let runningTerminalsClass = (
        (await sessionsAndTabsMenu.getAttribute('class')) ?? ''
      ).split(' ');
      if (runningTerminalsClass.includes('lm-mod-active')) {
        break;
      }
    }
    await page.keyboard.press('Enter');

    expect(await page.sidebar.isTabOpen('jp-running-sessions')).toEqual(true);
  });

  test('Open Table of Contents with keyboard', async ({ page }) => {
    const tableOfContentsMenu = page.getByRole('menuitem', {
      name: 'Table of Contents'
    });
    const viewMenu = page.getByRole('menuitem', { name: 'View' });

    // eslint-disable-next-line no-constant-condition
    while (true) {
      await page.keyboard.press('ArrowRight');
      let viewMenuClass = ((await viewMenu.getAttribute('class')) ?? '').split(
        ' '
      );
      if (viewMenuClass.includes('lm-mod-active')) {
        break;
      }
    }
    await page.keyboard.press('Enter');

    // eslint-disable-next-line no-constant-condition
    while (true) {
      await page.keyboard.press('ArrowDown');
      let tableOfContentsClass = (
        (await tableOfContentsMenu.getAttribute('class')) ?? ''
      ).split(' ');
      if (tableOfContentsClass.includes('lm-mod-active')) {
        break;
      }
    }
    await page.keyboard.press('Enter');

    expect(await page.sidebar.isTabOpen('table-of-contents')).toEqual(true);
  });

  test('Open Debugger Panel with keyboard', async ({ page }) => {
    const debuggerPanelMenu = page.getByRole('menuitem', {
      name: 'Debugger Panel'
    });
    const viewMenu = page.getByRole('menuitem', { name: 'View' });

    // eslint-disable-next-line no-constant-condition
    while (true) {
      await page.keyboard.press('ArrowRight');
      let viewMenuClass = ((await viewMenu.getAttribute('class')) ?? '').split(
        ' '
      );
      if (viewMenuClass.includes('lm-mod-active')) {
        break;
      }
    }
    await page.keyboard.press('Enter');

    // eslint-disable-next-line no-constant-condition
    while (true) {
      await page.keyboard.press('ArrowDown');
      let debuggerPanelClass = (
        (await debuggerPanelMenu.getAttribute('class')) ?? ''
      ).split(' ');
      if (debuggerPanelClass.includes('lm-mod-active')) {
        break;
      }
    }
    await page.keyboard.press('Enter');

    expect(await page.sidebar.isTabOpen('jp-debugger-sidebar')).toEqual(true);
  });

  test('Open Extension Manager with keyboard', async ({ page }) => {
    const extensionManagerMenu = page.getByRole('menuitem', {
      name: 'Extension Manager'
    });
    const viewMenu = page.getByRole('menuitem', { name: 'View' });

    // eslint-disable-next-line no-constant-condition
    while (true) {
      await page.keyboard.press('ArrowRight');
      let viewMenuClass = ((await viewMenu.getAttribute('class')) ?? '').split(
        ' '
      );
      if (viewMenuClass.includes('lm-mod-active')) {
        break;
      }
    }
    await page.keyboard.press('Enter');

    // eslint-disable-next-line no-constant-condition
    while (true) {
      await page.keyboard.press('ArrowDown');
      let extensionManagerClass = (
        (await extensionManagerMenu.getAttribute('class')) ?? ''
      ).split(' ');
      if (extensionManagerClass.includes('lm-mod-active')) {
        break;
      }
    }
    await page.keyboard.press('Enter');

    expect(await page.sidebar.isTabOpen('extensionmanager.main-view')).toEqual(
      true
    );
  });

  test('Show Notifications with keyboard', async ({ page }) => {
    const showNotificationsMenu = page.getByRole('menuitem', {
      name: 'Show Notifications'
    });
    const viewMenu = page.getByRole('menuitem', { name: 'View' });

    // eslint-disable-next-line no-constant-condition
    while (true) {
      await page.keyboard.press('ArrowRight');
      let viewMenuClass = ((await viewMenu.getAttribute('class')) ?? '').split(
        ' '
      );
      if (viewMenuClass.includes('lm-mod-active')) {
        break;
      }
    }
    await page.keyboard.press('Enter');

    // eslint-disable-next-line no-constant-condition
    while (true) {
      await page.keyboard.press('ArrowDown');
      let showNotificationsClass = (
        (await showNotificationsMenu.getAttribute('class')) ?? ''
      ).split(' ');
      if (showNotificationsClass.includes('lm-mod-active')) {
        break;
      }
    }

    await page.keyboard.press('Enter');
    const status = page.locator('.jp-Notification-Status');
    expect(await status.getAttribute('class')).toMatch(/\s?jp-mod-selected\s?/);
    await expect(status).toHaveText('0');
    await expect(page.locator('.jp-Notification-Header')).toHaveText(
      'No notifications'
    );
  });

  test('Show Log Console with keyboard', async ({ page }) => {
    const showLogConsoleMenu = page.getByRole('menuitem', {
      name: 'Show Log Console'
    });
    const viewMenu = page.getByRole('menuitem', { name: 'View' });

    // eslint-disable-next-line no-constant-condition
    while (true) {
      await page.keyboard.press('ArrowRight');
      let viewMenuClass = ((await viewMenu.getAttribute('class')) ?? '').split(
        ' '
      );
      if (viewMenuClass.includes('lm-mod-active')) {
        break;
      }
    }
    await page.keyboard.press('Enter');

    // eslint-disable-next-line no-constant-condition
    while (true) {
      await page.keyboard.press('ArrowDown');
      let showLogConsoleClass = (
        (await showLogConsoleMenu.getAttribute('class')) ?? ''
      ).split(' ');
      if (showLogConsoleClass.includes('lm-mod-active')) {
        break;
      }
    }

    await page.keyboard.press('Enter');

    const logConsole = page.locator('#jp-down-stack');
    let logConsoleClass = (
      (await logConsole.getAttribute('class')) ?? ''
    ).split(' ');

    expect(!logConsoleClass.includes('lm-mod-hidden'));
  });
});

test.describe('Top menu keyboard navigation to Tabs @a11y', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto();
    await page.menu.clickMenuItem('File>New Launcher');
    const fileMenu = page.getByRole('menuitem', { name: 'File' });
    const tabsMenu = page.getByRole('menuitem', { name: 'Tabs' });

    // eslint-disable-next-line no-constant-condition
    while (true) {
      await page.keyboard.press('Tab');
      let fileClass = ((await fileMenu.getAttribute('class')) ?? '').split(' ');
      if (fileClass.includes('lm-mod-active')) {
        break;
      }
    }

    // eslint-disable-next-line no-constant-condition
    while (true) {
      await page.keyboard.press('ArrowRight');
      let tabsMenuClass = ((await tabsMenu.getAttribute('class')) ?? '').split(
        ' '
      );
      if (tabsMenuClass.includes('lm-mod-active')) {
        break;
      }
    }
    await page.keyboard.press('Enter');
  });

  test('Activate Next Tab with keyboard', async ({ page }) => {
    const activateNextTabMenu = page
      .getByRole('menuitem', {
        name: 'Activate Next Tab'
      })
      .nth(0);

    // eslint-disable-next-line no-constant-condition
    while (true) {
      await page.keyboard.press('ArrowDown');
      let activateNextTabClass = (
        (await activateNextTabMenu.getAttribute('class')) ?? ''
      ).split(' ');
      if (activateNextTabClass.includes('lm-mod-active')) {
        break;
      }
    }

    await page.keyboard.press('Enter');

    const firstTab = page.locator('#tab-key-2-0');
    let firstTabClass = ((await firstTab.getAttribute('class')) ?? '').split(
      ' '
    );

    expect(firstTabClass.includes('jp-mod-current'));
  });

  test('Activate Previous Tab with keyboard', async ({ page }) => {
    const activatePreviousTabMenu = page
      .getByRole('menuitem', {
        name: 'Activate Previous Tab'
      })
      .nth(0);

    // eslint-disable-next-line no-constant-condition
    while (true) {
      await page.keyboard.press('ArrowDown');
      let activatePreviousTabClass = (
        (await activatePreviousTabMenu.getAttribute('class')) ?? ''
      ).split(' ');
      if (activatePreviousTabClass.includes('lm-mod-active')) {
        break;
      }
    }

    await page.keyboard.press('Enter');

    const firstTab = page.locator('#tab-key-2-0');
    let firstTabClass = ((await firstTab.getAttribute('class')) ?? '').split(
      ' '
    );

    expect(firstTabClass.includes('jp-mod-current'));
  });

  test('Activate Previously used Tab with keyboard', async ({ page }) => {
    const previousUsedTabMenu = page
      .getByRole('menuitem', {
        name: 'Activate Previously Used Tab'
      })
      .nth(0);

    // eslint-disable-next-line no-constant-condition
    while (true) {
      await page.keyboard.press('ArrowDown');
      let previousUsedTabClass = (
        (await previousUsedTabMenu.getAttribute('class')) ?? ''
      ).split(' ');
      if (previousUsedTabClass.includes('lm-mod-active')) {
        break;
      }
    }

    await page.keyboard.press('Enter');

    const firstTab = page.locator('#tab-key-2-0');
    let firstTabClass = ((await firstTab.getAttribute('class')) ?? '').split(
      ' '
    );

    expect(firstTabClass.includes('jp-mod-current'));
  });
});

const settingsPaths = [
  'Theme',
  'Console Run Keystroke',
  'Text Editor Theme',
  'Text Editor Indentation',
  'Terminal Theme'
];

test.describe('Top menu keyboard navigation to Settings @a11y', () => {
  settingsPaths.forEach(settingsPath => {
    test(`Open menu item ${settingsPath}`, async ({ page }) => {
      await page.goto();
      const fileMenu = page.getByRole('menuitem', { name: 'File' });

      // eslint-disable-next-line no-constant-condition
      while (true) {
        await page.keyboard.press('Tab');
        let fileClass = ((await fileMenu.getAttribute('class')) ?? '').split(
          ' '
        );
        if (fileClass.includes('lm-mod-active')) {
          break;
        }
      }
      const settingsMenu = page.getByRole('menuitem', { name: 'Settings' });

      // eslint-disable-next-line no-constant-condition
      while (true) {
        await page.keyboard.press('ArrowRight');
        let settingsClass = (
          (await settingsMenu.getAttribute('class')) ?? ''
        ).split(' ');
        if (settingsClass.includes('lm-mod-active')) {
          break;
        }
      }

      await page.keyboard.press('Enter');

      const settingsSubMenu = page
        .locator('[data-type="submenu"]', {
          hasText: settingsPath
        })
        .nth(0);

      // eslint-disable-next-line no-constant-condition
      while (true) {
        await page.keyboard.press('ArrowDown');
        let settingsSubMenuClass = (
          (await settingsSubMenu.getAttribute('class')) ?? ''
        ).split(' ');
        if (settingsSubMenuClass.includes('lm-mod-active')) {
          break;
        }
      }

      await page.keyboard.press('Enter');

      expect(await page.menu.isOpen(`Settings>${settingsPath}`)).toBeTruthy();
    });
  });
});
