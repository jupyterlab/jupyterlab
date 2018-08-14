// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { expect } from 'chai';

import { ClientSession, Toolbar, ToolbarButton } from '@jupyterlab/apputils';

import { toArray } from '@phosphor/algorithm';

import { CommandRegistry } from '@phosphor/commands';

import { ReadonlyJSONObject } from '@phosphor/coreutils';

import { Message } from '@phosphor/messaging';

import { Widget } from '@phosphor/widgets';

import { simulate } from 'simulate-event';

import { createClientSession, framePromise } from '@jupyterlab/testutils';

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

  beforeEach(async () => {
    widget = new Toolbar();
    session = await createClientSession();
  });

  afterEach(async () => {
    widget.dispose();
    await session.shutdown();
    session.dispose();
  });

  describe('Toolbar', () => {
    describe('#constructor()', () => {
      it('should construct a new toolbar widget', () => {
        const widget = new Toolbar();
        expect(widget).to.be.an.instanceof(Toolbar);
      });

      it('should add the `jp-Toolbar` class', () => {
        const widget = new Toolbar();
        expect(widget.hasClass('jp-Toolbar')).to.equal(true);
      });
    });

    describe('#names()', () => {
      it('should get an ordered list the toolbar item names', () => {
        widget.addItem('foo', new Widget());
        widget.addItem('bar', new Widget());
        widget.addItem('baz', new Widget());
        expect(toArray(widget.names())).to.deep.equal(['foo', 'bar', 'baz']);
      });
    });

    describe('#addItem()', () => {
      it('should add an item to the toolbar', () => {
        const item = new Widget();
        expect(widget.addItem('test', item)).to.equal(true);
        expect(toArray(widget.names())).to.contain('test');
      });

      it('should add the `jp-Toolbar-item` class to the widget', () => {
        const item = new Widget();
        widget.addItem('test', item);
        expect(item.hasClass('jp-Toolbar-item')).to.equal(true);
      });

      it('should return false if the name is already used', () => {
        widget.addItem('test', new Widget());
        expect(widget.addItem('test', new Widget())).to.equal(false);
      });
    });

    describe('#insertItem()', () => {
      it('should insert the item into the toolbar', () => {
        widget.addItem('a', new Widget());
        widget.addItem('b', new Widget());
        widget.insertItem(1, 'c', new Widget());
        expect(toArray(widget.names())).to.deep.equal(['a', 'c', 'b']);
      });

      it('should clamp the bounds', () => {
        widget.addItem('a', new Widget());
        widget.addItem('b', new Widget());
        widget.insertItem(10, 'c', new Widget());
        expect(toArray(widget.names())).to.deep.equal(['a', 'b', 'c']);
      });
    });

    describe('.createFromCommand', () => {
      const commands = new CommandRegistry();
      const testLogCommandId = 'test:toolbar-log';
      const logArgs: ReadonlyJSONObject[] = [];
      let enabled = false;
      let toggled = true;
      let visible = false;
      commands.addCommand(testLogCommandId, {
        execute: args => {
          logArgs.push(args);
        },
        label: 'Test log command label',
        caption: 'Test log command caption',
        usage: 'Test log command usage',
        iconClass: 'test-icon-class',
        iconLabel: 'Test log icon label',
        className: 'test-log-class',
        isEnabled: () => enabled,
        isToggled: () => toggled,
        isVisible: () => visible
      });

      it('should create a button', () => {
        const button = Toolbar.createFromCommand(commands, testLogCommandId);
        expect(button).to.be.an.instanceof(ToolbarButton);
        button.dispose();
      });

      it('should dispose the button if the action is removed', () => {
        const id = 'to-be-removed';
        const cmd = commands.addCommand(id, {
          execute: () => {
            return;
          }
        });
        const button = Toolbar.createFromCommand(commands, id);
        cmd.dispose();
        expect(button.isDisposed).to.equal(true);
      });

      it('should add main class', () => {
        const button = Toolbar.createFromCommand(commands, testLogCommandId);
        expect(button.hasClass('test-log-class')).to.equal(true);
        button.dispose();
      });

      it('should add an icon with icon class and label', () => {
        const button = Toolbar.createFromCommand(commands, testLogCommandId);
        const iconNode = button.node as HTMLElement;
        expect(iconNode.classList.contains('test-icon-class')).to.equal(true);
        expect(iconNode.title).to.equal('Test log icon label');
        button.dispose();
      });

      it('should apply state classes', () => {
        enabled = false;
        toggled = true;
        visible = false;
        const button = Toolbar.createFromCommand(commands, testLogCommandId);
        expect((button.node as HTMLButtonElement).disabled).to.equal(true);
        expect(button.hasClass('p-mod-toggled')).to.equal(true);
        expect(button.hasClass('p-mod-hidden')).to.equal(true);
        button.dispose();
      });

      it('should update state classes', () => {
        enabled = false;
        toggled = true;
        visible = false;
        const button = Toolbar.createFromCommand(commands, testLogCommandId);
        expect((button.node as HTMLButtonElement).disabled).to.equal(true);
        expect(button.hasClass('p-mod-toggled')).to.equal(true);
        expect(button.hasClass('p-mod-hidden')).to.equal(true);
        enabled = true;
        visible = true;
        commands.notifyCommandChanged(testLogCommandId);
        expect((button.node as HTMLButtonElement).disabled).to.equal(false);
        expect(button.hasClass('p-mod-toggled')).to.equal(true);
        expect(button.hasClass('p-mod-hidden')).to.equal(false);
        enabled = false;
        visible = false;
        button.dispose();
      });

      it('should add use the command label if no icon class/label', () => {
        const id = 'to-be-removed';
        const cmd = commands.addCommand(id, {
          execute: () => {
            return;
          },
          label: 'Label-only button'
        });
        const button = Toolbar.createFromCommand(commands, id);
        expect(button.node.childElementCount).to.equal(0);
        expect(button.node.innerText).to.equal('Label-only button');
        cmd.dispose();
      });

      it('should update the node content on command change event', () => {
        const id = 'to-be-removed';
        let iconClassValue: string | null = null;
        const cmd = commands.addCommand(id, {
          execute: () => {
            /* no op */
          },
          label: 'Label-only button',
          iconClass: () => iconClassValue
        });
        const button = Toolbar.createFromCommand(commands, id);
        expect(button.node.childElementCount).to.equal(0);
        expect(button.node.innerText).to.equal('Label-only button');

        iconClassValue = 'updated-icon-class';
        commands.notifyCommandChanged(id);

        expect(button.node.innerText).to.equal('');
        const iconNode = button.node as HTMLElement;
        expect(iconNode.classList.contains(iconClassValue)).to.equal(true);

        cmd.dispose();
      });
    });

    describe('.createInterruptButton()', () => {
      it("should have the `'jp-StopIcon'` class", () => {
        const button = Toolbar.createInterruptButton(session);
        expect(button.hasClass('jp-StopIcon')).to.equal(true);
      });
    });

    describe('.createRestartButton()', () => {
      it("should have the `'jp-RefreshIcon'` class", () => {
        const button = Toolbar.createRestartButton(session);
        expect(button.hasClass('jp-RefreshIcon')).to.equal(true);
      });
    });

    describe('.createKernelNameItem()', () => {
      it("should display the `'display_name'` of the kernel", async () => {
        const item = Toolbar.createKernelNameItem(session);
        await session.initialize();
        expect(item.node.textContent).to.equal(session.kernelDisplayName);
      });

      it("should display `'No Kernel!'` if there is no kernel", () => {
        const item = Toolbar.createKernelNameItem(session);
        expect(item.node.textContent).to.equal('No Kernel!');
      });
    });

    describe('.createKernelStatusItem()', () => {
      beforeEach(async () => {
        await session.initialize();
        await session.kernel.ready;
      });

      it('should display a busy status if the kernel status is not idle', async () => {
        const item = Toolbar.createKernelStatusItem(session);
        let called = false;
        const future = session.kernel.requestExecute({ code: 'a = 1' });
        future.onIOPub = msg => {
          if (session.status === 'busy') {
            expect(item.hasClass('jp-FilledCircleIcon')).to.equal(true);
            called = true;
          }
        };
        await future.done;
        expect(called).to.equal(true);
      });

      it('should show the current status in the node title', async () => {
        const item = Toolbar.createKernelStatusItem(session);
        const status = session.status;
        expect(item.node.title.toLowerCase()).to.contain(status);
        let called = false;
        const future = session.kernel.requestExecute({ code: 'a = 1' });
        future.onIOPub = msg => {
          if (session.status === 'busy') {
            expect(item.node.title.toLowerCase()).to.contain('busy');
            called = true;
          }
        };
        await future.done;
        expect(called).to.equal(true);
      });

      it('should handle a starting session', async () => {
        await session.shutdown();
        session = await createClientSession();
        const item = Toolbar.createKernelStatusItem(session);
        expect(item.node.title).to.equal('Kernel Starting');
        expect(item.hasClass('jp-FilledCircleIcon')).to.equal(true);
      });
    });
  });

  describe('ToolbarButton', () => {
    describe('#constructor()', () => {
      it('should accept no arguments', () => {
        const button = new ToolbarButton();
        expect(button).to.be.an.instanceof(ToolbarButton);
      });

      it('should accept options', () => {
        const button = new ToolbarButton({
          className: 'foo',
          onClick: () => {
            return void 0;
          },
          tooltip: 'bar'
        });
        expect(button.hasClass('foo')).to.equal(true);
        expect(button.node.title).to.equal('bar');
      });
    });

    describe('#dispose()', () => {
      it('should dispose of the resources used by the widget', () => {
        const button = new ToolbarButton();
        button.dispose();
        expect(button.isDisposed).to.equal(true);
      });

      it('should be safe to call more than once', () => {
        const button = new ToolbarButton();
        button.dispose();
        button.dispose();
        expect(button.isDisposed).to.equal(true);
      });
    });

    describe('#handleEvent()', () => {
      context('click', () => {
        it('should activate the callback', async () => {
          let called = false;
          const button = new ToolbarButton({
            onClick: () => {
              called = true;
            }
          });
          Widget.attach(button, document.body);
          await framePromise();
          simulate(button.node, 'click');
          expect(called).to.equal(true);
          button.dispose();
        });
      });
    });

    describe('#onAfterAttach()', () => {
      it('should add event listeners to the node', () => {
        const button = new LogToolbarButton();
        Widget.attach(button, document.body);
        expect(button.methods).to.contain('onAfterAttach');
        simulate(button.node, 'click');
        expect(button.events).to.contain('click');
        button.dispose();
      });
    });

    describe('#onBeforeDetach()', () => {
      it('should remove event listeners from the node', async () => {
        const button = new LogToolbarButton();
        Widget.attach(button, document.body);
        await framePromise();
        Widget.detach(button);
        expect(button.methods).to.contain('onBeforeDetach');
        simulate(button.node, 'click');
        expect(button.events).to.not.contain('click');
        button.dispose();
      });
    });
  });
});
