// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Dialog, ReactWidget } from '@jupyterlab/apputils';
import { caretDownIcon, userIcon } from '@jupyterlab/ui-components';
import { CommandRegistry } from '@lumino/commands';
import { Menu, MenuBar } from '@lumino/widgets';
import { h, VirtualElement } from '@lumino/virtualdom';

import * as React from 'react';

import { IUser } from './tokens';
import { User } from './model';

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
    if (this._user.avatar) {
      return h.div(
        {
          className:
            'lm-MenuBar-itemIcon p-MenuBar-itemIcon jp-MenuBar-imageIcon'
        },
        h.img({ src: this._user.avatar })
      );
    } else
      return h.div(
        {
          className:
            'lm-MenuBar-itemIcon p-MenuBar-itemIcon jp-MenuBar-anonymousIcon',
          style: { backgroundColor: this._user.color }
        },
        h.span({}, this._user.initials)
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

export const getUserIcon = (user: User.User) => {
  if (user.avatar) {
    return (
      <div key={user.username} className="login-icon">
        <img className="user-img" src={user.avatar} />
      </div>
    );
  }

  if (!user.avatar) {
    return (
      <div
        key={user.username}
        className="login-icon"
        style={{ backgroundColor: user.color }}
      >
        <span>{user.initials}</span>
      </div>
    );
  }
};

export class UserNameInput
  extends ReactWidget
  implements Dialog.IBodyWidget<string> {
  private _name: string;
  private _user: User;
  private _commands: CommandRegistry;

  constructor(user: User, commands: CommandRegistry) {
    super();
    this._user = user;
    this._name = user.name;
    this._commands = commands;
  }

  getValue(): string {
    return this._name;
  }

  private _handleName = (event: React.ChangeEvent<HTMLInputElement>): void => {
    this._name = event.target.value;
    this.update();
  };

  render(): JSX.Element {
    const getButtons = () => {
      return this._user.logInMethods.map(id => {
        return (
          <button
            id="jp-Dialog-button"
            key={id}
            className="jp-mod-reject jp-mod-styled"
            onClick={() => this._commands.execute(id)}
          >
            {this._commands.label(id)}
          </button>
        );
      });
    };

    return (
      <div className="lm-Widget p-Widget jp-Dialog-body jp-Dialog-container">
        <label>Who are you?</label>
        <input
          id="jp-dialog-input-id"
          type="text"
          className="jp-Input-Dialog jp-mod-styled"
          value={this._name}
          onChange={this._handleName}
        />
        <hr />
        {getButtons()}
      </div>
    );
  }
}

// Use accordion panel https://github.com/jupyterlab/lumino/pull/205
export class UserPanel extends ReactWidget {
  private _profile: User;
  private _collaborators: User.User[];

  constructor(user: User) {
    super();
    this.id = 'jp-user-panel';
    this.title.icon = userIcon;
    this.addClass('jp-AuthWidget');

    this._profile = user;
    this._collaborators = [];
  }

  get collaborators(): User.User[] {
    return this._collaborators;
  }

  set collaborators(users: User.User[]) {
    this._collaborators = users;
    this.update();
  }

  render(): JSX.Element {
    return (
      <div className="jp-UserPanel">
        <div className="panel-container">
          {getUserIcon(this._profile.toJSON())}
          <span className="panel-username">{this._profile.name}</span>
        </div>

        <h5>Collaborators</h5>
        <hr />
        <div className="panel-container">
          {this._collaborators.map(user => {
            if (this._profile.username !== user.username) {
              return getUserIcon(user);
            }
          })}
        </div>
      </div>
    );
  }
}
