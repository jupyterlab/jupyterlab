// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  CommandRegistry
} from '@phosphor/commands';

import {
  HelpMenu, IHelpMenu
} from '@jupyterlab/mainmenu';


describe('@jupyterlab/mainmenu', () => {

  describe('HelpMenu', () => {
    
    let commands: CommandRegistry;
    let menu: HelpMenu;

    before(() => {
      commands = new CommandRegistry();
    });

    beforeEach(() => {
      menu = new HelpMenu({ commands });
    });

    afterEach(() => {
      menu.dispose();
    });

    describe('#constructor()', () => {
      it('should construct a new help menu', () => {
        expect(menu).to.be.an(HelpMenu);
        expect(menu.title.label).to.be('Help');
      });

    });

  });

});
