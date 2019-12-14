// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect } from 'chai';

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
        expect(menu).to.be.an.instanceof(MainMenu);
      });
    });

    describe('#addMenu()', () => {
      it('should add a new menu', () => {
        const menu = new Menu({ commands });
        mainMenu.addMenu(menu);
        expect(find(mainMenu.menus, m => menu === m) !== undefined).to.equal(
          true
        );
      });

      it('should take a rank as an option', () => {
        const menu1 = new Menu({ commands });
        const menu2 = new Menu({ commands });
        mainMenu.addMenu(menu1, { rank: 300 });
        mainMenu.addMenu(menu2, { rank: 200 });
        expect(ArrayExt.firstIndexOf(mainMenu.menus, menu1)).to.equal(6);
        expect(ArrayExt.firstIndexOf(mainMenu.menus, menu2)).to.equal(5);
      });
    });

    describe('#fileMenu', () => {
      it('should be a FileMenu', () => {
        expect(mainMenu.fileMenu).to.be.an.instanceof(FileMenu);
      });

      it('should be the first menu', () => {
        expect(
          ArrayExt.firstIndexOf(mainMenu.menus, mainMenu.fileMenu.menu)
        ).to.equal(0);
      });
    });

    describe('#editMenu', () => {
      it('should be a EditMenu', () => {
        expect(mainMenu.editMenu).to.be.an.instanceof(EditMenu);
      });

      it('should be the second menu', () => {
        expect(
          ArrayExt.firstIndexOf(mainMenu.menus, mainMenu.editMenu.menu)
        ).to.equal(1);
      });
    });

    describe('#viewMenu', () => {
      it('should be a ViewMenu', () => {
        expect(mainMenu.viewMenu).to.be.an.instanceof(ViewMenu);
      });

      it('should be the third menu', () => {
        expect(
          ArrayExt.firstIndexOf(mainMenu.menus, mainMenu.viewMenu.menu)
        ).to.equal(2);
      });
    });

    describe('#runMenu', () => {
      it('should be a RunMenu', () => {
        expect(mainMenu.runMenu).to.be.an.instanceof(RunMenu);
      });

      it('should be the fourth menu', () => {
        expect(
          ArrayExt.firstIndexOf(mainMenu.menus, mainMenu.runMenu.menu)
        ).to.equal(3);
      });
    });

    describe('#kernelMenu', () => {
      it('should be a KernelMenu', () => {
        expect(mainMenu.kernelMenu).to.be.an.instanceof(KernelMenu);
      });

      it('should be the fifth menu', () => {
        expect(
          ArrayExt.firstIndexOf(mainMenu.menus, mainMenu.kernelMenu.menu)
        ).to.equal(4);
      });
    });

    describe('#tabsMenu', () => {
      it('should be a TabsMenu', () => {
        expect(mainMenu.tabsMenu).to.be.an.instanceof(TabsMenu);
      });

      it('should be the sixth menu', () => {
        expect(
          ArrayExt.firstIndexOf(mainMenu.menus, mainMenu.tabsMenu.menu)
        ).to.equal(5);
      });
    });

    describe('#settingsMenu', () => {
      it('should be a SettingsMenu', () => {
        expect(mainMenu.settingsMenu).to.be.an.instanceof(SettingsMenu);
      });

      it('should be the seventh menu', () => {
        expect(
          ArrayExt.firstIndexOf(mainMenu.menus, mainMenu.settingsMenu.menu)
        ).to.equal(6);
      });
    });

    describe('#helpMenu', () => {
      it('should be a HelpMenu', () => {
        expect(mainMenu.helpMenu).to.be.an.instanceof(HelpMenu);
      });

      it('should be the eighth menu', () => {
        expect(
          ArrayExt.firstIndexOf(mainMenu.menus, mainMenu.helpMenu.menu)
        ).to.equal(7);
      });
    });
  });
});
