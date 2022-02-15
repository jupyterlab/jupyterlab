import { CommandRegistry } from '@lumino/commands';
import { PanelLayout, Widget } from '@lumino/widgets';
import { CellMenu } from './cellmenu';
import { ICellMenuItem } from './tokens';

/**
 * Cell Toolbar Widget
 */
export class CellToolbarWidget extends Widget {
  constructor(
    commands: CommandRegistry,
    menuItems: ICellMenuItem[],
  ) {
    super();
    this.layout = new PanelLayout();
    this.addClass('jp-enh-cell-toolbar');

    (this.layout as PanelLayout).addWidget(
      new CellMenu(commands, menuItems)
    );

    // Set style
    this.node.style.position = 'absolute';
    this.node.style.top = '5px';
    this.node.style.right = '8px';
  }
}
