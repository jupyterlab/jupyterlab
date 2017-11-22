// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  ArrayExt
} from '@phosphor/algorithm';

import {
  CommandRegistry
} from '@phosphor/commands';

import {
  JupyterLabMenu
} from '@jupyterlab/mainmenu';


describe('@jupyterlab/mainmenu', () => {

  describe('JupyterLabMenu', () => {
    
    let commands: CommandRegistry;
    let menu: JupyterLabMenu;

    before(() => {
      commands = new CommandRegistry();
      commands.addCommand('run1', {
        label: 'Run 1',
        execute: () => void 0 
      });
      commands.addCommand('run2', {
        label: 'Run 2',
        execute: () => void 0 
      });
      commands.addCommand('run3', {
        label: 'Run 3',
        execute: () => void 0 
      });
      commands.addCommand('run4', {
        label: 'Run 4',
        execute: () => void 0
      });
    });

    beforeEach(() => {
      menu = new JupyterLabMenu({ commands });
    });

    afterEach(() => {
      menu.dispose();
    });

    describe('#constructor()', () => {
      it('should construct a new main menu', () => {
        expect(menu).to.be.a(JupyterLabMenu);
      });

    });

    describe('#addGroup()', () => {

      it('should add a new group to the menu', () => {
        menu.addGroup([ { command: 'run1'}, { command: 'run2' }]);

        let idx1 = ArrayExt.findFirstIndex(menu.items, m => m.command === 'run1');
        let idx2 = ArrayExt.findFirstIndex(menu.items, m => m.command === 'run2');

        expect(idx1 === -1).to.be(false);
        expect(idx2 === -1).to.be(false);
        expect(idx1 > idx2).to.be(false);
      });

      it('should take a rank as an option', () => {
        menu.addGroup([ { command: 'run1'}, { command: 'run2' }], 2);
        menu.addGroup([ { command: 'run3'}, { command: 'run4' }], 1);

        let idx1 = ArrayExt.findFirstIndex(menu.items, m => m.command === 'run1');
        let idx2 = ArrayExt.findFirstIndex(menu.items, m => m.command === 'run2');
        let idx3 = ArrayExt.findFirstIndex(menu.items, m => m.command === 'run3');
        let idx4 = ArrayExt.findFirstIndex(menu.items, m => m.command === 'run4');
        expect(idx3 < idx4).to.be(true);
        expect(idx4 < idx1).to.be(true);
        expect(idx1 < idx2).to.be(true);
      });

    });

  });

});
