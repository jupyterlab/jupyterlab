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
  EditMenu, IEditMenu
} from '@jupyterlab/mainmenu';

import {
  delegateExecute
} from './util';

class Wodget extends Widget {
  state: string;
}

describe('@jupyterlab/mainmenu', () => {

  describe('EditMenu', () => {

    let commands: CommandRegistry;
    let menu: EditMenu;
    let tracker: InstanceTracker<Wodget>;
    let wodget = new Wodget();

    before(() => {
      commands = new CommandRegistry();
    });

    beforeEach(() => {
      menu = new EditMenu({ commands });
      tracker = new InstanceTracker<Wodget>({ namespace: 'wodget' });
      tracker.add(wodget);
    });

    afterEach(() => {
      menu.dispose();
      tracker.dispose();
      wodget.dispose();
    });

    describe('#constructor()', () => {

      it('should construct a new edit menu', () => {
        expect(menu).to.be.an(EditMenu);
        expect(menu.menu.title.label).to.be('Edit');
      });

    });

    describe('#undoers', () => {

      it('should allow setting of an IUndoer', () => {
        const undoer: IEditMenu.IUndoer<Wodget> = {
          tracker,
          undo: widget => {
            widget.state = 'undo';
            return;
          },
          redo: widget => {
            widget.state = 'redo';
            return;
          }
        };
        menu.undoers.add(undoer);
        delegateExecute(wodget, menu.undoers, 'undo');
        expect(wodget.state).to.be('undo');
        delegateExecute(wodget, menu.undoers, 'redo');
        expect(wodget.state).to.be('redo');
      });

    });

    describe('#clearers', () => {

      it('should allow setting of an IClearer', () => {
        const clearer: IEditMenu.IClearer<Wodget> = {
          tracker,
          noun: 'Nouns',
          clearCurrent: widget => {
            widget.state = 'clearCurrent';
            return;
          },
          clearAll: widget => {
            widget.state = 'clearAll';
            return;
          }
        };
        menu.clearers.add(clearer);
        delegateExecute(wodget, menu.clearers, 'clearCurrent');
        expect(wodget.state).to.be('clearCurrent');
        delegateExecute(wodget, menu.clearers, 'clearAll');
        expect(wodget.state).to.be('clearAll');
      });

    });

    describe('#findReplacers', () => {

      it('should allow setting of an IFindReplacer', () => {
        const finder: IEditMenu.IFindReplacer<Wodget> = {
          tracker,
          find: widget => {
            widget.state = 'find';
            return;
          },
          findAndReplace: widget => {
            widget.state = 'findAndReplace';
            return;
          },
        };
        menu.findReplacers.add(finder);
        delegateExecute(wodget, menu.findReplacers, 'find');
        expect(wodget.state).to.be('find');
        delegateExecute(wodget, menu.findReplacers, 'findAndReplace');
        expect(wodget.state).to.be('findAndReplace');
      });

    });

  });

});
