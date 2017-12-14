// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  find, ArrayExt
} from '@phosphor/algorithm';

import {
  CommandRegistry
} from '@phosphor/commands';

import {
  Menu
} from '@phosphor/widgets';

import {
  MainMenu, EditMenu, FileMenu, HelpMenu,
  KernelMenu, RunMenu, SettingsMenu, TabsMenu, ViewMenu
} from '@jupyterlab/mainmenu';


describe('@jupyterlab/mainmenu', () => {

  describe('MainMenu', () => {

    let commands: CommandRegistry;
    let mainMenu: MainMenu;

    before(() => {
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
        expect(menu).to.be.a(MainMenu);
      });

    });


    describe('#addMenu()', () => {

      it('should add a new menu', () => {
        const menu = new Menu({ commands });
        mainMenu.addMenu(menu);
        expect(find(mainMenu.menus, m => menu === m) !== undefined).to.be(true);
      });

      it('should take a rank as an option', () => {
        const menu1 = new Menu({ commands });
        const menu2 = new Menu({ commands });
        mainMenu.addMenu(menu1, { rank: 300 });
        mainMenu.addMenu(menu2, { rank: 200 });
        expect(ArrayExt.firstIndexOf(mainMenu.menus, menu1)).to.be(6);
        expect(ArrayExt.firstIndexOf(mainMenu.menus, menu2)).to.be(5);
      });

    });

    describe('#fileMenu', () => {

      it('should be a FileMenu', () => {
        expect(mainMenu.fileMenu).to.be.a(FileMenu);
      });

      it('should be the first menu', () => {
        expect(ArrayExt.firstIndexOf(
          mainMenu.menus, mainMenu.fileMenu.menu)).to.be(0);
      });

    });

    describe('#editMenu', () => {

      it('should be a EditMenu', () => {
        expect(mainMenu.editMenu).to.be.a(EditMenu);
      });

      it('should be the second menu', () => {
        expect(ArrayExt.firstIndexOf(mainMenu.menus,
                                     mainMenu.editMenu.menu)).to.be(1);
      });

    });

    describe('#viewMenu', () => {

      it('should be a ViewMenu', () => {
        expect(mainMenu.viewMenu).to.be.a(ViewMenu);
      });

      it('should be the third menu', () => {
        expect(ArrayExt.firstIndexOf(mainMenu.menus,
                                     mainMenu.viewMenu.menu)).to.be(2);
      });

    });

    describe('#runMenu', () => {

      it('should be a RunMenu', () => {
        expect(mainMenu.runMenu).to.be.a(RunMenu);
      });

      it('should be the fourth menu', () => {
        expect(ArrayExt.firstIndexOf(mainMenu.menus,
                                     mainMenu.runMenu.menu)).to.be(3);
      });

    });

    describe('#kernelMenu', () => {

      it('should be a KernelMenu', () => {
        expect(mainMenu.kernelMenu).to.be.a(KernelMenu);
      });

      it('should be the fifth menu', () => {
        expect(ArrayExt.firstIndexOf(mainMenu.menus,
                                     mainMenu.kernelMenu.menu)).to.be(4);
      });

    });

    describe('#tabsMenu', () => {

      it('should be a TabsMenu', () => {
        expect(mainMenu.tabsMenu).to.be.a(TabsMenu);
      });

      it('should be the sixth menu', () => {
        expect(ArrayExt.firstIndexOf(mainMenu.menus,
                                     mainMenu.tabsMenu.menu)).to.be(5);
      });

    });

    describe('#settingsMenu', () => {

      it('should be a SettingsMenu', () => {
        expect(mainMenu.settingsMenu).to.be.a(SettingsMenu);
      });

      it('should be the seventh menu', () => {
        expect(ArrayExt.firstIndexOf(mainMenu.menus,
                                     mainMenu.settingsMenu.menu)).to.be(6);
      });

    });

    describe('#helpMenu', () => {

      it('should be a HelpMenu', () => {
        expect(mainMenu.helpMenu).to.be.a(HelpMenu);
      });

      it('should be the eighth menu', () => {
        expect(ArrayExt.firstIndexOf(mainMenu.menus,
                                     mainMenu.helpMenu.menu)).to.be(7);
      });

    });


  });

});
