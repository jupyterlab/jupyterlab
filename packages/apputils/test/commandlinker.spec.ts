// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { CommandLinker } from '@jupyterlab/apputils';
import { CommandRegistry } from '@lumino/commands';
import { h, VirtualDOM, VirtualNode } from '@lumino/virtualdom';
import { simulate } from 'simulate-event';

describe('@jupyterlab/apputils', () => {
  describe('CommandLinker', () => {
    describe('#constructor()', () => {
      it('should create a command linker', () => {
        const linker = new CommandLinker({ commands: new CommandRegistry() });
        expect(linker).toBeInstanceOf(CommandLinker);
        linker.dispose();
      });
    });

    describe('#isDisposed', () => {
      it('should test whether a command linker has been disposed', () => {
        const linker = new CommandLinker({ commands: new CommandRegistry() });
        expect(linker.isDisposed).toBe(false);
        linker.dispose();
        expect(linker.isDisposed).toBe(true);
      });
    });

    describe('#connectNode()', () => {
      it('should connect a node to a command', () => {
        let called = false;
        const command = 'commandlinker:connect-node';
        const commands = new CommandRegistry();
        const linker = new CommandLinker({ commands });
        const node = document.createElement('div');
        const disposable = commands.addCommand(command, {
          execute: () => {
            called = true;
          }
        });

        document.body.appendChild(node);
        linker.connectNode(node, command, undefined);

        expect(called).toBe(false);
        simulate(node, 'click');
        expect(called).toBe(true);

        document.body.removeChild(node);
        linker.dispose();
        disposable.dispose();
      });
    });

    describe('#disconnectNode()', () => {
      it('should disconnect a node from a command', () => {
        let called = false;
        const command = 'commandlinker:disconnect-node';
        const commands = new CommandRegistry();
        const linker = new CommandLinker({ commands });
        const node = document.createElement('div');
        const disposable = commands.addCommand(command, {
          execute: () => {
            called = true;
          }
        });

        document.body.appendChild(node);
        linker.connectNode(node, command, undefined);

        // Make sure connection is working.
        expect(called).toBe(false);
        simulate(node, 'click');
        expect(called).toBe(true);

        // Reset flag.
        called = false;

        // Make sure disconnection is working.
        linker.disconnectNode(node);
        expect(called).toBe(false);
        simulate(node, 'click');
        expect(called).toBe(false);

        document.body.removeChild(node);
        linker.dispose();
        disposable.dispose();
      });
    });

    describe('#dispose()', () => {
      it('should dispose the resources held by the linker', () => {
        const linker = new CommandLinker({ commands: new CommandRegistry() });
        expect(linker.isDisposed).toBe(false);
        linker.dispose();
        expect(linker.isDisposed).toBe(true);
      });
    });

    describe('#populateVNodeDataset()', () => {
      it('should connect a node to a command', () => {
        let called = false;
        const command = 'commandlinker:connect-node';
        const commands = new CommandRegistry();
        const linker = new CommandLinker({ commands });
        let node: HTMLElement;
        let vnode: VirtualNode;
        const disposable = commands.addCommand(command, {
          execute: () => {
            called = true;
          }
        });

        vnode = h.div({
          dataset: linker.populateVNodeDataset(command, undefined)
        });
        node = VirtualDOM.realize(vnode);
        document.body.appendChild(node);

        expect(called).toBe(false);
        simulate(node, 'click');
        expect(called).toBe(true);

        document.body.removeChild(node);
        linker.dispose();
        disposable.dispose();
      });
    });
  });
});
