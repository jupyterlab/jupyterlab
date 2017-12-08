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
  KernelMenu, IKernelMenu
} from '@jupyterlab/mainmenu';

import {
  delegateExecute
} from './util';

class Wodget extends Widget {
  state: string;
}

describe('@jupyterlab/mainmenu', () => {

  describe('KernelMenu', () => {

    let commands: CommandRegistry;
    let menu: KernelMenu;
    let tracker: InstanceTracker<Wodget>;
    let wodget = new Wodget();

    before(() => {
      commands = new CommandRegistry();
    });

    beforeEach(() => {
      menu = new KernelMenu({ commands });
      tracker = new InstanceTracker<Wodget>({ namespace: 'wodget' });
      tracker.add(wodget);
    });

    afterEach(() => {
      menu.dispose();
      tracker.dispose();
      wodget.dispose();
    });

    describe('#constructor()', () => {

      it('should construct a new kernel menu', () => {
        expect(menu).to.be.an(KernelMenu);
        expect(menu.menu.title.label).to.be('Kernel');
      });

    });

    describe('#kernelUsers', () => {

      it('should allow setting of an IKernelUser', () => {
        const user: IKernelMenu.IKernelUser<Wodget> = {
          tracker,
          interruptKernel: widget => {
            widget.state = 'interrupt';
            return Promise.resolve(void 0);
          },
          restartKernel: widget => {
            widget.state = 'restart';
            return Promise.resolve(void 0);
          },
          changeKernel: widget => {
            widget.state = 'change';
            return Promise.resolve(void 0);
          },
          shutdownKernel: widget => {
            widget.state = 'shutdown';
            return Promise.resolve(void 0);
          },
        };
        menu.kernelUsers.add(user);
        delegateExecute(wodget, menu.kernelUsers, 'interruptKernel');
        expect(wodget.state).to.be('interrupt');
        delegateExecute(wodget, menu.kernelUsers, 'restartKernel');
        expect(wodget.state).to.be('restart');
        delegateExecute(wodget, menu.kernelUsers, 'changeKernel');
        expect(wodget.state).to.be('change');
        delegateExecute(wodget, menu.kernelUsers, 'shutdownKernel');
        expect(wodget.state).to.be('shutdown');
      });

    });

    describe('#consoleCreators', () => {

      it('should allow setting of an IConsoleCreator', () => {
        const creator: IKernelMenu.IConsoleCreator<Wodget> = {
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
