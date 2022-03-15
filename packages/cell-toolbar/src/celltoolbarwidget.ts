import { CommandRegistry } from '@lumino/commands';
import { PanelLayout, Widget } from '@lumino/widgets';
import { CellMenu } from './cellmenu';
import { ICellMenuItem } from './tokens';

/**
 * Cell Toolbar Widget
 */
export class CellToolbarWidget extends Widget {
  constructor(commands: CommandRegistry, menuItems: ICellMenuItem[]) {
    super();
    this.layout = new PanelLayout();
    this.addClass('jp-cell-toolbar');

    (this.layout as PanelLayout).addWidget(new CellMenu(commands, menuItems));
  }
}
