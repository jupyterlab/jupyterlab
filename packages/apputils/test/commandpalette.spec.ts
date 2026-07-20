// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ModalCommandPalette,
  RecentsCommandPalette
} from '@jupyterlab/apputils';
import type { ITranslator } from '@jupyterlab/translation';
import { nullTranslator } from '@jupyterlab/translation';
import { CommandPaletteSvg, paletteIcon } from '@jupyterlab/ui-components';
import { CommandRegistry } from '@lumino/commands';
import type { JSONObject } from '@lumino/coreutils';
import { MessageLoop } from '@lumino/messaging';
import { CommandPalette, Widget } from '@lumino/widgets';
import { simulate } from 'simulate-event';

describe('@jupyterlab/apputils', () => {
  describe('ModalCommandPalette', () => {
    let commands: CommandRegistry;
    let translator: ITranslator;
    let palette: CommandPalette;
    let modalPalette: ModalCommandPalette;

    beforeEach(() => {
      commands = new CommandRegistry();
      translator = nullTranslator;
      palette = new CommandPalette({
        commands: commands,
        renderer: CommandPaletteSvg.defaultRenderer
      });
      palette.id = 'command-palette';
      palette.title.icon = paletteIcon;
      const trans = translator.load('jupyterlab');
      palette.title.label = trans.__('Commands');
      modalPalette = new ModalCommandPalette({ commandPalette: palette });
      modalPalette.attach();
    });

    describe('#constructor()', () => {
      it('should create a new command palette', () => {
        expect(palette).toBeInstanceOf(CommandPalette);
      });
      it('should create a new modal command palette', () => {
        expect(modalPalette).toBeInstanceOf(ModalCommandPalette);
      });
      it('should attach to the document body', () => {
        expect(document.body.contains(modalPalette.node)).toBe(true);
      });
      it('should start hidden', () => {
        expect(modalPalette.isHidden).toBe(true);
      });
    });

    describe('#activate()', () => {
      it('should become visible when activated', () => {
        MessageLoop.sendMessage(modalPalette, Widget.Msg.ActivateRequest);
        expect(modalPalette.isVisible).toBe(true);
      });
    });

    describe('#hideAndReset()', () => {
      it('should become hidden and clear the input when calling hideAndReset', () => {
        MessageLoop.sendMessage(modalPalette, Widget.Msg.ActivateRequest);
        palette.inputNode.value = 'Search string…';
        modalPalette.hideAndReset();
        expect(modalPalette.isVisible).toBe(false);
        expect(palette.inputNode.value).toEqual('');
      });
    });

    describe('#blur()', () => {
      it('should hide and reset when focus is shifted', () => {
        MessageLoop.sendMessage(modalPalette, Widget.Msg.ActivateRequest);
        palette.inputNode.value = 'Search string…';
        simulate(modalPalette.node, 'blur', {
          relatedTarget: document.body
        });
        expect(modalPalette.isVisible).toBe(false);
        expect(palette.inputNode.value).toEqual('');
      });
    });

    describe('#escape()', () => {
      it('should hide and reset when ESC is pressed', () => {
        MessageLoop.sendMessage(modalPalette, Widget.Msg.ActivateRequest);
        palette.inputNode.value = 'Search string…';
        simulate(modalPalette.node, 'keydown', { key: 'Escape' });
        expect(modalPalette.isVisible).toBe(false);
        expect(palette.inputNode.value).toEqual('');
      });
    });

    describe('#execute()', () => {
      it('should hide and reset when a command is executed', () => {
        commands.addCommand('mock-command', {
          execute: (args: JSONObject) => {
            return args;
          }
        });
        MessageLoop.sendMessage(modalPalette, Widget.Msg.ActivateRequest);
        void commands.execute('mock-command');
        expect(modalPalette.isVisible).toBe(false);
        expect(palette.inputNode.value).toEqual('');
      });
    });
  });

  describe('RecentsCommandPalette', () => {
    let commands: CommandRegistry;
    let palette: RecentsCommandPalette;
    let itemA: CommandPalette.IItem;
    let itemB: CommandPalette.IItem;
    let enabled: boolean;

    const click = (node: Element): void => {
      node.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      MessageLoop.flush();
    };

    const itemNode = (command: string): Element => {
      return palette.contentNode.querySelector(`[data-command="${command}"]`)!;
    };

    beforeEach(() => {
      enabled = true;
      commands = new CommandRegistry();
      commands.addCommand('test:a', {
        label: 'Alpha',
        execute: () => void 0
      });
      commands.addCommand('test:b', {
        label: 'Beta',
        execute: () => void 0,
        isEnabled: () => enabled
      });
      palette = new RecentsCommandPalette({ commands });
      itemA = palette.addItem({ command: 'test:a', category: 'One' });
      itemB = palette.addItem({ command: 'test:b', category: 'Two' });
      Widget.attach(palette, document.body);
      MessageLoop.flush();
    });

    afterEach(() => {
      palette.dispose();
    });

    describe('#constructor()', () => {
      it('should default the limit of recently executed commands to 5', () => {
        expect(palette.maxRecentCommands).toBe(5);
      });

      it('should accept a limit of recently executed commands', () => {
        const recents = new RecentsCommandPalette({
          commands,
          maxRecentCommands: 3
        });
        expect(recents.maxRecentCommands).toBe(3);
        recents.dispose();
      });
    });

    describe('#maxRecentCommands', () => {
      it('should normalize the limit to a non-negative integer', () => {
        palette.maxRecentCommands = -3;
        expect(palette.maxRecentCommands).toBe(0);
        palette.maxRecentCommands = 2.7;
        expect(palette.maxRecentCommands).toBe(2);
        palette.maxRecentCommands = NaN;
        expect(palette.maxRecentCommands).toBe(0);
      });

      it('should drop the oldest commands which exceed the new limit', () => {
        click(itemNode('test:b'));
        click(itemNode('test:a'));
        palette.maxRecentCommands = 1;
        MessageLoop.flush();
        const children = palette.contentNode.children;
        expect(children[0].getAttribute('data-command')).toBe('test:a');
        expect(children[1].classList.contains('lm-CommandPalette-header')).toBe(
          true
        );
      });

      it('should disable the tracking and clear the history when set to 0', () => {
        click(itemNode('test:b'));
        expect(palette.isRecent(itemB)).toBe(true);
        palette.maxRecentCommands = 0;
        MessageLoop.flush();
        const first = palette.contentNode.firstElementChild!;
        expect(first.classList.contains('lm-CommandPalette-header')).toBe(true);
        click(itemNode('test:b'));
        expect(palette.isRecent(itemB)).toBe(false);
      });
    });

    describe('#isRecent()', () => {
      it('should test whether an item is a recently executed command', () => {
        click(itemNode('test:b'));
        expect(palette.isRecent(itemB)).toBe(true);
        expect(palette.isRecent(itemA)).toBe(false);
      });
    });

    describe('#search()', () => {
      it('should pin an executed command to the top without a header', () => {
        let first = palette.contentNode.firstElementChild!;
        expect(first.classList.contains('lm-CommandPalette-header')).toBe(true);

        click(itemNode('test:b'));

        first = palette.contentNode.firstElementChild!;
        expect(first.classList.contains('lm-CommandPalette-item')).toBe(true);
        expect(first.getAttribute('data-command')).toBe('test:b');
        expect(
          palette.contentNode.querySelectorAll('[data-command="test:b"]').length
        ).toBe(1);
      });

      it('should move the most recently executed command to the front', () => {
        click(itemNode('test:b'));
        click(itemNode('test:a'));
        let children = palette.contentNode.children;
        expect(children[0].getAttribute('data-command')).toBe('test:a');
        expect(children[1].getAttribute('data-command')).toBe('test:b');

        click(itemNode('test:b'));
        children = palette.contentNode.children;
        expect(children[0].getAttribute('data-command')).toBe('test:b');
        expect(children[1].getAttribute('data-command')).toBe('test:a');
      });

      it('should use the default results while searching', () => {
        click(itemNode('test:b'));

        // Both `Alpha` and `Beta` match the query `a`, in that order.
        palette.inputNode.value = 'a';
        palette.refresh();
        MessageLoop.flush();

        const children = palette.contentNode.children;
        expect(children[0].classList.contains('lm-CommandPalette-header')).toBe(
          true
        );
        expect(children[1].getAttribute('data-command')).toBe('test:a');
        expect(palette.isRecent(itemB)).toBe(true);
      });

      it('should not pin a disabled command', () => {
        click(itemNode('test:b'));
        enabled = false;
        palette.refresh();
        MessageLoop.flush();

        const first = palette.contentNode.firstElementChild!;
        expect(first.classList.contains('lm-CommandPalette-header')).toBe(true);
        expect(itemNode('test:b')).not.toBeNull();
      });

      it('should not pin a command removed from the palette', () => {
        click(itemNode('test:b'));
        palette.removeItem(itemB);
        MessageLoop.flush();

        const first = palette.contentNode.firstElementChild!;
        expect(first.classList.contains('lm-CommandPalette-header')).toBe(true);
        expect(itemNode('test:b')).toBeNull();
      });

      it('should track items with the same command but different args separately', () => {
        commands.addCommand('test:c', {
          label: args => `C ${args['n']}`,
          execute: () => void 0
        });
        const recents = new RecentsCommandPalette({ commands });
        recents.addItem({ command: 'test:c', category: 'One', args: { n: 1 } });
        recents.addItem({ command: 'test:c', category: 'Two', args: { n: 2 } });
        Widget.attach(recents, document.body);
        MessageLoop.flush();

        const labels = () => {
          return Array.from(
            recents.contentNode.querySelectorAll('.lm-CommandPalette-itemLabel')
          ).map(node => node.textContent);
        };
        const clickLabel = (label: string): void => {
          const node = Array.from(
            recents.contentNode.querySelectorAll('.lm-CommandPalette-item')
          ).find(candidate => candidate.textContent!.includes(label))!;
          node.dispatchEvent(new MouseEvent('click', { bubbles: true }));
          MessageLoop.flush();
        };

        clickLabel('C 1');
        clickLabel('C 2');
        expect(labels()).toEqual(['C 2', 'C 1']);

        clickLabel('C 1');
        expect(labels()).toEqual(['C 1', 'C 2']);

        recents.dispose();
      });
    });
  });
});
