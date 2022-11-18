// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { caretDownIcon, userIcon } from '@jupyterlab/ui-components';
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
      {
        className:
          'lm-MenuBar-itemLabel' +
          /* <DEPRECATED> */
          ' p-MenuBar-itemLabel' +
          /* </DEPRECATED> */
          ' jp-MenuBar-label'
      },
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
          className:
            'lm-MenuBar-itemIcon p-MenuBar-itemIcon jp-MenuBar-imageIcon'
        },
        h.img({ src: this._user.identity!.avatar_url })
      );
    } else if (this._user.isReady) {
      return h.div(
        {
          className:
            'lm-MenuBar-itemIcon p-MenuBar-itemIcon jp-MenuBar-anonymousIcon',
          style: { backgroundColor: this._user.identity!.color }
        },
        h.span({}, this._user.identity!.initials)
      );
    } else {
      return h.div(
        {
          className:
            'lm-MenuBar-itemIcon p-MenuBar-itemIcon jp-MenuBar-anonymousIcon'
        },
        userIcon
      );
    }
  }
}

/**
 * Custom lumino Menu for the user menu.
 */
export class UserMenu extends Menu {
  private _user?: User.IManager;

  constructor(options: UserMenu.IOptions) {
    super(options);
    this._user = options.user;

    this.title.label = '';
    this.title.icon = caretDownIcon;
    this.title.iconClass = 'jp-UserMenu-caretDownIcon';

    this._user?.ready
      .then(() => {
        this.title.label = this._user!.identity!.display_name;
      })
      .catch(e => console.error(e));

    this._user?.userChanged.connect(this._updateLabel, this);
  }

  dispose() {
    this._user?.userChanged.disconnect(this._updateLabel, this);
  }

  private _updateLabel(sender: User.IManager, user: User.IUser): void {
    this.title.label = user.identity.display_name;
    this.update();
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
    user?: User.IManager;
  }
}
