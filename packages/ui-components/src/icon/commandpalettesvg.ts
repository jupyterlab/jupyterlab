// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { h, VirtualElement } from '@lumino/virtualdom';
import { CommandPalette } from '@lumino/widgets';

import { checkIcon } from './iconimports';
import { iconStyle } from '../style';
import { classes } from '../utils';

// const submenuIcon = caretRightIcon.bindprops({
//   justify: 'center',
//   kind: 'menuItem'
// });

export namespace CommandPaletteSvg {
  /**
   * a modified implementation of the CommandPalette Renderer
   */
  export class Renderer extends CommandPalette.Renderer {
    /**
     * Render the icon for a command palette item.
     *
     * @param data - The data to use for rendering the icon.
     *
     * @returns A virtual element representing the icon.
     */
    renderItemIcon(data: CommandPalette.IItemRenderData): VirtualElement {
      let className = this.createIconClass(data);

      if (data.item.isToggled) {
        // check mark icon takes precedence
        return h.div({ className }, checkIcon, data.item.iconLabel);
      }

      /* <DEPRECATED> */
      if (typeof data.item.icon === 'string') {
        return h.div({ className }, data.item.iconLabel);
      }
      /* </DEPRECATED> */

      // if data.item.icon is undefined, it will be ignored
      return h.div({ className }, data.item.icon!, data.item.iconLabel);
    }

    /**
     * Create the class name for the command item icon.
     *
     * @param data - The data to use for the class name.
     *
     * @returns The full class name for the item icon.
     */
    createIconClass(data: CommandPalette.IItemRenderData): string {
      let name = 'lm-CommandPalette-itemIcon';
      /* <DEPRECATED> */
      name += ' p-CommandPalette-itemIcon';
      /* </DEPRECATED> */

      return classes(
        iconStyle({ justify: 'center', kind: 'commandPaletteItem' }),
        data.item.iconClass,
        name
      );
    }
  }

  export const defaultRenderer = new Renderer();
}
