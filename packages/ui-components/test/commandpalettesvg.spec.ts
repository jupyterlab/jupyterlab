// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { CommandPaletteSvg } from '@jupyterlab/ui-components';
import { CommandRegistry } from '@lumino/commands';
import { VirtualDOM } from '@lumino/virtualdom';
import { CommandPalette } from '@lumino/widgets';

describe('@jupyterlab/ui-components', () => {
  describe('CommandPaletteSvg.Renderer', () => {
    let commands: CommandRegistry;
    let palette: CommandPalette;
    let item: CommandPalette.IItem;
    let toggleableItem: CommandPalette.IItem;
    let recents: CommandPalette.IItem[];
    const renderer = new CommandPaletteSvg.Renderer({
      isRecent: candidate => recents.includes(candidate)
    });

    beforeEach(() => {
      commands = new CommandRegistry();
      commands.addCommand('test', {
        execute: () => void 0,
        label: 'Test Command'
      });
      commands.addCommand('test:toggleable', {
        execute: () => void 0,
        label: 'Toggleable Command',
        isToggleable: true,
        isToggled: () => true
      });
      palette = new CommandPalette({ commands });
      item = palette.addItem({ command: 'test', category: 'Test' });
      toggleableItem = palette.addItem({
        command: 'test:toggleable',
        category: 'Test'
      });
      recents = [];
    });

    afterEach(() => {
      palette.dispose();
    });

    describe('#renderItem()', () => {
      it('should render a badge for a recently executed command item', () => {
        recents = [item];
        const vNode = renderer.renderItem({
          item,
          indices: null,
          active: false
        });
        const node = VirtualDOM.realize(vNode);
        const badge = node.querySelector('.jp-CommandPalette-recentBadge');
        expect(badge).not.toBeNull();
        expect(badge!.textContent).toBe('recently used');
        // The badge is rendered between the item content and the shortcut.
        expect(
          badge!.previousElementSibling!.classList.contains(
            'lm-CommandPalette-itemContent'
          )
        ).toBe(true);
        expect(
          badge!.nextElementSibling!.classList.contains(
            'lm-CommandPalette-itemShortcut'
          )
        ).toBe(true);
      });

      it('should not render a badge for other items', () => {
        recents = [toggleableItem];
        const vNode = renderer.renderItem({
          item,
          indices: null,
          active: false
        });
        const node = VirtualDOM.realize(vNode);
        expect(node.querySelector('.jp-CommandPalette-recentBadge')).toBeNull();
      });

      it('should not render a badge when no isRecent function is provided', () => {
        const vNode = CommandPaletteSvg.defaultRenderer.renderItem({
          item,
          indices: null,
          active: false
        });
        const node = VirtualDOM.realize(vNode);
        expect(node.querySelector('.jp-CommandPalette-recentBadge')).toBeNull();
      });

      it('should preserve the toggleable state of recently executed items', () => {
        recents = [toggleableItem];
        const vNode = renderer.renderItem({
          item: toggleableItem,
          indices: null,
          active: false
        });
        const node = VirtualDOM.realize(vNode);
        expect(node.getAttribute('role')).toBe('menuitemcheckbox');
        expect(node.getAttribute('aria-checked')).toBe('true');
        expect(
          node.querySelector('.jp-CommandPalette-recentBadge')
        ).not.toBeNull();
      });
    });
  });
});
