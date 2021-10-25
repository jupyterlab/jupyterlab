// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { caretDownIcon, userIcon } from '@jupyterlab/ui-components';
import { Menu, MenuBar } from '@lumino/widgets';
import { h, VirtualElement } from '@lumino/virtualdom';

import { IUser } from './tokens';
import { getInitials } from './utils';

export class RendererUserMenu extends MenuBar.Renderer {
  private _user: IUser;

  constructor(user: IUser) {
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

  private _createUserIcon(): VirtualElement {
    if (this._user.isReady && this._user.avatar_url) {
      return h.div(
        {
          className:
            'lm-MenuBar-itemIcon p-MenuBar-itemIcon jp-MenuBar-imageIcon'
        },
        h.img({ src: this._user.avatar_url })
      );
    } else if (this._user.isReady) {
      return h.div(
        {
          className:
            'lm-MenuBar-itemIcon p-MenuBar-itemIcon jp-MenuBar-anonymousIcon',
          style: { backgroundColor: this._user.color }
        },
        h.span({}, getInitials(this._user.name))
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

export class UserMenu extends Menu {
  private _user: IUser;

  constructor(options: UserMenu.IOptions) {
    super(options);
    this._user = options.user;
    this.title.label = "Anonymous";
    this.title.icon = caretDownIcon;
    this.title.iconClass = 'jp-UserMenu-caretDownIcon';
    this.addClass('jp-UserMenu');
    this._user.ready.connect(this._updateLabel);
    this._user.changed.connect(this._updateLabel);
  }

  dispose() {
    this._user.ready.disconnect(this._updateLabel);
    this._user.changed.disconnect(this._updateLabel);
  }

  private _updateLabel = (user: IUser) => {
    this.title.label = user.name;
    this.update();
  };
}

export namespace UserMenu {
  export interface IOptions extends Menu.IOptions {
    user: IUser;
  }
}
