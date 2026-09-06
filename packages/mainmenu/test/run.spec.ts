// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { RunMenu } from '@jupyterlab/mainmenu';
import { CommandRegistry } from '@lumino/commands';

describe('@jupyterlab/mainmenu', () => {
  describe('RunMenu', () => {
    let commands: CommandRegistry;
    let menu: RunMenu;

    beforeAll(() => {
      commands = new CommandRegistry();
    });

    beforeEach(() => {
      menu = new RunMenu({ commands });
    });

    afterEach(() => {
      menu.dispose();
    });

    describe('#constructor()', () => {
      it('should construct a new run menu', () => {
        expect(menu).toBeInstanceOf(RunMenu);
        // For localization this is now defined when on the mainmenu-extension.
        expect(menu.title.label).toBe('');
      });
    });
  });
});
