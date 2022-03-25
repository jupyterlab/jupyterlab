// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { CellMenu } from '@jupyterlab/cell-toolbar';
import { ToolbarButton } from '@jupyterlab/ui-components';

import { CommandRegistry } from '@lumino/commands';
import { PanelLayout } from '@lumino/widgets';

describe('@jupyterlab/cell-toolbar', () => {
  describe('CellMenu', () => {
    let commands: CommandRegistry;
    let cellMenu: CellMenu;

    beforeAll(() => {
      commands = new CommandRegistry();
      commands.addCommand('notebook:move-cell-up', {
        execute: args => null
      });
      commands.addCommand('notebook:move-cell-down', {
        execute: args => null
      });
    });

    afterEach(() => {
      if (cellMenu) {
        cellMenu.dispose();
      }
    });

    describe('#constructor()', () => {
      it('should create an empty cell menu widget', () => {
        cellMenu = new CellMenu(commands, []);
        expect(cellMenu).toBeInstanceOf(CellMenu);
      });

      it('should create a cell menu with toolbar buttons in it', () => {
        const items = [
          {
            command: 'notebook:move-cell-up',
            icon: 'ui-components:move-up',
            tooltip: 'Move Cell Up'
          },
          {
            command: 'notebook:move-cell-down',
            icon: 'ui-components:move-down',
            tooltip: 'Move Cell Down'
          }
        ];
        cellMenu = new CellMenu(commands, items);
        const menuLayout = (cellMenu.layout as PanelLayout).widgets;
        expect(menuLayout.length).toBe(2);
        expect(menuLayout[0]).toBeInstanceOf(ToolbarButton);
        expect(menuLayout[1]).toBeInstanceOf(ToolbarButton);
      });
    });
  });
});
