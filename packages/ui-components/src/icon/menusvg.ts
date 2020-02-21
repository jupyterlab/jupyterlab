// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { h, VirtualElement } from '@lumino/virtualdom';
import { Menu } from '@lumino/widgets';

import { caretRightIcon, checkIcon } from './iconimports';
import { iconStyle } from '../style';
import { classes } from '../utils';

const submenuIcon = caretRightIcon.bindprops({
  justify: 'center',
  kind: 'menuItem'
});

export namespace MenuSvg {
  /**
   * a modified implementation of the Menu Renderer
   */
  export class Renderer extends Menu.Renderer {
    /**
     * Render the icon element for a menu item.
     *
     * @param data - The data to use for rendering the icon.
     *
     * @returns A virtual element representing the item icon.
     */
    renderIcon(data: Menu.IRenderData): VirtualElement {
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
     * Create the class name for the menu item icon.
     *
     * @param data - The data to use for the class name.
     *
     * @returns The full class name for the item icon.
     */
    createIconClass(data: Menu.IRenderData): string {
      let name = 'lm-Menu-itemIcon';
      /* <DEPRECATED> */
      name += ' p-Menu-itemIcon';
      /* </DEPRECATED> */

      if (data.item.type === 'separator') {
        return classes(data.item.iconClass, name);
      } else {
        return classes(
          iconStyle({ justify: 'center', kind: 'menuItem' }),
          data.item.iconClass,
          name
        );
      }
    }

    /**
     * Render the submenu icon element for a menu item.
     *
     * @param data - The data to use for rendering the submenu icon.
     *
     * @returns A virtual element representing the submenu icon.
     */
    renderSubmenu(data: Menu.IRenderData): VirtualElement {
      const className =
        'lm-Menu-itemSubmenuIcon' +
        /* <DEPRECATED> */
        ' p-Menu-itemSubmenuIcon';
      /* </DEPRECATED> */

      if (data.item.type === 'submenu') {
        return h.div({ className }, submenuIcon);
      } else {
        return h.div({ className });
      }
    }
  }

  export const defaultRenderer = new Renderer();
}
