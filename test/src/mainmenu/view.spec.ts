// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  CommandRegistry
} from '@phosphor/commands';

import {
  ViewMenu, IViewMenu
} from '@jupyterlab/mainmenu';


describe('@jupyterlab/mainmenu', () => {

  describe('ViewMenu', () => {
    
    let commands: CommandRegistry;
    let menu: ViewMenu;

    before(() => {
      commands = new CommandRegistry();
    });

    beforeEach(() => {
      menu = new ViewMenu({ commands });
    });

    afterEach(() => {
      menu.dispose();
    });

    describe('#constructor()', () => {
      it('should construct a new view menu', () => {
        expect(menu).to.be.an(ViewMenu);
      });

    });

  });

});
