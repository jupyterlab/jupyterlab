// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { userIcon } from '@jupyterlab/ui-components';
import { User } from '@jupyterlab/services';
import { Menu, MenuBar } from '@lumino/widgets';
import { h, VirtualElement } from '@lumino/virtualdom';

/**
 * Custom renderer for the user menu.
 */
export class RendererUserMenu extends MenuBar.Renderer {
  private _user: User.IManager;

  /**
   * Constructor of the class RendererUserMenu.
   *
   * @argument user Current user object.
   */
  constructor(user: User.IManager) {
    super();
    this._user = user;
  }

  /**
   * Render the virtual element for a menu bar item.
   *
   * @param data - The data to use for rendering the item.
   *
   * @returns A virtual element representing the item.
   */
  renderItem(data: MenuBar.IRenderData): VirtualElement {
    let className = this.createItemClass(data);
    let dataset = this.createItemDataset(data);
    let aria = this.createItemARIA(data);
    return h.li(
      { className, dataset, tabindex: '0', onfocus: data.onfocus, ...aria },
      this._createUserIcon(),
      this.renderLabel(data),
      this.renderIcon(data)
    );
  }

  /**
   * Render the label element for a menu item.
   *
   * @param data - The data to use for rendering the label.
   *
   * @returns A virtual element representing the item label.
   */
  renderLabel(data: MenuBar.IRenderData): VirtualElement {
    let content = this.formatLabel(data);
    return h.div(
      { className: 'lm-MenuBar-itemLabel jp-MenuBar-label' },
      content
    );
  }

  /**
   * Render the user icon element for a menu item.
   *
   * @returns A virtual element representing the item label.
   */
  private _createUserIcon(): VirtualElement {
    if (this._user.isReady && this._user.identity!.avatar_url) {
      return h.div(
        {
          className: 'lm-MenuBar-itemIcon jp-MenuBar-imageIcon'
        },
        h.img({ src: this._user.identity!.avatar_url })
      );
    } else if (this._user.isReady) {
      return h.div(
        {
          className: 'lm-MenuBar-itemIcon jp-MenuBar-anonymousIcon',
          style: { backgroundColor: this._user.identity!.color }
        },
        h.span({}, this._user.identity!.initials)
      );
    } else {
      return h.div(
        {
          className: 'lm-MenuBar-itemIcon jp-MenuBar-anonymousIcon'
        },
        userIcon
      );
    }
  }
}

/**
 * This menu does not contain anything but we keep it around in case someone uses it.
 * Custom lumino Menu for the user menu.
 */
export class UserMenu extends Menu {
  constructor(options: UserMenu.IOptions) {
    super(options);
  }
}

/**
 * Namespace of the UserMenu class.
 */
export namespace UserMenu {
  /**
   * User menu options interface
   */
  export interface IOptions extends Menu.IOptions {
    /**
     * Current user manager.
     */
    user: User.IManager;
  }
}
