import { Toolbar } from '@jupyterlab/apputils';
import { CommandRegistry } from '@lumino/commands';
import { PanelLayout, Widget } from '@lumino/widgets';
import { CellMenu } from './cellmenu';
import { TagTool } from './tagbar';
import { TagsModel } from './tagsmodel';
import { ICellMenuItem } from './tokens';
import { getCSSVar } from './utils';

/**
 * Cell Toolbar Widget
 */
export class CellToolbarWidget extends Widget {
  constructor(
    commands: CommandRegistry,
    model: TagsModel | null,
    leftMenuItems: ICellMenuItem[],
    rightMenuItems: ICellMenuItem[],
    leftSpace = 0,
    position: { right: number; top: number } | null = null
  ) {
    super();
    this.layout = new PanelLayout();
    this.addClass('jp-enh-cell-toolbar');

    (this.layout as PanelLayout).addWidget(
      new CellMenu(commands, leftMenuItems)
    );

    // Set style
    this.node.style.position = 'absolute';
    if (position) {
      this.node.style.right = `${position.right}px`;
      this.node.style.top = `${position.top}px`;
      this.node.style.justifyContent = 'flex-end';
      this.node.style.width = 'max-content';
      // Set a background if the toolbar overlaps the border
      if (position.top < 22) {
        this.addClass('jp-overlap');
      }
    } else {
      this.node.style.left = `${leftSpace}px`;
      this.node.style.top = '0px';
      this.node.style.width = `calc( 100% - ${leftSpace}px - ${getCSSVar(
        '--jp-cell-collapser-width'
      )} - ${getCSSVar('--jp-cell-prompt-width')} - ${getCSSVar(
        '--jp-cell-padding'
      )} )`;

      (this.layout as PanelLayout).addWidget(Toolbar.createSpacerItem());
    }

    if (model) {
      (this.layout as PanelLayout).addWidget(new TagTool(model));
    }
    (this.layout as PanelLayout).addWidget(
      new CellMenu(commands, rightMenuItems)
    );
  }
}
