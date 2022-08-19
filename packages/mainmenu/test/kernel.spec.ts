// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { KernelMenu } from '@jupyterlab/mainmenu';
import { CommandRegistry } from '@lumino/commands';

describe('@jupyterlab/mainmenu', () => {
  describe('KernelMenu', () => {
    let commands: CommandRegistry;
    let menu: KernelMenu;

    beforeAll(() => {
      commands = new CommandRegistry();
    });

    beforeEach(() => {
      menu = new KernelMenu({ commands });
    });

    afterEach(() => {
      menu.dispose();
    });

    describe('#constructor()', () => {
      it('should construct a new kernel menu', () => {
        expect(menu).toBeInstanceOf(KernelMenu);
        // For localization this is now defined when on the mainmenu-extension.
        expect(menu.title.label).toBe('');
      });
    });
  });
});
