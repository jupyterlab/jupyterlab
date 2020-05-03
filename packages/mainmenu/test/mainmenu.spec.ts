// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import 'jest';

import { find, ArrayExt } from '@lumino/algorithm';

import { CommandRegistry } from '@lumino/commands';

import { Menu } from '@lumino/widgets';

import {
  MainMenu,
  EditMenu,
  FileMenu,
  HelpMenu,
  KernelMenu,
  RunMenu,
  SettingsMenu,
  TabsMenu,
  ViewMenu
} from '@jupyterlab/mainmenu';

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
        mainMenu.addMenu(menu1, { rank: 300 });
        mainMenu.addMenu(menu2, { rank: 200 });
        expect(ArrayExt.firstIndexOf(mainMenu.menus, menu1)).toBe(6);
        expect(ArrayExt.firstIndexOf(mainMenu.menus, menu2)).toBe(5);
      });
    });

    describe('#fileMenu', () => {
      it('should be a FileMenu', () => {
        expect(mainMenu.fileMenu).toBeInstanceOf(FileMenu);
      });

      it('should be the first menu', () => {
        expect(
          ArrayExt.firstIndexOf(mainMenu.menus, mainMenu.fileMenu.menu)
        ).toBe(0);
      });
    });

    describe('#editMenu', () => {
      it('should be a EditMenu', () => {
        expect(mainMenu.editMenu).toBeInstanceOf(EditMenu);
      });

      it('should be the second menu', () => {
        expect(
          ArrayExt.firstIndexOf(mainMenu.menus, mainMenu.editMenu.menu)
        ).toBe(1);
      });
    });

    describe('#viewMenu', () => {
      it('should be a ViewMenu', () => {
        expect(mainMenu.viewMenu).toBeInstanceOf(ViewMenu);
      });

      it('should be the third menu', () => {
        expect(
          ArrayExt.firstIndexOf(mainMenu.menus, mainMenu.viewMenu.menu)
        ).toBe(2);
      });
    });

    describe('#runMenu', () => {
      it('should be a RunMenu', () => {
        expect(mainMenu.runMenu).toBeInstanceOf(RunMenu);
      });

      it('should be the fourth menu', () => {
        expect(
          ArrayExt.firstIndexOf(mainMenu.menus, mainMenu.runMenu.menu)
        ).toBe(3);
      });
    });

    describe('#kernelMenu', () => {
      it('should be a KernelMenu', () => {
        expect(mainMenu.kernelMenu).toBeInstanceOf(KernelMenu);
      });

      it('should be the fifth menu', () => {
        expect(
          ArrayExt.firstIndexOf(mainMenu.menus, mainMenu.kernelMenu.menu)
        ).toBe(4);
      });
    });

    describe('#tabsMenu', () => {
      it('should be a TabsMenu', () => {
        expect(mainMenu.tabsMenu).toBeInstanceOf(TabsMenu);
      });

      it('should be the sixth menu', () => {
        expect(
          ArrayExt.firstIndexOf(mainMenu.menus, mainMenu.tabsMenu.menu)
        ).toBe(5);
      });
    });

    describe('#settingsMenu', () => {
      it('should be a SettingsMenu', () => {
        expect(mainMenu.settingsMenu).toBeInstanceOf(SettingsMenu);
      });

      it('should be the seventh menu', () => {
        expect(
          ArrayExt.firstIndexOf(mainMenu.menus, mainMenu.settingsMenu.menu)
        ).toBe(6);
      });
    });

    describe('#helpMenu', () => {
      it('should be a HelpMenu', () => {
        expect(mainMenu.helpMenu).toBeInstanceOf(HelpMenu);
      });

      it('should be the eighth menu', () => {
        expect(
          ArrayExt.firstIndexOf(mainMenu.menus, mainMenu.helpMenu.menu)
        ).toBe(7);
      });
    });
  });
});
