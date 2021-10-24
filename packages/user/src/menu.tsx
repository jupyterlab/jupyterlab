// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ReactWidget } from '@jupyterlab/apputils';
import { caretDownIcon, userIcon } from '@jupyterlab/ui-components';
import { Menu, MenuBar } from '@lumino/widgets';
import { h, VirtualElement } from '@lumino/virtualdom';

import * as React from 'react';

import { IUser } from './tokens';
import { User } from './model';
import { getInitials } from './utils';
import { getUserIcon } from './components';

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
    if (this._user.avatar_url) {
      return h.div(
        {
          className:
            'lm-MenuBar-itemIcon p-MenuBar-itemIcon jp-MenuBar-imageIcon'
        },
        h.img({ src: this._user.avatar_url })
      );
    } else
      return h.div(
        {
          className:
            'lm-MenuBar-itemIcon p-MenuBar-itemIcon jp-MenuBar-anonymousIcon',
          style: { backgroundColor: this._user.color }
        },
        h.span({}, getInitials(this._user.username))
      );
  }
}

export class UserMenu extends Menu {
  private _user: IUser;

  constructor(options: UserMenu.IOptions) {
    super(options);
    this._user = options.user;
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
    this.title.label = user.username;
    this.update();
  };
}

export namespace UserMenu {
  export interface IOptions extends Menu.IOptions {
    user: IUser;
  }
}

export class UserIcon extends ReactWidget {
  private _profile: User;

  constructor(user: User) {
    super();
    this.id = 'jp-UserIcon';
    this._profile = user;

    this._profile.ready.connect(() => this.update());
    this._profile.changed.connect(() => this.update());
  }

  render(): React.ReactElement {
    if (this._profile.isReady) {
      return (
        <div className="login-container">
          {getUserIcon(this._profile.toJSON())}
        </div>
      );
    }

    return (
      <div className="login-container">
        <div className="login-icon">
          <userIcon.react
            className="user-img"
            tag="span"
            width="28px"
            height="28px"
          />
        </div>
      </div>
    );
  }
}
