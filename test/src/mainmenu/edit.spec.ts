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
        expect(menu.title.label).to.be('Edit');
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
        }
        menu.undoers.set('Wodget', undoer);
        menu.undoers.get('Wodget').undo(wodget);
        expect(wodget.state).to.be('undo');
        menu.undoers.get('Wodget').redo(wodget);
        expect(wodget.state).to.be('redo');
      });

    });

    describe('#clearers', () => {

      it('should allow setting of an IClearer', () => {
        const clearer: IEditMenu.IClearer<Wodget> = {
          tracker,
          noun: 'Nouns',
          clear: widget => {
            widget.state = 'clear';
            return;
          },
        }
        menu.clearers.set('Wodget', clearer);
        menu.clearers.get('Wodget').clear(wodget);
        expect(wodget.state).to.be('clear');
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
        }
        menu.findReplacers.set('Wodget', finder);
        menu.findReplacers.get('Wodget').find(wodget);
        expect(wodget.state).to.be('find');
        menu.findReplacers.get('Wodget').findAndReplace(wodget);
        expect(wodget.state).to.be('findAndReplace');
      });

    });

  });

});
