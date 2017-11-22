// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  CommandRegistry
} from '@phosphor/commands';

import {
  Widget
} from '@phosphor/widgets';

import {
  InstanceTracker
} from '@jupyterlab/apputils';

import {
  FileMenu, IFileMenu
} from '@jupyterlab/mainmenu';

class Wodget extends Widget {
  state: string;
}

describe('@jupyterlab/mainmenu', () => {

  describe('FileMenu', () => {
    
    let commands: CommandRegistry;
    let menu: FileMenu;
    let tracker: InstanceTracker<Wodget>;
    let wodget = new Wodget();

    before(() => {
      commands = new CommandRegistry();
    });

    beforeEach(() => {
      menu = new FileMenu({ commands });
      tracker = new InstanceTracker<Wodget>({ namespace: 'wodget' });
      tracker.add(wodget);
    });

    afterEach(() => {
      menu.dispose();
      tracker.dispose();
      wodget.dispose();
    });

    describe('#constructor()', () => {

      it('should construct a new file menu', () => {
        expect(menu).to.be.an(FileMenu);
        expect(menu.title.label).to.be('File');
      });

    });

    describe('#newMenu', () => {

      it('should be a submenu for `New...` commands', () => {
        expect(menu.newMenu.title.label).to.be('New');
      });

    });

    describe('#cleaners', () => {

      it('should allow setting of an ICloseAndCleaner', () => {
        const cleaner: IFileMenu.ICloseAndCleaner<Wodget> = {
          tracker,
          action: 'Clean',
          closeAndCleanup: widget => {
            widget.state = 'clean';
            return Promise.resolve(void 0);
          }
        }
        menu.closeAndCleaners.set('Wodget', cleaner);
        menu.closeAndCleaners.get('Wodget').closeAndCleanup(wodget);
        expect(wodget.state).to.be('clean');
      });

    });

  });

});
