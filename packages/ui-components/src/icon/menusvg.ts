// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { h, VirtualElement } from '@lumino/virtualdom';
import { ContextMenu, Menu } from '@lumino/widgets';

import { caretRightIcon, checkIcon } from './iconimports';
import { iconStyle } from '../style';
import { classes } from '../utils';

const submenuIcon = caretRightIcon.bindprops({
  justify: 'center',
  kind: 'menuItem'
});

/**
 * a widget which displays items as a canonical menu.
 * Tweaked to use inline svg icons
 */
export class MenuSvg extends Menu {
  /**
   * construct a new menu. Overrides the default renderer
   *
   * @param options - The options for initializing the tab bar.
   */
  constructor(options: Menu.IOptions) {
    options.renderer = options.renderer || MenuSvg.defaultRenderer;
    super(options);
  }
}

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

      /* <DEPRECATED> */
      if (typeof data.item.icon === 'string') {
        return h.div({ className }, data.item.iconLabel);
      }
      /* </DEPRECATED> */

      // if (!(data.item.icon || data.item.iconClass)) {

      // }

      if (data.item.isToggled) {
        return h.div({ className }, checkIcon, data.item.iconLabel);
      } else {
        // if data.item.icon is undefined, it will be ignored
        return h.div({ className }, data.item.icon!, data.item.iconLabel);
      }
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

      return classes(
        iconStyle({ justify: 'center', kind: 'menuItem' }),
        data.item.iconClass,
        name
      );
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

/**
 * an object which implements a universal context menu.
 * Tweaked to use inline svg icons
 */
export class ContextMenuSvg extends ContextMenu {
  /**
   * Construct a new dock panel.
   *
   * @param options - The options for initializing the panel.
   */
  constructor(options: ContextMenu.IOptions) {
    options.renderer = options.renderer || MenuSvg.defaultRenderer;
    super(options);
  }
}
