// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  CommandRegistry
} from '@phosphor/commands';

import {
  RunMenu, IRunMenu
} from '@jupyterlab/mainmenu';


describe('@jupyterlab/mainmenu', () => {

  describe('RunMenu', () => {
    
    let commands: CommandRegistry;
    let menu: RunMenu;

    before(() => {
      commands = new CommandRegistry();
    });

    beforeEach(() => {
      menu = new RunMenu({ commands });
    });

    afterEach(() => {
      menu.dispose();
    });

    describe('#constructor()', () => {
      it('should construct a new run menu', () => {
        expect(menu).to.be.an(RunMenu);
      });

    });

  });

});
