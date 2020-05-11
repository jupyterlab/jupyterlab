// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { h, VirtualElement } from '@lumino/virtualdom';
import { Menu, ContextMenu } from '@lumino/widgets';

import { caretRightIcon, checkIcon } from '../iconimports';
import { LabIconStyle } from '../../style';
import { classes } from '../../utils';

const submenuIcon = caretRightIcon.bindprops({
  stylesheet: 'menuItem'
});

/**
 * An object which implements a universal context menu.
 * Tweaked to use inline svg icons
 */
export class ContextMenuSvg extends ContextMenu {
  /**
   * Construct a new context menu.
   *
   * @param options - The options for initializing the menu.
   */
  constructor(options: ContextMenu.IOptions) {
    super(options);

    // override the vanilla .menu
    this.menu = new MenuSvg(options);
  }

  readonly menu: MenuSvg;
}

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

  /**
   * insert a menu item into the menu at the specified index. Replaces the
   * default renderer for submenus
   *
   * @param index - The index at which to insert the item.
   *
   * @param options - The options for creating the menu item.
   *
   * @returns The menu item added to the menu.
   *
   * #### Notes
   * The index will be clamped to the bounds of the items.
   */
  insertItem(index: number, options: Menu.IItemOptions): Menu.IItem {
    if (options.submenu) {
      MenuSvg.overrideDefaultRenderer(options.submenu);
    }

    return super.insertItem(index, options);
  }
}

export namespace MenuSvg {
  export function overrideDefaultRenderer(menu: Menu): void {
    // override renderer, if needed
    if (menu.renderer === Menu.defaultRenderer) {
      // cast away readonly on menu.renderer
      (menu as any).renderer = MenuSvg.defaultRenderer;
    }

    // ensure correct renderer on any submenus that get added in the future
    menu.insertItem = MenuSvg.prototype.insertItem;

    // recurse through submenus
    for (const item of (menu as any)._items as Menu.IItem[]) {
      if (item.submenu) {
        overrideDefaultRenderer(item.submenu);
      }
    }
  }

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
      const className = this.createIconClass(data);

      if (data.item.isToggled) {
        // check mark icon takes precedence
        return h.div({ className }, checkIcon, data.item.iconLabel);
      }

      /* <DEPRECATED> */
      if (typeof data.item.icon === 'string') {
        return h.div(
          { className: classes(className, 'jp-Icon') },
          data.item.iconLabel
        );
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
          LabIconStyle.styleClass({ stylesheet: 'menuItem' }),
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
