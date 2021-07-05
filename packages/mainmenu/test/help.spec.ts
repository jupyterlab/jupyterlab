// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { HelpMenu } from '@jupyterlab/mainmenu';
import { CommandRegistry } from '@lumino/commands';

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
        // For localization this is now defined when on the mainmenu-extension.
        expect(menu.title.label).toBe('');
      });
    });
  });
});
