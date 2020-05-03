// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import 'jest';

import { CommandRegistry } from '@lumino/commands';

import { Widget } from '@lumino/widgets';

import { WidgetTracker } from '@jupyterlab/apputils';

import { RunMenu, IRunMenu } from '@jupyterlab/mainmenu';

class Wodget extends Widget {
  state: string;
}

import { delegateExecute } from './util';

describe('@jupyterlab/mainmenu', () => {
  describe('RunMenu', () => {
    let commands: CommandRegistry;
    let menu: RunMenu;
    let tracker: WidgetTracker<Wodget>;
    let wodget: Wodget;

    beforeAll(() => {
      commands = new CommandRegistry();
    });

    beforeEach(() => {
      wodget = new Wodget();
      menu = new RunMenu({ commands });
      tracker = new WidgetTracker<Wodget>({ namespace: 'wodget' });
      void tracker.add(wodget);
    });

    afterEach(() => {
      menu.dispose();
      tracker.dispose();
      wodget.dispose();
    });

    describe('#constructor()', () => {
      it('should construct a new run menu', () => {
        expect(menu).toBeInstanceOf(RunMenu);
        expect(menu.menu.title.label).toBe('Run');
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
            return Promise.resolve(false);
          }
        };
        menu.codeRunners.add(runner);
        void delegateExecute(wodget, menu.codeRunners, 'run');
        expect(wodget.state).toBe('run');
        void delegateExecute(wodget, menu.codeRunners, 'runAll');
        expect(wodget.state).toBe('runAll');
        void delegateExecute(wodget, menu.codeRunners, 'restartAndRunAll');
        expect(wodget.state).toBe('restartAndRunAll');
      });
    });
  });
});
