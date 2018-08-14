// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect } from 'chai';

import { CommandRegistry } from '@phosphor/commands';

import { Widget } from '@phosphor/widgets';

import { InstanceTracker } from '@jupyterlab/apputils';

import { RunMenu, IRunMenu } from '@jupyterlab/mainmenu';

class Wodget extends Widget {
  state: string;
}

import { delegateExecute } from './util';

describe('@jupyterlab/mainmenu', () => {
  describe('RunMenu', () => {
    let commands: CommandRegistry;
    let menu: RunMenu;
    let tracker: InstanceTracker<Wodget>;
    const wodget = new Wodget();

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
        expect(menu).to.be.an.instanceof(RunMenu);
        expect(menu.menu.title.label).to.equal('Run');
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
          restartAndRunAll: widget => {
            widget.state = 'restartAndRunAll';
            return Promise.resolve(void 0);
          }
        };
        menu.codeRunners.add(runner);
        delegateExecute(wodget, menu.codeRunners, 'run');
        expect(wodget.state).to.equal('run');
        delegateExecute(wodget, menu.codeRunners, 'runAll');
        expect(wodget.state).to.equal('runAll');
        delegateExecute(wodget, menu.codeRunners, 'restartAndRunAll');
        expect(wodget.state).to.equal('restartAndRunAll');
      });
    });
  });
});
