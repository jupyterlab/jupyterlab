// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Palette } from '../src/palette';
import { CommandPalette } from '@lumino/widgets';

describe('palette', () => {
  let palette: Palette;
  let commandPalette: CommandPalette;

  beforeEach(() => {
    palette = new Palette(commandPalette);
  });

  describe('#ariaLabelsAndRoles', () => {
    it('command palette should have aria-label and role for accessibility', () => {
      palette.activate();
      const node = document.getElementById('command-palette');
      expect(node?.getAttribute('aria-label')).toEqual(
        'Command Palette Section'
      );
      expect(node?.getAttribute('role')).toEqual('region');
    });
  });
});
