// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { h, VirtualElement } from '@lumino/virtualdom';
import { CommandPalette } from '@lumino/widgets';
import { LabIconStyle } from '../../style';
import { classes } from '../../utils';
import { checkIcon, filterListIcon } from '../iconimports';

const searchHeaderIcon = filterListIcon.bindprops({
  stylesheet: 'commandPaletteHeader',
  className: 'jp-icon-hoverShow-content'
});

export namespace CommandPaletteSvg {
  /**
   * a modified implementation of the CommandPalette Renderer
   */
  export class Renderer extends CommandPalette.Renderer {
    /**
     * Render the virtual element for a command palette header.
     *
     * @param data - The data to use for rendering the header.
     *
     * @returns A virtual element representing the header.
     */
    renderHeader(data: CommandPalette.IHeaderRenderData): VirtualElement {
      const content = this.formatHeader(data);
      return h.li(
        {
          className: classes('lm-CommandPalette-header', 'jp-icon-hoverShow')
        },
        content,
        h.span(searchHeaderIcon)
      );
    }

    /**
     * Render the icon for a command palette item.
     *
     * @param data - The data to use for rendering the icon.
     *
     * @returns A virtual element representing the icon.
     */
    renderItemIcon(data: CommandPalette.IItemRenderData): VirtualElement {
      const className = this.createIconClass(data);

      if (data.item.isToggled) {
        // check mark icon takes precedence
        return h.div({ className }, checkIcon, data.item.iconLabel);
      }

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

      return classes(
        LabIconStyle.styleClass({
          stylesheet: 'commandPaletteItem'
        }),
        data.item.iconClass,
        name
      );
    }
  }

  export const defaultRenderer = new Renderer();
}
