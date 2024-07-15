// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  blankIcon,
  bugDotIcon,
  bugIcon,
  CommandToolbarButton,
  jupyterIcon,
  ReactiveToolbar,
  Toolbar,
  ToolbarButton
} from '@jupyterlab/ui-components';
import { framePromise, JupyterServer } from '@jupyterlab/testing';
import { CommandRegistry } from '@lumino/commands';
import { ReadonlyPartialJSONObject } from '@lumino/coreutils';
import { PanelLayout, Widget } from '@lumino/widgets';
import { simulate } from 'simulate-event';

const server = new JupyterServer();

beforeAll(async () => {
  await server.start();
}, 30000);

afterAll(async () => {
  await server.shutdown();
});

describe('@jupyterlab/ui-components', () => {
  describe('CommandToolbarButton', () => {
    let commands: CommandRegistry;
    const id = 'test-command';
    const options: CommandRegistry.ICommandOptions = {
      execute: jest.fn()
    };

    beforeEach(() => {
      commands = new CommandRegistry();
    });

    it('should render a command', async () => {
      commands.addCommand(id, options);
      const button = new CommandToolbarButton({
        commands,
        id
      });

      Widget.attach(button, document.body);
      await framePromise();

      expect(button.hasClass('jp-CommandToolbarButton')).toBe(true);
      simulate(button.node.firstElementChild!, 'click');
      expect(options.execute).toHaveBeenCalledTimes(1);
    });

    it('should not trigger command on mousedown', async () => {
      options.execute = jest.fn();
      commands.addCommand(id, options);
      const button = new CommandToolbarButton({
        commands,
        id
      });

      Widget.attach(button, document.body);
      await framePromise();

      expect(button.hasClass('jp-CommandToolbarButton')).toBe(true);
      simulate(button.node.firstElementChild!, 'mousedown');
      expect(options.execute).toHaveBeenCalledTimes(0);
    });

    it('should trigger command on mousedown', async () => {
      options.execute = jest.fn();
      commands.addCommand(id, options);
      const button = new CommandToolbarButton({
        commands,
        id,
        noFocusOnClick: true
      });

      Widget.attach(button, document.body);
      await framePromise();

      expect(button.hasClass('jp-CommandToolbarButton')).toBe(true);
      simulate(button.node.firstElementChild!, 'mousedown');
      expect(options.execute).toHaveBeenCalledTimes(1);
    });

    it('should render the label command', async () => {
      const label = 'This is a test label';
      commands.addCommand(id, { ...options, label });
      const button = new CommandToolbarButton({
        commands,
        id
      });

      Widget.attach(button, document.body);
      await framePromise();

      expect(button.node.textContent).toMatch(label);
    });

    it('should render the customized label command', async () => {
      const label = 'This is a test label';
      const buttonLabel = 'This is the button label';
      commands.addCommand(id, { ...options, label });
      const button = new CommandToolbarButton({
        commands,
        id,
        label: buttonLabel
      });

      Widget.attach(button, document.body);
      await framePromise();

      expect(button.node.textContent).toMatch(buttonLabel);
      expect(button.node.textContent).not.toMatch(label);
    });

    it('should render the icon command', async () => {
      const icon = jupyterIcon;
      commands.addCommand(id, { ...options, icon });
      const button = new CommandToolbarButton({
        commands,
        id
      });

      Widget.attach(button, document.body);
      await framePromise();

      expect(button.node.getElementsByTagName('svg')[0].dataset.icon).toMatch(
        icon.name
      );
    });

    it('should render the customized icon command', async () => {
      const icon = jupyterIcon;
      const buttonIcon = blankIcon;
      commands.addCommand(id, { ...options, icon });
      const button = new CommandToolbarButton({
        commands,
        id,
        icon: buttonIcon
      });

      Widget.attach(button, document.body);
      await framePromise();

      const iconSVG = button.node.getElementsByTagName('svg')[0];
      expect(iconSVG.dataset.icon).toMatch(buttonIcon.name);
      expect(iconSVG.dataset.icon).not.toMatch(icon.name);
    });
  });

  describe('Toolbar', () => {
    let widget: Toolbar<Widget>;

    beforeEach(async () => {
      widget = new Toolbar();
    }, 30000);

    afterEach(async () => {
      widget.dispose();
    });

    describe('#constructor()', () => {
      it('should construct a new toolbar widget', () => {
        const widget = new Toolbar();
        expect(widget).toBeInstanceOf(Toolbar);
      });

      it('should add the `jp-Toolbar` class', () => {
        const widget = new Toolbar();
        expect(widget.hasClass('jp-Toolbar')).toBe(true);
      });
    });

    describe('#names()', () => {
      it('should get an ordered list the toolbar item names', () => {
        widget.addItem('foo', new Widget());
        widget.addItem('bar', new Widget());
        widget.addItem('baz', new Widget());
        expect(Array.from(widget.names())).toEqual(['foo', 'bar', 'baz']);
      });
    });

    describe('#addItem()', () => {
      it('should add an item to the toolbar', () => {
        const item = new Widget();
        expect(widget.addItem('test', item)).toBe(true);
        expect(Array.from(widget.names())).toContain('test');
      });

      it('should add the `jp-Toolbar-item` class to the widget', () => {
        const item = new Widget();
        widget.addItem('test', item);
        expect(item.hasClass('jp-Toolbar-item')).toBe(true);
      });

      it('should return false if the name is already used', () => {
        widget.addItem('test', new Widget());
        expect(widget.addItem('test', new Widget())).toBe(false);
      });
    });

    describe('#insertItem()', () => {
      it('should insert the item into the toolbar', () => {
        widget.addItem('a', new Widget());
        widget.addItem('b', new Widget());
        widget.insertItem(1, 'c', new Widget());
        expect(Array.from(widget.names())).toEqual(['a', 'c', 'b']);
      });

      it('should clamp the bounds', () => {
        widget.addItem('a', new Widget());
        widget.addItem('b', new Widget());
        widget.insertItem(10, 'c', new Widget());
        expect(Array.from(widget.names())).toEqual(['a', 'b', 'c']);
      });
    });

    describe('#insertAfter()', () => {
      it('should insert an item into the toolbar after `c`', () => {
        widget.addItem('a', new Widget());
        widget.addItem('b', new Widget());
        widget.insertItem(1, 'c', new Widget());
        widget.insertAfter('c', 'd', new Widget());
        expect(Array.from(widget.names())).toEqual(['a', 'c', 'd', 'b']);
      });

      it('should return false if the target item does not exist', () => {
        widget.addItem('a', new Widget());
        widget.addItem('b', new Widget());
        const value = widget.insertAfter('c', 'd', new Widget());
        expect(value).toBe(false);
      });
    });

    describe('#insertBefore()', () => {
      it('should insert an item into the toolbar before `c`', () => {
        widget.addItem('a', new Widget());
        widget.addItem('b', new Widget());
        widget.insertItem(1, 'c', new Widget());
        widget.insertBefore('c', 'd', new Widget());
        expect(Array.from(widget.names())).toEqual(['a', 'd', 'c', 'b']);
      });

      it('should return false if the target item does not exist', () => {
        widget.addItem('a', new Widget());
        widget.addItem('b', new Widget());
        const value = widget.insertBefore('c', 'd', new Widget());
        expect(value).toBe(false);
      });
    });

    describe('.createFromCommand', () => {
      const commands = new CommandRegistry();
      const testLogCommandId = 'test:toolbar-log';
      const logArgs: ReadonlyPartialJSONObject[] = [];
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
        className: 'test-log-class',
        isEnabled: () => enabled,
        isToggled: () => toggled,
        isVisible: () => visible
      });

      async function render(button: CommandToolbarButton) {
        button.update();
        await framePromise();
        expect(button.renderPromise).toBeDefined();
        await button.renderPromise;
      }

      it('should create a button', () => {
        const button = new CommandToolbarButton({
          commands,
          id: testLogCommandId
        });
        expect(button).toBeInstanceOf(CommandToolbarButton);
        button.dispose();
      });

      it('should add main class', async () => {
        const button = new CommandToolbarButton({
          commands,
          id: testLogCommandId
        });
        await render(button);
        const buttonNode = button.node.firstChild as HTMLButtonElement;
        expect(buttonNode.classList.contains('test-log-class')).toBe(true);
        button.dispose();
      });

      it('should add an icon with icon class and label', async () => {
        const button = new CommandToolbarButton({
          commands,
          id: testLogCommandId
        });
        await render(button);
        const buttonNode = button.node.firstChild as HTMLButtonElement;
        expect(buttonNode.title).toBe('Test log command caption');
        const iconNode = buttonNode.firstChild as HTMLElement;
        expect(iconNode.classList.contains('test-icon-class')).toBe(true);
        button.dispose();
      });

      it('should apply state classes', async () => {
        enabled = false;
        toggled = true;
        visible = false;
        const button = new CommandToolbarButton({
          commands,
          id: testLogCommandId
        });
        await render(button);
        const buttonNode = button.node.firstChild as HTMLButtonElement;
        expect(buttonNode.disabled).toBe(true);
        expect(buttonNode.classList.contains('lm-mod-toggled')).toBe(true);
        expect(buttonNode.getAttribute('aria-pressed')).toBe('true');
        expect(buttonNode.classList.contains('lm-mod-hidden')).toBe(true);
        button.dispose();
      });

      it('should update state classes', async () => {
        enabled = false;
        toggled = true;
        visible = false;
        const button = new CommandToolbarButton({
          commands,
          id: testLogCommandId
        });
        await render(button);
        const buttonNode = button.node.firstChild as HTMLButtonElement;
        expect(buttonNode.disabled).toBe(true);
        expect(buttonNode.classList.contains('lm-mod-toggled')).toBe(true);
        expect(buttonNode.getAttribute('aria-pressed')).toBe('true');
        expect(buttonNode.classList.contains('lm-mod-hidden')).toBe(true);
        enabled = true;
        visible = true;
        commands.notifyCommandChanged(testLogCommandId);
        await framePromise();
        await button.renderPromise;
        expect(buttonNode.disabled).toBe(false);
        expect(buttonNode.classList.contains('lm-mod-toggled')).toBe(true);
        expect(buttonNode.getAttribute('aria-pressed')).toBe('true');
        expect(buttonNode.classList.contains('lm-mod-hidden')).toBe(false);
        enabled = false;
        visible = false;
        button.dispose();
      });

      it('should use the command label if no icon class/label', async () => {
        const id = 'to-be-removed';
        const cmd = commands.addCommand(id, {
          execute: () => {
            return;
          },
          label: 'Label-only button'
        });
        const button = new CommandToolbarButton({
          commands,
          id
        });
        await render(button);
        const buttonNode = button.node.firstChild as HTMLButtonElement;
        expect(buttonNode.textContent).toBe('Label-only button');
        cmd.dispose();
      });

      it('should update the node content on command change event', async () => {
        const id = 'to-be-removed';
        let iconClassValue: string = '';
        const cmd = commands.addCommand(id, {
          execute: () => {
            /* no op */
          },
          label: 'Label-only button',
          iconClass: () => iconClassValue ?? ''
        });
        const button = new CommandToolbarButton({
          commands,
          id
        });
        await render(button);
        const buttonNode = button.node.firstChild as HTMLButtonElement;
        expect(buttonNode.textContent).toBe('Label-only button');
        expect(buttonNode.classList.contains(iconClassValue)).toBe(false);

        iconClassValue = 'updated-icon-class';
        commands.notifyCommandChanged(id);
        await render(button);
        const iconNode = buttonNode.firstChild as HTMLElement;
        expect(iconNode.classList.contains(iconClassValue)).toBe(true);
        cmd.dispose();
      });
    });
  });

  describe('ReactiveToolbar', () => {
    let toolbar: ReactiveToolbar;

    beforeEach(() => {
      toolbar = new ReactiveToolbar();
      Widget.attach(toolbar, document.body);
    });

    afterEach(() => {
      toolbar.dispose();
    });

    describe('#constructor()', () => {
      it('should append a node to body for the pop-up', () => {
        const popup = document.body.querySelector(
          '.jp-Toolbar-responsive-popup'
        );
        expect(popup).toBeDefined();
        expect(popup!.parentNode!.nodeName).toEqual('BODY');
      });
    });

    describe('#addItem()', () => {
      it('should insert item before the toolbar pop-up button', () => {
        const w = new Widget();
        toolbar.addItem('test', w);
        expect(
          (toolbar.layout as PanelLayout).widgets.findIndex(v => v === w)
        ).toEqual((toolbar.layout as PanelLayout).widgets.length - 2);
      });
    });

    describe('#insertItem()', () => {
      it('should insert item before the toolbar pop-up button', () => {
        const w = new Widget();
        toolbar.insertItem(2, 'test', w);
        expect(
          (toolbar.layout as PanelLayout).widgets.findIndex(v => v === w)
        ).toEqual((toolbar.layout as PanelLayout).widgets.length - 2);
      });
    });

    describe('#insertAfter()', () => {
      it('should not insert item after the toolbar pop-up button', () => {
        const w = new Widget();
        const r = toolbar.insertAfter('toolbar-popup-opener', 'test', w);
        expect(r).toEqual(false);
        expect(
          (toolbar.layout as PanelLayout).widgets.findIndex(v => v === w)
        ).toEqual(-1);
      });
    });

    describe('#storedPositions', () => {
      it('should store the correct position of items', () => {
        const w = new Widget();
        const names = ['test0', 'test1', 'test2', 'test3'];
        for (let i = 0; i < 3; i++) {
          toolbar.insertItem(i, names[i], w);
        }
        toolbar.insertItem(1, names[3], w);
        const positions = (toolbar as any)._widgetPositions;
        let stored: number[] = [];
        for (let i = 0; i < 4; i++) {
          stored.push(positions.get(names[i]));
        }
        expect(stored).toEqual([0, 2, 3, 1]);
      });

      it('should not store unexpected index', () => {
        const w = new Widget();
        const names = ['test0', 'test1', 'test2', 'test3'];
        for (let i = 0; i < 2; i++) {
          toolbar.insertItem(i, names[i], w);
        }
        toolbar.insertItem(-5, names[2], w);
        toolbar.insertItem(10, names[3], w);
        const positions = (toolbar as any)._widgetPositions;
        let stored: number[] = [];
        for (let i = 0; i < 4; i++) {
          stored.push(positions.get(names[i]));
        }
        expect(stored).toEqual([1, 2, 0, 3]);
      });
    });
  });

  describe('ToolbarButton', () => {
    describe('#constructor()', () => {
      it('should accept no arguments', () => {
        const widget = new ToolbarButton();
        expect(widget).toBeInstanceOf(ToolbarButton);
      });

      it('should accept options', async () => {
        const widget = new ToolbarButton({
          className: 'foo',
          iconClass: 'iconFoo',
          onClick: () => {
            return void 0;
          },
          tooltip: 'bar'
        });
        Widget.attach(widget, document.body);
        await framePromise();
        await widget.renderPromise;

        const button = widget.node.firstChild as HTMLElement;
        expect(button.classList.contains('foo')).toBe(true);
        expect(button.querySelector('.iconFoo')).toBeDefined();
        expect(button.title).toBe('bar');
      });
    });

    describe('#dispose()', () => {
      it('should dispose of the resources used by the widget', () => {
        const button = new ToolbarButton();
        button.dispose();
        expect(button.isDisposed).toBe(true);
      });

      it('should be safe to call more than once', () => {
        const button = new ToolbarButton();
        button.dispose();
        button.dispose();
        expect(button.isDisposed).toBe(true);
      });
    });

    describe('#handleEvent()', () => {
      describe('click', () => {
        it('should activate the callback', async () => {
          let called = false;
          const button = new ToolbarButton({
            onClick: () => {
              called = true;
            }
          });
          Widget.attach(button, document.body);
          await framePromise();
          await button.renderPromise;
          simulate(button.node.firstChild as HTMLElement, 'click');
          expect(called).toBe(true);
          button.dispose();
        });
      });
      describe('mousedown', () => {
        it('should not activate the callback on mouse down', async () => {
          let called = false;
          const button = new ToolbarButton({
            onClick: () => {
              called = true;
            }
          });
          Widget.attach(button, document.body);
          await framePromise();
          await button.renderPromise;
          simulate(button.node.firstChild as HTMLElement, 'mousedown');
          expect(called).toBe(false);
          button.dispose();
        });
        it('should activate the callback on mouse down', async () => {
          let called = false;
          const button = new ToolbarButton({
            onClick: () => {
              called = true;
            },
            noFocusOnClick: true
          });
          Widget.attach(button, document.body);
          await framePromise();
          await button.renderPromise;
          simulate(button.node.firstChild as HTMLElement, 'mousedown');
          expect(called).toBe(true);
          button.dispose();
        });
      });
      describe('keydown', () => {
        it('Enter should activate the callback', async () => {
          let called = false;
          const button = new ToolbarButton({
            onClick: () => {
              called = true;
            }
          });
          Widget.attach(button, document.body);
          await framePromise();
          simulate(button.node.firstChild as HTMLElement, 'keydown', {
            key: 'Enter'
          });
          expect(called).toBe(true);
          button.dispose();
        });
        it('Space should activate the callback', async () => {
          let called = false;
          const button = new ToolbarButton({
            onClick: () => {
              called = true;
            }
          });
          Widget.attach(button, document.body);
          await framePromise();
          simulate(button.node.firstChild as HTMLElement, 'keydown', {
            key: ' '
          });
          expect(called).toBe(true);
          button.dispose();
        });
      });
    });

    describe('#onAfterAttach()', () => {
      it.skip('should add event listeners to the node', () => {
        // const button = new LogToolbarButton();
        // Widget.attach(button, document.body);
        // expect(button.methods).to.contain('onAfterAttach');
        // simulate(button.node, 'click');
        // expect(button.events).to.contain('click');
        // button.dispose();
      });
    });

    describe('#onBeforeDetach()', () => {
      it.skip('should remove event listeners from the node', async () => {
        // const button = new LogToolbarButton();
        // Widget.attach(button, document.body);
        // await framePromise();
        // Widget.detach(button);
        // expect(button.methods).to.contain('onBeforeDetach');
        // simulate(button.node, 'click');
        // expect(button.events).to.not.contain('click');
        // button.dispose();
      });
    });

    describe('#pressed()', () => {
      it('should update the pressed state', async () => {
        const widget = new ToolbarButton({
          icon: bugIcon,
          tooltip: 'tooltip',
          pressedTooltip: 'pressed tooltip',
          pressedIcon: bugDotIcon
        });
        Widget.attach(widget, document.body);
        await framePromise();
        const button = widget.node.firstChild as HTMLElement;
        expect(widget.pressed).toBe(false);
        expect(button.title).toBe('tooltip');
        expect(button.getAttribute('aria-pressed')).toEqual('false');
        let icon = button.querySelectorAll('svg');
        expect(icon[0].getAttribute('data-icon')).toEqual('ui-components:bug');
        widget.pressed = true;
        await framePromise();
        await widget.renderPromise;
        expect(widget.pressed).toBe(true);
        expect(button.title).toBe('pressed tooltip');
        expect(button.getAttribute('aria-pressed')).toEqual('true');
        icon = button.querySelectorAll('svg');
        expect(icon[0].getAttribute('data-icon')).toEqual(
          'ui-components:bug-dot'
        );
        widget.dispose();
      });

      it('should not have the pressed state when not enabled', async () => {
        const widget = new ToolbarButton({
          icon: bugIcon,
          tooltip: 'tooltip',
          pressedTooltip: 'pressed tooltip',
          disabledTooltip: 'disabled tooltip',
          pressedIcon: bugDotIcon,
          enabled: false
        });
        Widget.attach(widget, document.body);
        await framePromise();
        const button = widget.node.firstChild as HTMLElement;
        expect(widget.pressed).toBe(false);
        expect(button.title).toBe('disabled tooltip');
        expect(button.getAttribute('aria-pressed')).toEqual('false');
        widget.pressed = true;
        await framePromise();
        expect(widget.pressed).toBe(false);
        expect(button.title).toBe('disabled tooltip');
        expect(button.getAttribute('aria-pressed')).toEqual('false');
        const icon = button.querySelectorAll('svg');
        expect(icon[0].getAttribute('data-icon')).toEqual('ui-components:bug');
        widget.dispose();
      });
    });

    describe('#enabled()', () => {
      it('should update the enabled state', async () => {
        const widget = new ToolbarButton({
          icon: bugIcon,
          tooltip: 'tooltip',
          pressedTooltip: 'pressed tooltip',
          disabledTooltip: 'disabled tooltip',
          pressedIcon: bugDotIcon
        });
        Widget.attach(widget, document.body);
        await framePromise();
        const button = widget.node.firstChild as HTMLElement;
        expect(widget.enabled).toBe(true);
        expect(widget.pressed).toBe(false);
        expect(button.getAttribute('aria-disabled')).toEqual('false');

        widget.pressed = true;
        await framePromise();
        expect(widget.pressed).toBe(true);

        widget.enabled = false;
        await framePromise();
        await widget.renderPromise;
        expect(widget.enabled).toBe(false);
        expect(widget.pressed).toBe(false);
        expect(button.getAttribute('aria-disabled')).toEqual('true');
        widget.dispose();
      });
    });

    describe('#onClick()', () => {
      it('should update the onClick state', async () => {
        let mockCalled = false;
        const mockOnClick = () => {
          mockCalled = true;
        };
        const widget = new ToolbarButton({
          icon: bugIcon,
          tooltip: 'tooltip',
          onClick: mockOnClick
        });
        Widget.attach(widget, document.body);
        await framePromise();
        simulate(widget.node.firstChild as HTMLElement, 'click');
        expect(mockCalled).toBe(true);

        mockCalled = false;
        let mockUpdatedCalled = false;
        const mockOnClickUpdated = () => {
          mockUpdatedCalled = true;
        };
        widget.onClick = mockOnClickUpdated;
        await framePromise();
        await widget.renderPromise;
        simulate(widget.node.firstChild as HTMLElement, 'click');
        expect(mockCalled).toBe(false);
        expect(mockUpdatedCalled).toBe(true);
        widget.dispose();
      });
    });
  });
});
