// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ViewMenu } from '@jupyterlab/mainmenu';
import { CommandRegistry } from '@lumino/commands';

describe('@jupyterlab/mainmenu', () => {
  describe('ViewMenu', () => {
    let commands: CommandRegistry;
    let menu: ViewMenu;

    beforeAll(() => {
      commands = new CommandRegistry();
    });

    beforeEach(() => {
      menu = new ViewMenu({ commands });
    });

    afterEach(() => {
      menu.dispose();
    });

    describe('#constructor()', () => {
      it('should construct a new view menu', () => {
        expect(menu).toBeInstanceOf(ViewMenu);
        // For localization this is now defined when on the mainmenu-extension.
        expect(menu.title.label).toBe('');
      });
    });
  });
});
