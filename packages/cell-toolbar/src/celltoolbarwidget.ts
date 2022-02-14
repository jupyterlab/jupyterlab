import { Toolbar } from '@jupyterlab/ui-components';
import { CommandRegistry } from '@lumino/commands';
import { PanelLayout, Widget } from '@lumino/widgets';
import { CellMenu } from './cellmenu';
import { ICellMenuItem } from './tokens';
import { getCSSVar } from './utils';

/**
 * Cell Toolbar Widget
 */
export class CellToolbarWidget extends Widget {
  constructor(
    commands: CommandRegistry,
    leftMenuItems: ICellMenuItem[],
  ) {
    super();
    this.layout = new PanelLayout();
    this.addClass('jp-enh-cell-toolbar');

    // Add a spacer at the beginning
    (this.layout as PanelLayout).addWidget(Toolbar.createSpacerItem());

    (this.layout as PanelLayout).addWidget(
      new CellMenu(commands, leftMenuItems)
    );

    // Set style
    this.node.style.position = 'absolute';
    this.node.style.top = '-8px';
    this.node.style.left = `calc(( 100% - ${getCSSVar(
      '--jp-cell-collapser-width'
    )} - ${getCSSVar('--jp-cell-prompt-width')} - ${getCSSVar(
      '--jp-cell-padding'
    )} ) / 2)`;

    (this.layout as PanelLayout).addWidget(Toolbar.createSpacerItem());
  }
}
