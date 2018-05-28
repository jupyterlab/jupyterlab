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

import {
  delegateExecute
} from './util';

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
        expect(menu.menu.title.label).to.be('File');
      });

    });

    describe('#newMenu', () => {

      it('should be a submenu for `New...` commands', () => {
        expect(menu.newMenu.menu.title.label).to.be('New');
      });

    });

    describe('#cleaners', () => {

      it('should allow setting of an ICloseAndCleaner', () => {
        const cleaner: IFileMenu.ICloseAndCleaner<Wodget> = {
          tracker,
          name: 'Wodget',
          action: 'Clean',
          closeAndCleanup: widget => {
            widget.state = 'clean';
            return Promise.resolve(void 0);
          }
        };
        menu.closeAndCleaners.add(cleaner);
        delegateExecute(wodget, menu.closeAndCleaners, 'closeAndCleanup');
        expect(wodget.state).to.be('clean');
      });

    });

    describe('#persistAndSavers', () => {

      it('should allow setting of an IPersistAndSave', () => {
        const persistAndSaver: IFileMenu.IPersistAndSave<Wodget> = {
          tracker,
          name: 'Wodget',
          action: 'with Save',
          persistAndSave: widget => {
            widget.state = 'saved';
            return Promise.resolve(void 0);
          }
        };
        menu.persistAndSavers.add(persistAndSaver);
        delegateExecute(wodget, menu.persistAndSavers, 'persistAndSave');
        expect(wodget.state).to.be('saved');
      });

    });

    describe('#consoleCreators', () => {

      it('should allow setting of an IConsoleCreator', () => {
        const creator: IFileMenu.IConsoleCreator<Wodget> = {
          tracker,
          name: 'Wodget',
          createConsole: widget => {
            widget.state = 'create';
            return Promise.resolve(void 0);
          },
        };
        menu.consoleCreators.add(creator);
        delegateExecute(wodget, menu.consoleCreators, 'createConsole');
        expect(wodget.state).to.be('create');
      });

    });

  });

});
