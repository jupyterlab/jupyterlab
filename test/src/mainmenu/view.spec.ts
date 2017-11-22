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
  ViewMenu, IViewMenu
} from '@jupyterlab/mainmenu';

class Wodget extends Widget {
  wrapped: boolean = false;
  matched: boolean = false;
  numbered: boolean = false;
}

describe('@jupyterlab/mainmenu', () => {

  describe('ViewMenu', () => {
    
    let commands: CommandRegistry;
    let menu: ViewMenu;
    let tracker: InstanceTracker<Wodget>;
    let wodget = new Wodget();

    before(() => {
      commands = new CommandRegistry();
    });

    beforeEach(() => {
      menu = new ViewMenu({ commands });
      tracker = new InstanceTracker<Wodget>({ namespace: 'wodget' });
      tracker.add(wodget);
    });

    afterEach(() => {
      menu.dispose();
      tracker.dispose();
      wodget.dispose();
    });

    describe('#constructor()', () => {

      it('should construct a new view menu', () => {
        expect(menu).to.be.an(ViewMenu);
        expect(menu.title.label).to.be('View');
      });

    });

    describe('#editorViewers', () => {

      it('should allow setting of an IEditorViewer', () => {
        const viewer: IViewMenu.IEditorViewer<Wodget> = {
          tracker,
          toggleLineNumbers: widget => {
            widget.numbered = !widget.numbered;
            return;
          },
          toggleMatchBrackets: widget => {
            widget.matched = !widget.matched;
            return;
          },
          toggleWordWrap: widget => {
            widget.wrapped = !widget.wrapped;
            return;
          },
          matchBracketsToggled: widget => widget.matched,
          lineNumbersToggled: widget => widget.numbered,
          wordWrapToggled: widget => widget.wrapped
        }
        menu.editorViewers.set('Wodget', viewer);
        expect(menu.editorViewers.get('Wodget').matchBracketsToggled(wodget))
        .to.be(false);
        expect(menu.editorViewers.get('Wodget').wordWrapToggled(wodget))
        .to.be(false);
        expect(menu.editorViewers.get('Wodget').lineNumbersToggled(wodget))
        .to.be(false);
        menu.editorViewers.get('Wodget').toggleLineNumbers(wodget);
        menu.editorViewers.get('Wodget').toggleMatchBrackets(wodget);
        menu.editorViewers.get('Wodget').toggleWordWrap(wodget);
        expect(menu.editorViewers.get('Wodget').matchBracketsToggled(wodget))
        .to.be(true);
        expect(menu.editorViewers.get('Wodget').wordWrapToggled(wodget))
        .to.be(true);
        expect(menu.editorViewers.get('Wodget').lineNumbersToggled(wodget))
        .to.be(true);
      });

    });

  });

});
