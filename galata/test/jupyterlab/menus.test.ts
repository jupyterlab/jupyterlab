// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect, galata, test } from '@jupyterlab/galata';
import type { ISettingRegistry } from '@jupyterlab/settingregistry';

const menuPaths = [
  'File',
  'File>New',
  'File>Workspaces',
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
      await page.menu.openLocator(menuPath);
      expect(await page.menu.isOpen(menuPath)).toBeTruthy();
      const imageName = `opened-menu-${menuPath.replace(/>/g, '-')}.png`;
      const menu = await page.menu.getOpenMenuLocator();
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
    await page.menu.openLocator(menuPath);
    expect(await page.menu.isOpen(menuPath)).toBeTruthy();

    const imageName = `opened-menu-settings-language.png`;
    const menu = await page.menu.getOpenMenuLocator();
    expect(await menu.screenshot()).toMatchSnapshot(imageName.toLowerCase());
  });

  test('Close all menus', async ({ page }) => {
    await page.goto();
    await page.menu.openLocator('File>New');
    await page.menu.closeAll();
    expect(await page.menu.isAnyOpen()).toEqual(false);
  });

  test('Click a menu item in a nested submenu', async ({ page }) => {
    await page.goto();
    await page.menu.clickMenuItem('View>Appearance>Activity Bar Position>Top');
    await expect(page.locator('.jp-SideBar[data-side="top"]')).toHaveCount(2);
  });

  test('Export menu shows guidance when no format is available', async ({
    page
  }) => {
    await page.route(/\/api\/nbconvert(\?.*)?$/, (route, request) => {
      if (request.method() === 'GET') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: '{}'
        });
      }

      return route.continue();
    });

    await page.goto();
    await page.notebook.createNew();

    await page.menu.openLocator('File>Save and Export Notebook As');
    const exportMenu = await page.menu.getOpenMenuLocator();
    expect(exportMenu).toBeDefined();
    await expect(
      exportMenu!.getByRole('menuitem', {
        name: 'Enable notebook exports'
      })
    ).toHaveCount(1);
    await expect(exportMenu!.getByRole('menuitem')).toHaveCount(1);
  });
});

test.describe('Collapsed main menu', () => {
  test('Collapse the main menu into a menu button', async ({ page }) => {
    await page.menu.clickMenuItem('View>Appearance>Collapse Main Menu');

    await expect(page.locator('#jp-MainMenu')).toBeHidden();
    await expect(
      page.getByRole('menuitem', { name: 'Main Menu', exact: true })
    ).toBeVisible();
  });

  test('Open the menu button', async ({ page }) => {
    await page.menu.clickMenuItem('View>Appearance>Collapse Main Menu');

    const menu = await page.menu.openLocator('Main Menu');
    const buttonBox = (await page
      .getByRole('menuitem', { name: 'Main Menu', exact: true })
      .boundingBox())!;
    const menuBox = (await menu!.boundingBox())!;
    expect(
      await page.screenshot({
        clip: {
          x: buttonBox.x,
          y: buttonBox.y,
          width: menuBox.x + menuBox.width - buttonBox.x,
          height: menuBox.y + menuBox.height - buttonBox.y
        }
      })
    ).toMatchSnapshot('opened-collapsed-main-menu.png');
  });

  test('Open a menu from the menu button', async ({ page }) => {
    await page.menu.clickMenuItem('View>Appearance>Collapse Main Menu');

    await page.menu.openLocator('Main Menu>File');
    expect(await page.menu.isOpen('Main Menu>File')).toBeTruthy();
  });

  test('Expand the main menu from the menu button', async ({ page }) => {
    await page.menu.clickMenuItem('View>Appearance>Collapse Main Menu');
    await page.menu.clickMenuItem(
      'Main Menu>View>Appearance>Collapse Main Menu'
    );

    await expect(page.locator('#jp-MainMenu')).toBeVisible();
    await expect(
      page.getByRole('menuitem', { name: 'Main Menu', exact: true })
    ).toBeHidden();
  });

  test('Keep the main menu collapsed after reload', async ({ page }) => {
    await Promise.all([
      // Wait for the setting to be saved
      page.waitForResponse(
        response =>
          response.request().method() === 'PUT' &&
          /api\/settings\/@jupyterlab\/mainmenu-extension:plugin/.test(
            response.request().url()
          )
      ),
      page.menu.clickMenuItem('View>Appearance>Collapse Main Menu')
    ]);

    await page.reload();

    await expect(page.locator('#jp-MainMenu')).toBeHidden();
    await expect(
      page.getByRole('menuitem', { name: 'Main Menu', exact: true })
    ).toBeVisible();
  });
});

test.describe('Automatically collapsed main menu', () => {
  test.use({
    mockSettings: {
      ...galata.DEFAULT_SETTINGS,
      '@jupyterlab/mainmenu-extension:plugin': {
        ...galata.DEFAULT_SETTINGS['@jupyterlab/mainmenu-extension:plugin'],
        collapse: 'auto'
      }
    }
  });

  test('Collapse the main menu when it does not fit', async ({ page }) => {
    await expect(page.locator('#jp-MainMenu')).toBeVisible();

    await page.setViewportSize({ width: 400, height: 768 });

    await expect(page.locator('#jp-MainMenu')).toBeHidden();
    await expect(
      page.getByRole('menuitem', { name: 'Main Menu', exact: true })
    ).toBeVisible();

    await page.setViewportSize({ width: 1024, height: 768 });

    await expect(page.locator('#jp-MainMenu')).toBeVisible();
    await expect(
      page.getByRole('menuitem', { name: 'Main Menu', exact: true })
    ).toBeHidden();
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
  // eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check
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
