// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  EditMenu,
  FileMenu,
  HelpMenu,
  KernelMenu,
  MainMenu,
  RunMenu,
  SettingsMenu,
  TabsMenu,
  ViewMenu
} from '@jupyterlab/mainmenu';
import { ArrayExt, find } from '@lumino/algorithm';
import { CommandRegistry } from '@lumino/commands';
import { Menu, Widget } from '@lumino/widgets';

describe('@jupyterlab/mainmenu', () => {
  describe('MainMenu', () => {
    let commands: CommandRegistry;
    let mainMenu: MainMenu;

    beforeAll(() => {
      commands = new CommandRegistry();
    });

    beforeEach(() => {
      mainMenu = new MainMenu(commands);
    });

    afterEach(() => {
      mainMenu.dispose();
    });

    describe('#constructor()', () => {
      it('should construct a new main menu', () => {
        const menu = new MainMenu(new CommandRegistry());
        expect(menu).toBeInstanceOf(MainMenu);
      });
    });

    describe('#addMenu()', () => {
      it('should add a new menu', () => {
        const menu = new Menu({ commands });
        mainMenu.addMenu(menu);
        expect(find(mainMenu.menus, m => menu === m) !== undefined).toBe(true);
      });

      it('should take a rank as an option', () => {
        const menu1 = new Menu({ commands });
        const menu2 = new Menu({ commands });
        mainMenu.addMenu(menu1, false, { rank: 300 });
        mainMenu.addMenu(menu2, false, { rank: 200 });
        expect(
          ArrayExt.firstIndexOf(mainMenu.menus, menu1) >
            ArrayExt.firstIndexOf(mainMenu.menus, menu2)
        ).toBe(true);
      });
    });

    describe('#collapsedMenuBar', () => {
      it('should be hidden by default', () => {
        expect(mainMenu.collapsedMenuBar.isHidden).toBe(true);
      });

      it('should list the menus as submenus, in rank order', () => {
        const menu1 = new Menu({ commands });
        const menu2 = new Menu({ commands });
        mainMenu.addMenu(menu1, false, { rank: 300 });
        mainMenu.addMenu(menu2, false, { rank: 200 });
        const items = mainMenu.collapsedMenuBar.menus[0].items;
        expect(items.map(item => item.submenu)).toEqual([menu2, menu1]);
      });

      it('should drop disposed menus', () => {
        const menu = new Menu({ commands });
        mainMenu.addMenu(menu);
        menu.dispose();
        expect(mainMenu.collapsedMenuBar.menus[0].items).toHaveLength(0);
      });
    });

    describe('#collapseMode', () => {
      it('should be never by default', () => {
        expect(mainMenu.collapseMode).toBe('never');
        expect(mainMenu.collapsed).toBe(false);
      });

      it('should swap the main menu for the collapsed menu bar', () => {
        mainMenu.collapseMode = 'always';
        expect(mainMenu.collapsed).toBe(true);
        expect(mainMenu.isHidden).toBe(true);
        expect(mainMenu.collapsedMenuBar.isHidden).toBe(false);

        mainMenu.collapseMode = 'never';
        expect(mainMenu.collapsed).toBe(false);
        expect(mainMenu.isHidden).toBe(false);
        expect(mainMenu.collapsedMenuBar.isHidden).toBe(true);
      });
    });

    describe('#collapsedChanged', () => {
      it('should be emitted when the main menu is collapsed or expanded', () => {
        const changes: boolean[] = [];
        mainMenu.collapsedChanged.connect((_, collapsed) => {
          changes.push(collapsed);
        });

        mainMenu.collapseMode = 'always';
        mainMenu.collapseMode = 'never';
        expect(changes).toEqual([true, false]);
      });
    });

    describe('#openActiveMenu()', () => {
      it('should open the active menu from the collapsed menu bar', () => {
        const command = commands.addCommand('test:main-menu', {
          label: 'Test',
          execute: () => undefined
        });
        const menu = new Menu({ commands });
        menu.addItem({ command: 'test:main-menu' });
        mainMenu.addMenu(menu);
        Widget.attach(mainMenu, document.body);
        Widget.attach(mainMenu.collapsedMenuBar, document.body);
        mainMenu.collapseMode = 'always';

        mainMenu.activeMenu = menu;
        mainMenu.openActiveMenu();

        const collapsedMenu = mainMenu.collapsedMenuBar.menus[0];
        expect(collapsedMenu.isAttached).toBe(true);
        expect(collapsedMenu.childMenu).toBe(menu);
        expect(menu.isAttached).toBe(true);
        expect(mainMenu.activeIndex).toBe(-1);

        menu.dispose();
        command.dispose();
      });
    });

    describe('#fileMenu', () => {
      it('should be a FileMenu', () => {
        expect(mainMenu.fileMenu).toBeInstanceOf(FileMenu);
      });

      it('has a default rank of 1', () => {
        expect(mainMenu.fileMenu.rank).toEqual(1);
      });
    });

    describe('#editMenu', () => {
      it('should be a EditMenu', () => {
        expect(mainMenu.editMenu).toBeInstanceOf(EditMenu);
      });

      it('has a default rank of 2', () => {
        expect(mainMenu.editMenu.rank).toEqual(2);
      });
    });

    describe('#viewMenu', () => {
      it('should be a ViewMenu', () => {
        expect(mainMenu.viewMenu).toBeInstanceOf(ViewMenu);
      });

      it('has a default rank of 3', () => {
        expect(mainMenu.viewMenu.rank).toEqual(3);
      });
    });

    describe('#runMenu', () => {
      it('should be a RunMenu', () => {
        expect(mainMenu.runMenu).toBeInstanceOf(RunMenu);
      });

      it('has a default rank of 4', () => {
        expect(mainMenu.runMenu.rank).toEqual(4);
      });
    });

    describe('#kernelMenu', () => {
      it('should be a KernelMenu', () => {
        expect(mainMenu.kernelMenu).toBeInstanceOf(KernelMenu);
      });

      it('has a default rank of 5', () => {
        expect(mainMenu.kernelMenu.rank).toEqual(5);
      });
    });

    describe('#tabsMenu', () => {
      it('should be a TabsMenu', () => {
        expect(mainMenu.tabsMenu).toBeInstanceOf(TabsMenu);
      });

      it('has a default rank of 500', () => {
        expect(mainMenu.tabsMenu.rank).toEqual(500);
      });
    });

    describe('#settingsMenu', () => {
      it('should be a SettingsMenu', () => {
        expect(mainMenu.settingsMenu).toBeInstanceOf(SettingsMenu);
      });

      it('has a default rank of 999', () => {
        expect(mainMenu.settingsMenu.rank).toEqual(999);
      });
    });

    describe('#helpMenu', () => {
      it('should be a HelpMenu', () => {
        expect(mainMenu.helpMenu).toBeInstanceOf(HelpMenu);
      });

      it('has a default rank of 1000', () => {
        expect(mainMenu.helpMenu.rank).toEqual(1000);
      });
    });
  });
});
