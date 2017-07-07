// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import expect = require('expect.js');

import {
  toArray
} from '@phosphor/algorithm';

import {
  CommandRegistry
} from '@phosphor/commands';

import {
  ReadonlyJSONObject
} from '@phosphor/coreutils';

import {
  Message
} from '@phosphor/messaging';

import {
  Widget
} from '@phosphor/widgets';

import {
  simulate
} from 'simulate-event';

import {
  ClientSession, Toolbar, ToolbarButton
} from '@jupyterlab/apputils';

import {
  createClientSession
} from '../utils';


class LogToolbarButton extends ToolbarButton {

  events: string[] = [];

  methods: string[] = [];

  handleEvent(event: Event): void {
    super.handleEvent(event);
    this.events.push(event.type);
  }

  protected onAfterAttach(msg: Message): void {
    super.onAfterAttach(msg);
    this.methods.push('onAfterAttach');
  }

  protected onBeforeDetach(msg: Message): void {
    super.onBeforeDetach(msg);
    this.methods.push('onBeforeDetach');
  }
}


describe('@jupyterlab/apputils', () => {

  let widget: Toolbar<Widget>;
  let session: ClientSession;

  beforeEach(() => {
    widget = new Toolbar();
    return createClientSession().then(s => {
      session = s;
    });
  });

  afterEach(() => {
    widget.dispose();
    return session.shutdown().then(() => { session.dispose(); });
  });

  describe('Toolbar', () => {

    describe('#constructor()', () => {

      it('should construct a new toolbar widget', () => {
        let widget = new Toolbar();
        expect(widget).to.be.a(Toolbar);
      });

      it('should add the `jp-Toolbar` class', () => {
        let widget = new Toolbar();
        expect(widget.hasClass('jp-Toolbar')).to.be(true);
      });

    });

    describe('#names()', () => {

      it('should get an ordered list the toolbar item names', () => {
        widget.addItem('foo', new Widget());
        widget.addItem('bar', new Widget());
        widget.addItem('baz', new Widget());
        expect(toArray(widget.names())).to.eql(['foo', 'bar', 'baz']);
      });

    });

    describe('#addItem()', () => {

      it('should add an item to the toolbar', () => {
        let item = new Widget();
        expect(widget.addItem('test', item)).to.be(true);
        expect(toArray(widget.names())).to.contain('test');
      });

      it('should add the `jp-Toolbar-item` class to the widget', () => {
        let item = new Widget();
        widget.addItem('test', item);
        expect(item.hasClass('jp-Toolbar-item')).to.be(true);
      });

      it('should return false if the name is already used', () => {
        widget.addItem('test', new Widget());
        expect(widget.addItem('test', new Widget())).to.be(false);
      });

    });

    describe('#insertItem()', () => {

      it('should insert the item into the toolbar', () => {
        widget.addItem('a', new Widget());
        widget.addItem('b', new Widget());
        widget.insertItem(1, 'c', new Widget());
        expect(toArray(widget.names())).to.eql(['a', 'c', 'b']);
      });

      it('should clamp the bounds', () => {
        widget.addItem('a', new Widget());
        widget.addItem('b', new Widget());
        widget.insertItem(10, 'c', new Widget());
        expect(toArray(widget.names())).to.eql(['a', 'b', 'c']);
      });

    });

    describe('.createFromCommand', () => {

      let commands = new CommandRegistry();
      let testLogCommandId = 'test:toolbar-log';
      let logArgs: ReadonlyJSONObject[] = [];
      let enabled = false;
      let toggled = true;
      let visible = false;
      commands.addCommand(testLogCommandId, {
        execute: (args) => { logArgs.push(args); },
        label: 'Test log command label',
        caption: 'Test log command caption',
        usage: 'Test log command usage',
        iconClass: 'test-icon-class',
        iconLabel: 'Test log icon label',
        className: 'test-log-class',
        isEnabled: (args) => { return enabled; },
        isToggled: (args) => { return toggled; },
        isVisible: (args) => { return visible; },
      });

      it('should create a button', () => {
        let button = Toolbar.createFromCommand(commands, testLogCommandId);
        expect(button).to.be.a(ToolbarButton);
        button.dispose();
      });

      it('should dispose the button if the action is removed', () => {
        let id = 'to-be-removed';
        let cmd = commands.addCommand(id, { execute: () => { return; } });
        let button = Toolbar.createFromCommand(commands, id);
        cmd.dispose();
        expect(button.isDisposed).to.be(true);
      });

      it('should add main class', () => {
        let button = Toolbar.createFromCommand(commands, testLogCommandId);
        expect(button.hasClass('test-log-class')).to.be(true);
        button.dispose();
      });

      it('should add an icon node with icon class and label', () => {
        let button = Toolbar.createFromCommand(commands, testLogCommandId);
        let iconNode = button.node.children[0] as HTMLElement;
        expect(iconNode.classList.contains('test-icon-class')).to.be(true);
        expect(iconNode.innerText).to.equal('Test log icon label');
        button.dispose();
      });

      it('should apply state classes', () => {
        enabled = false;
        toggled = true;
        visible = false;
        let button = Toolbar.createFromCommand(commands, testLogCommandId);
        expect((button.node as HTMLButtonElement).disabled).to.be(true);
        expect(button.hasClass('p-mod-toggled')).to.be(true);
        expect(button.hasClass('p-mod-hidden')).to.be(true);
        button.dispose();
      });

      it('should update state classes', () => {
        enabled = false;
        toggled = true;
        visible = false;
        let button = Toolbar.createFromCommand(commands, testLogCommandId);
        expect((button.node as HTMLButtonElement).disabled).to.be(true);
        expect(button.hasClass('p-mod-toggled')).to.be(true);
        expect(button.hasClass('p-mod-hidden')).to.be(true);
        enabled = true;
        visible = true;
        commands.notifyCommandChanged(testLogCommandId);
        expect((button.node as HTMLButtonElement).disabled).to.be(false);
        expect(button.hasClass('p-mod-toggled')).to.be(true);
        expect(button.hasClass('p-mod-hidden')).to.be(false);
        enabled = false;
        visible = false;
        button.dispose();
      });

      it('should add use the command label if no icon class/label', () => {
        let id = 'to-be-removed';
        let cmd = commands.addCommand(id, {
          execute: () => { return; },
          label: 'Label-only button',
        });
        let button = Toolbar.createFromCommand(commands, id);
        expect(button.node.childElementCount).to.be(0);
        expect(button.node.innerText).to.equal('Label-only button');
        cmd.dispose();
      });

      it('should update the node content on command change event', () => {
        let id = 'to-be-removed';
        let iconClassValue: string | null = null;
        let cmd = commands.addCommand(id, {
          execute: () => { return; },
          label: 'Label-only button',
          iconClass: (args) => { return iconClassValue; }
        });
        let button = Toolbar.createFromCommand(commands, id);
        expect(button.node.childElementCount).to.be(0);
        expect(button.node.innerText).to.equal('Label-only button');

        iconClassValue = 'updated-icon-class';
        commands.notifyCommandChanged(id);

        expect(button.node.innerText).to.equal('');
        expect(button.node.childElementCount).to.be(1);
        let iconNode = button.node.children[0] as HTMLElement;
        expect(iconNode.classList.contains(iconClassValue)).to.be(true);

        cmd.dispose();
      });

    });

    describe('.createInterruptButton()', () => {

      it('should have the `\'jp-StopIcon\'` class', () => {
        let button = Toolbar.createInterruptButton(session);
        expect(button.hasClass('jp-StopIcon')).to.be(true);
      });

    });

    describe('.createRestartButton()', () => {

      it('should have the `\'jp-RefreshIcon\'` class', () => {
        let button = Toolbar.createRestartButton(session);
        expect(button.hasClass('jp-RefreshIcon')).to.be(true);
      });

    });


    describe('.createKernelNameItem()', () => {

      it('should display the `\'display_name\'` of the kernel', () => {
        let item = Toolbar.createKernelNameItem(session);
        return session.initialize().then(() => {
          expect(item.node.textContent).to.be(session.kernelDisplayName);
        });
      });

      it('should display `\'No Kernel!\'` if there is no kernel', () => {
        let item = Toolbar.createKernelNameItem(session);
        expect(item.node.textContent).to.be('No Kernel!');
      });

    });

    describe('.createKernelStatusItem()', () => {

      beforeEach(() => {
        return session.initialize().then(() => {
          return session.kernel.ready;
        });
      });

      it('should display a busy status if the kernel status is not idle', () => {
        let item = Toolbar.createKernelStatusItem(session);
        let called = false;
        let future = session.kernel.requestExecute({ code: 'a = 1' });
        future.onIOPub = msg => {
          if (session.status === 'busy') {
            expect(item.hasClass('jp-FilledCircleIcon')).to.be(true);
            called = true;
          }
        };
        return future.done.then(() => {
          expect(called).to.be(true);
        });
      });

      it('should show the current status in the node title', () => {
        let item = Toolbar.createKernelStatusItem(session);
        let status = session.status;
        expect(item.node.title.toLowerCase()).to.contain(status);
        let called = false;
        let future = session.kernel.requestExecute({ code: 'a = 1' });
        future.onIOPub = msg => {
          if (session.status === 'busy') {
            expect(item.node.title.toLowerCase()).to.contain('busy');
            called = true;
          }
        };
        return future.done.then(() => {
          expect(called).to.be(true);
        });
      });

      it('should handle a starting session', () => {
        return session.shutdown().then(() => {
          return createClientSession();
        }).then(session => {
          let item = Toolbar.createKernelStatusItem(session);
          expect(item.node.title).to.be('Kernel Starting');
          expect(item.hasClass('jp-FilledCircleIcon')).to.be(true);
        });
      });

    });

  });

  describe('ToolbarButton', () => {

    describe('#constructor()', () => {

      it('should accept no arguments', () => {
        let button = new ToolbarButton();
        expect(button).to.be.a(ToolbarButton);
      });

      it('should accept options', () => {
        let button = new ToolbarButton({
          className: 'foo',
          onClick: () => { return void 0; },
          tooltip: 'bar'
        });
        expect(button.hasClass('foo')).to.be(true);
        expect(button.node.title).to.be('bar');
      });

    });

    describe('#dispose()', () => {

      it('should dispose of the resources used by the widget', () => {
        let button = new ToolbarButton();
        button.dispose();
        expect(button.isDisposed).to.be(true);
      });

      it('should be safe to call more than once', () => {
        let button = new ToolbarButton();
        button.dispose();
        button.dispose();
        expect(button.isDisposed).to.be(true);
      });

    });

    describe('#handleEvent()', () => {

      context('click', () => {

        it('should activate the callback', (done) => {
          let called = false;
          let button = new ToolbarButton({
            onClick: () => { called = true; },
          });
          Widget.attach(button, document.body);
          requestAnimationFrame(() => {
            simulate(button.node, 'click');
            expect(called).to.be(true);
            button.dispose();
            done();
          });
        });

      });

      context('mousedown', () => {

        it('should add the `jp-mod-pressed` class', (done) => {
          let button = new ToolbarButton();
          Widget.attach(button, document.body);
          requestAnimationFrame(() => {
            simulate(button.node, 'mousedown');
            expect(button.hasClass('jp-mod-pressed')).to.be(true);
            button.dispose();
            done();
          });
        });

      });

      context('mouseup', () => {

        it('should remove the `jp-mod-pressed` class', (done) => {
          let button = new ToolbarButton();
          Widget.attach(button, document.body);
          requestAnimationFrame(() => {
            simulate(button.node, 'mousedown');
            simulate(button.node, 'mouseup');
            expect(button.hasClass('jp-mod-pressed')).to.be(false);
            button.dispose();
            done();
          });
        });

      });

      context('mouseout', () => {

        it('should remove the `jp-mod-pressed` class', (done) => {
          let button = new ToolbarButton();
          Widget.attach(button, document.body);
          requestAnimationFrame(() => {
            simulate(button.node, 'mousedown');
            simulate(button.node, 'mouseout');
            expect(button.hasClass('jp-mod-pressed')).to.be(false);
            button.dispose();
            done();
          });
        });

      });

    });

    describe('#onAfterAttach()', () => {

      it('should add event listeners to the node', () => {
        let button = new LogToolbarButton();
        Widget.attach(button, document.body);
        expect(button.methods).to.contain('onAfterAttach');
        simulate(button.node, 'mousedown');
        simulate(button.node, 'mouseup');
        simulate(button.node, 'mouseout');
        expect(button.events).to.contain('mousedown');
        expect(button.events).to.contain('mouseup');
        expect(button.events).to.contain('mouseout');
        button.dispose();
      });

    });

    describe('#onBeforeDetach()', () => {

      it('should remove event listeners from the node', (done) => {
        let button = new LogToolbarButton();
        Widget.attach(button, document.body);
        requestAnimationFrame(() => {
          Widget.detach(button);
          expect(button.methods).to.contain('onBeforeDetach');
          simulate(button.node, 'mousedown');
          simulate(button.node, 'mouseup');
          simulate(button.node, 'mouseout');
          expect(button.events).to.not.contain('mousedown');
          expect(button.events).to.not.contain('mouseup');
          expect(button.events).to.not.contain('mouseout');
          button.dispose();
          done();
        });
      });

    });

  });

});
