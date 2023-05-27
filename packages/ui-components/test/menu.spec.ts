// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { IRankedMenu, RankedMenu } from '@jupyterlab/ui-components';
import { ArrayExt } from '@lumino/algorithm';
import { CommandRegistry } from '@lumino/commands';
import { Menu } from '@lumino/widgets';

describe('@jupyterlab/ui-components', () => {
  describe('IRankedMenu', () => {
    let commands: CommandRegistry;
    const id = 'test-command';
    const options: CommandRegistry.ICommandOptions = {
      execute: jest.fn()
    };

    beforeAll(() => {
      commands = new CommandRegistry();
      commands.addCommand(id, options);
    });
    describe('#addItem', () => {
      it('should return a disposable item', () => {
        const menu = new RankedMenu({ commands }) as IRankedMenu;

        const item = menu.addItem({ command: id });

        expect(menu.items.length).toEqual(1);

        item.dispose();

        expect(menu.items.length).toEqual(0);
      });
    });
  });

  describe('RankedMenu', () => {
    let commands: CommandRegistry;
    let menu: RankedMenu;

    beforeAll(() => {
      commands = new CommandRegistry();
      commands.addCommand('run1', {
        label: 'Run 1',
        execute: () => void 0
      });
      commands.addCommand('run2', {
        label: 'Run 2',
        execute: () => void 0
      });
      commands.addCommand('run3', {
        label: 'Run 3',
        execute: () => void 0
      });
      commands.addCommand('run4', {
        label: 'Run 4',
        execute: () => void 0
      });
    });

    beforeEach(() => {
      menu = new RankedMenu({ commands });
    });

    afterEach(() => {
      menu.dispose();
    });

    describe('#constructor()', () => {
      it('should construct a new main menu', () => {
        expect(menu).toBeInstanceOf(RankedMenu);
        expect(menu).toBeInstanceOf(Menu);
      });

      it('should accept useSeparators as an option', () => {
        const menu1 = new RankedMenu({
          commands,
          includeSeparators: false
        });
        const menu2 = new RankedMenu({ commands, includeSeparators: true });
        menu1.addGroup([{ command: 'run1' }, { command: 'run2' }]);
        menu2.addGroup([{ command: 'run1' }, { command: 'run2' }]);

        expect(menu1.items.length).toBe(2);
        expect(menu2.items.length).toBe(4);
      });

      it('should accept rank as an option', () => {
        const menu = new RankedMenu({ commands, rank: 22 });
        expect(menu.rank).toEqual(22);
      });

      it('should have rank undefined by default', () => {
        const menu = new RankedMenu({ commands });
        expect(menu.rank).toBeUndefined();
      });
    });

    describe('#rank', () => {
      it('should have a read-only rank', () => {
        expect(() => {
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          menu.rank = 42;
        }).toThrow();
      });
    });

    describe('#addGroup()', () => {
      it('should add a new group to the menu', () => {
        menu.addGroup([{ command: 'run1' }, { command: 'run2' }]);

        const idx1 = ArrayExt.findFirstIndex(
          menu.items,
          m => m.command === 'run1'
        );
        const idx2 = ArrayExt.findFirstIndex(
          menu.items,
          m => m.command === 'run2'
        );

        expect(idx1 === -1).toBe(false);
        expect(idx2 === -1).toBe(false);
        expect(idx1 > idx2).toBe(false);
      });

      it('should take a rank as an option', () => {
        menu.addGroup([{ command: 'run1' }, { command: 'run2' }], 2);
        menu.addGroup([{ command: 'run3' }, { command: 'run4' }], 1);

        const idx1 = ArrayExt.findFirstIndex(
          menu.items,
          m => m.command === 'run1'
        );
        const idx2 = ArrayExt.findFirstIndex(
          menu.items,
          m => m.command === 'run2'
        );
        const idx3 = ArrayExt.findFirstIndex(
          menu.items,
          m => m.command === 'run3'
        );
        const idx4 = ArrayExt.findFirstIndex(
          menu.items,
          m => m.command === 'run4'
        );
        expect(idx3 < idx4).toBe(true);
        expect(idx4 < idx1).toBe(true);
        expect(idx1 < idx2).toBe(true);
      });

      it('should return a disposable that can be used to remove the group', () => {
        const group1 = [{ command: 'run1' }, { command: 'run2' }];
        const group2 = [{ command: 'run3' }, { command: 'run4' }];
        const disposable = menu.addGroup(group1);
        menu.addGroup(group2);
        disposable.dispose();

        const idx1 = ArrayExt.findFirstIndex(
          menu.items,
          m => m.command === 'run1'
        );
        const idx2 = ArrayExt.findFirstIndex(
          menu.items,
          m => m.command === 'run2'
        );
        const idx3 = ArrayExt.findFirstIndex(
          menu.items,
          m => m.command === 'run3'
        );
        const idx4 = ArrayExt.findFirstIndex(
          menu.items,
          m => m.command === 'run4'
        );

        expect(idx1).toBe(-1);
        expect(idx2).toBe(-1);
        expect(idx3 === -1).toBe(false);
        expect(idx4 === -1).toBe(false);
      });
    });

    describe('#addItem()', () => {
      it('should use the provided rank to position the item', () => {
        menu.addItem({ command: 'run1', rank: 1000 });
        menu.addItem({ command: 'run2', rank: 10 });

        expect(menu.getRankAt(0)).toEqual(10);
        expect(menu.getRankAt(1)).toEqual(1000);
      });

      it('should append the item at the end if no rank is provided', () => {
        menu.addItem({ command: 'run1', rank: 10 });

        menu.addItem({ command: 'run3' });

        expect(menu.items[1].command).toEqual('run3');
        expect(menu.getRankAt(1)).toEqual(100);

        menu.addItem({ command: 'run2', rank: 1000 });
        // Set a rank to n-1 element if it is higher than the default

        menu.addItem({ command: 'run4' });

        expect(menu.items[3].command).toEqual('run4');
        expect(menu.getRankAt(3)).toEqual(1000);
      });
    });
  });
});
