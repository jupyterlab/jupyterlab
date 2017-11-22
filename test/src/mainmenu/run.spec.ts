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
  RunMenu, IRunMenu
} from '@jupyterlab/mainmenu';

class Wodget extends Widget {
  state: string;
}

describe('@jupyterlab/mainmenu', () => {

  describe('RunMenu', () => {
    
    let commands: CommandRegistry;
    let menu: RunMenu;
    let tracker: InstanceTracker<Wodget>;
    let wodget = new Wodget();

    before(() => {
      commands = new CommandRegistry();
    });

    beforeEach(() => {
      menu = new RunMenu({ commands });
      tracker = new InstanceTracker<Wodget>({ namespace: 'wodget' });
      tracker.add(wodget);
    });

    afterEach(() => {
      menu.dispose();
      tracker.dispose();
      wodget.dispose();
    });

    describe('#constructor()', () => {

      it('should construct a new run menu', () => {
        expect(menu).to.be.an(RunMenu);
        expect(menu.title.label).to.be('Run');
      });

    });

    describe('#codeRunners', () => {

      it('should allow setting of an ICodeRunner', () => {
        const runner: IRunMenu.ICodeRunner<Wodget> = {
          tracker,
          noun: 'Noun',
          run: widget => {
            widget.state = 'run';
            return Promise.resolve(void 0);
          },
          runAll: widget => {
            widget.state = 'runAll';
            return Promise.resolve(void 0);
          },
          runAbove: widget => {
            widget.state = 'runAbove';
            return Promise.resolve(void 0);
          },
          runBelow: widget => {
            widget.state = 'runBelow';
            return Promise.resolve(void 0);
          },
        }
        menu.codeRunners.set('Wodget', runner);
        menu.codeRunners.get('Wodget').run(wodget);
        expect(wodget.state).to.be('run');
        menu.codeRunners.get('Wodget').runAll(wodget);
        expect(wodget.state).to.be('runAll');
        menu.codeRunners.get('Wodget').runAbove(wodget);
        expect(wodget.state).to.be('runAbove');
        menu.codeRunners.get('Wodget').runBelow(wodget);
        expect(wodget.state).to.be('runBelow');
      });

    });

  });

});
