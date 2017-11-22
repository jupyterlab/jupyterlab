// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  CommandRegistry
} from '@phosphor/commands';

import {
  FileMenu, IFileMenu
} from '@jupyterlab/mainmenu';


describe('@jupyterlab/mainmenu', () => {

  describe('FileMenu', () => {
    
    let commands: CommandRegistry;
    let menu: FileMenu;

    before(() => {
      commands = new CommandRegistry();
    });

    beforeEach(() => {
      menu = new FileMenu({ commands });
    });

    afterEach(() => {
      menu.dispose();
    });

    describe('#constructor()', () => {
      it('should construct a new file menu', () => {
        expect(menu).to.be.an(FileMenu);
      });

    });

  });

});
