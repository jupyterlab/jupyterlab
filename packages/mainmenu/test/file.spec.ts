// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { FileMenu } from '@jupyterlab/mainmenu';
import { CommandRegistry } from '@lumino/commands';

describe('@jupyterlab/mainmenu', () => {
  describe('FileMenu', () => {
    let commands: CommandRegistry;
    let menu: FileMenu;

    beforeAll(() => {
      commands = new CommandRegistry();
    });

    beforeEach(() => {
      menu = new FileMenu({ commands });
    });

    afterEach(() => {
      menu.dispose();
    });

    describe('#constructor()', () => {
      it('should construct a new file menu', () => {
        expect(menu).toBeInstanceOf(FileMenu);
        // For localization this is now defined when on the mainmenu-extension.
        expect(menu.title.label).toBe('');
      });
    });

    describe('#newMenu', () => {
      it('should be a submenu for `New...` commands', () => {
        // For localization this is now defined when on the mainmenu-extension.
        expect(menu.newMenu.title.label).toBe('');
      });
    });
  });
});
