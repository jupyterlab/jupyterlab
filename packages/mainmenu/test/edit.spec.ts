// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { EditMenu } from '@jupyterlab/mainmenu';
import { CommandRegistry } from '@lumino/commands';

describe('@jupyterlab/mainmenu', () => {
  describe('EditMenu', () => {
    let commands: CommandRegistry;
    let menu: EditMenu;

    beforeAll(() => {
      commands = new CommandRegistry();
    });

    beforeEach(() => {
      menu = new EditMenu({ commands });
    });

    afterEach(() => {
      menu.dispose();
    });

    describe('#constructor()', () => {
      it('should construct a new edit menu', () => {
        expect(menu).toBeInstanceOf(EditMenu);
        // For localization this is now defined when on the mainmenu-extension.
        expect(menu.title.label).toBe('');
      });
    });
  });
});
