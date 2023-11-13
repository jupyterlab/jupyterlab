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
      await page.keyboard.press('Shift+Tab');
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

  // test('Open file > New with keyboard', async ({ page }) => {
  //   await page.goto();
  //   const fileMenu = page.getByRole('menuitem', { name: 'File' });
  //   const fileNew = page.getByRole('menuitem', {
  //     name: 'New'
  //   });
  //   const secondLauncher = page.locator('#tab-key-2-1');

  //   // eslint-disable-next-line no-constant-condition
  //   while (true) {
  //     await page.keyboard.press('Shift+Tab');
  //     let fileClass = ((await fileMenu.getAttribute('class')) ?? '').split(' ');
  //     if (fileClass.includes('lm-mod-active')) {
  //       break;
  //     }
  //   }
  //   await page.keyboard.press('Enter');

  //   expect(await page.menu.isOpen('File')).toBeTruthy();

  //   // eslint-disable-next-line no-constant-condition
  //   while (true) {
  //     await page.keyboard.press('ArrowDown');
  //     let fileNewClass = ((await fileNew.getAttribute('class')) ?? '').split(
  //       ' '
  //     );
  //     if (fileNewClass.includes('lm-mod-active')) {
  //       break;
  //     }
  //   }
  //   await page.keyboard.press('Enter');
  //   const menuPath = 'File>New';
  //   expect(await page.menu.isOpen(menuPath)).toBeTruthy();
  // });

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
      await page.keyboard.press('Shift+Tab');
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
  });
});

// test("navigate to close all tabs with keyboard", async ({ page }) => {
//   await page.goto();
//   for (let i = 0; i < 3; i++) {
//     await page.keyboard.press("Shift+Tab");
//   }
//   await page.keyboard.press("Enter");
//   for (let i = 0; i < 4; i++) {
//     await page.keyboard.press("ArrowDown");
//   }
//   await page.keyboard.press("Enter");
//   await expect(page.locator("#tab-key-2-1")).toBeFocused();
// });

// test("navigate to change to Dark mode with keyboard", async ({ page }) => {
//   await page.goto();
//   for (let i = 0; i < 3; i++) {
//     await page.keyboard.press("Shift+Tab");
//   }
//   for (let i = 0; i < 6; i++) {
//     await page.keyboard.press("ArrowRight");
//   }
//   for (let i = 0; i < 3; i++) {
//     await page.keyboard.press("Enter");
//   }
//   const locator = page.locator("body");
//   await expect(locator).toHaveJSProperty("data-jp-theme-light", false);
// });

// test("navigate to open command pallette with keyboard", async ({ page }) => {
//   await page.goto();
//   for (let i = 0; i < 3; i++) {
//     await page.keyboard.press("Shift+Tab");
//   }
//   for (let i = 0; i < 2; i++) {
//     await page.keyboard.press("ArrowRight");
//   }
//   for (let i = 0; i < 2; i++) {
//     await page.keyboard.press("Enter");
//   }

//   await expect(page.locator("#modal-command-palette")).toHaveClass(
//     "lm-Widget lm-Panel jp-ModalCommandPalette lm-mod-hidden"
//   );
// });
