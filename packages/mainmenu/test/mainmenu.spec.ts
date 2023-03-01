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
import { Menu } from '@lumino/widgets';

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
