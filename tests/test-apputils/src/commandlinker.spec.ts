// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  CommandRegistry
} from '@phosphor/commands';

import {
  h, VirtualNode, VirtualDOM
} from '@phosphor/virtualdom';

import {
  simulate
} from 'simulate-event';

import {
  CommandLinker
} from '@jupyterlab/apputils';


describe('@jupyterlab/apputils', () => {

  describe('CommandLinker', () => {

    describe('#constructor()', () => {

      it('should create a command linker', () => {
        let linker = new CommandLinker({ commands: new CommandRegistry() });
        expect(linker).to.be.a(CommandLinker);
        linker.dispose();
      });

    });

    describe('#isDisposed', () => {

      it('should test whether a command linker has been disposed', () => {
        let linker = new CommandLinker({ commands: new CommandRegistry() });
        expect(linker.isDisposed).to.be(false);
        linker.dispose();
        expect(linker.isDisposed).to.be(true);
      });

    });

    describe('#connectNode()', () => {

      it('should connect a node to a command', () => {
        let called = false;
        let command = 'commandlinker:connect-node';
        let commands =new CommandRegistry();
        let linker = new CommandLinker({ commands });
        let node = document.createElement('div');
        let disposable = commands.addCommand(command, {
          execute: () => { called = true; }
        });

        document.body.appendChild(node);
        linker.connectNode(node, command, null);

        expect(called).to.be(false);
        simulate(node, 'click');
        expect(called).to.be(true);

        document.body.removeChild(node);
        linker.dispose();
        disposable.dispose();
      });

    });

    describe('#disconnectNode()', () => {

      it('should disconnect a node from a command', () => {
        let called = false;
        let command = 'commandlinker:disconnect-node';
        let commands =new CommandRegistry();
        let linker = new CommandLinker({ commands });
        let node = document.createElement('div');
        let disposable = commands.addCommand(command, {
          execute: () => { called = true; }
        });

        document.body.appendChild(node);
        linker.connectNode(node, command, null);

        // Make sure connection is working.
        expect(called).to.be(false);
        simulate(node, 'click');
        expect(called).to.be(true);

        // Reset flag.
        called = false;

        // Make sure disconnection is working.
        linker.disconnectNode(node);
        expect(called).to.be(false);
        simulate(node, 'click');
        expect(called).to.be(false);

        document.body.removeChild(node);
        linker.dispose();
        disposable.dispose();
      });

    });

    describe('#dispose()', () => {

      it('should dispose the resources held by the linker', () => {
        let linker = new CommandLinker({ commands: new CommandRegistry() });
        expect(linker.isDisposed).to.be(false);
        linker.dispose();
        expect(linker.isDisposed).to.be(true);
      });

    });

    describe('#populateVNodeDataset()', () => {

      it('should connect a node to a command', () => {
        let called = false;
        let command = 'commandlinker:connect-node';
        let commands =new CommandRegistry();
        let linker = new CommandLinker({ commands });
        let node: HTMLElement;
        let vnode: VirtualNode;
        let disposable = commands.addCommand(command, {
          execute: () => { called = true; }
        });

        vnode = h.div({ dataset: linker.populateVNodeDataset(command, null) });
        node = VirtualDOM.realize(vnode);
        document.body.appendChild(node);

        expect(called).to.be(false);
        simulate(node, 'click');
        expect(called).to.be(true);

        document.body.removeChild(node);
        linker.dispose();
        disposable.dispose();
      });

    });

  });

});
