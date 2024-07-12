// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { IDisposable } from '@lumino/disposable';
import { ISignal, Signal } from '@lumino/signaling';
import { h, VirtualElement } from '@lumino/virtualdom';
import { ContextMenu, Menu } from '@lumino/widgets';
import { LabIconStyle } from '../../style';
import { classes } from '../../utils';
import { caretRightIcon, checkIcon } from '../iconimports';

const submenuIcon = caretRightIcon.bindprops({
  stylesheet: 'menuItem'
});

/**
 * An object which implements a universal context menu.
 * Tweaked to use inline svg icons
 */
export class ContextMenuSvg extends ContextMenu implements IDisposable {
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

  /**
   * Test whether the context menu is disposed.
   */
  get isDisposed(): boolean {
    return this._isDisposed;
  }

  /**
   * A signal fired when the context menu is opened.
   */
  get opened(): ISignal<ContextMenu, void> {
    return this._opened;
  }

  /**
   * Dispose of the resources held by the context menu.
   */
  dispose(): void {
    if (this._isDisposed) {
      return;
    }

    this._isDisposed = true;
    this.menu.dispose();
    Signal.disconnectSender(this);
  }

  /**
   * Open the context menu in response to a `'contextmenu'` event.
   *
   * @param event - The `'contextmenu'` event of interest.
   *
   * @returns `true` if the menu was opened, or `false` if no items
   *   matched the event and the menu was not opened.
   *
   * #### Notes
   * This method will populate the context menu with items which match
   * the propagation path of the event, then open the menu at the mouse
   * position indicated by the event.
   */
  open(event: MouseEvent): boolean {
    if (this._isDisposed) {
      return false;
    }
    const hasItems = super.open(event);
    if (hasItems) {
      this._opened.emit();
    }
    return hasItems;
  }

  protected _isDisposed = false;
  protected _opened: Signal<ContextMenu, void> = new Signal<ContextMenu, void>(
    this
  );
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
    this.addClass('jp-ThemedContainer');
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
    const originalInsertItem = menu.insertItem.bind(menu);
    menu.insertItem = (index: number, options: Menu.IItemOptions) => {
      if (options.submenu) {
        MenuSvg.overrideDefaultRenderer(options.submenu);
      }

      return originalInsertItem(index, options);
    };

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
      const className = 'lm-Menu-itemSubmenuIcon';

      if (data.item.type === 'submenu') {
        return h.div({ className }, submenuIcon);
      } else {
        return h.div({ className });
      }
    }
  }

  export const defaultRenderer = new Renderer();
}
