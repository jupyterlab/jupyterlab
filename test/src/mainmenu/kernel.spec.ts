// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  CommandRegistry
} from '@phosphor/commands';

import {
  KernelMenu, IKernelMenu
} from '@jupyterlab/mainmenu';


describe('@jupyterlab/mainmenu', () => {

  describe('KernelMenu', () => {
    
    let commands: CommandRegistry;
    let menu: KernelMenu;

    before(() => {
      commands = new CommandRegistry();
    });

    beforeEach(() => {
      menu = new KernelMenu({ commands });
    });

    afterEach(() => {
      menu.dispose();
    });

    describe('#constructor()', () => {
      it('should construct a new kernel menu', () => {
        expect(menu).to.be.an(KernelMenu);
      });

    });

  });

});
