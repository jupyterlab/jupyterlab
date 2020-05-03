// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import 'jest';

import { CommandRegistry } from '@lumino/commands';

import { HelpMenu } from '@jupyterlab/mainmenu';

describe('@jupyterlab/mainmenu', () => {
  describe('HelpMenu', () => {
    let commands: CommandRegistry;
    let menu: HelpMenu;

    beforeAll(() => {
      commands = new CommandRegistry();
    });

    beforeEach(() => {
      menu = new HelpMenu({ commands });
    });

    afterEach(() => {
      menu.dispose();
    });

    describe('#constructor()', () => {
      it('should construct a new help menu', () => {
        expect(menu).toBeInstanceOf(HelpMenu);
        expect(menu.menu.title.label).toBe('Help');
      });
    });
  });
});
