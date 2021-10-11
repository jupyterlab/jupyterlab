// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  MainAreaWidget,
  ReactWidget,
  ToolbarButton
} from '@jupyterlab/apputils';
import { saveIcon } from '@jupyterlab/ui-components';

import * as React from 'react';

import { User } from './model';

export class SettingsWidget extends MainAreaWidget<SettingsContent> {
  private _user: User;

  /**
   * Constructs a new settings widget.
   */
  constructor(user: User) {
    super({ content: new SettingsContent(user.toJSON()) });
    this._user = user;

    this.toolbar.addItem(
      'save',
      new ToolbarButton({
        label: 'Save',
        tooltip: 'Save user settings',
        icon: saveIcon,
        onClick: this._onSave,
        actualOnClick: true
      })
    );
  }

  dispose() {
    super.dispose();
    if (!this.disposed) {
      this.content.dispose();
    }
  }

  private _onSave = () => {
    this._user.update(this.content.user());
  };
}

/**
 * A SettingsWidget for the user.
 */
export class SettingsContent extends ReactWidget {
  private _user: User.User;

  /**
   * Constructs a new settings widget.
   */
  constructor(user: User.User) {
    super();
    this._user = user;
  }

  public user(): User.User {
    return this._user;
  }

  private _initials(): void {
    this._user.username = this._user.name + ' ' + this._user.familyName;

    const name = this._user.name.split(' ');
    const familyName: string = this._user.familyName
      ? (this._user.familyName as string)
      : '';
    if (name.length > 0) {
      this._user.initials = name[0].substring(0, 1).toLocaleUpperCase();
    }
    if (name.length > 1) {
      this._user.initials += name[1].substring(0, 1).toLocaleUpperCase();
    } else if (familyName.length > 1) {
      this._user.initials += familyName.substring(0, 1).toLocaleUpperCase();
    }
  }

  private _handlerColor = (event: any) => {
    this._user.color = event.target.value;
    this.update();
  };

  private _handlerName = (event: any) => {
    this._user.name = event.target.value;
    this._initials();
    this.update();
  };

  private _handlerFamilyName = (event: any) => {
    this._user.familyName = event.target.value;
    this._initials();
    this.update();
  };

  private _handlerDescription = (event: any) => {
    this._user.description = event.target.value;
    this.update();
  };

  render(): JSX.Element {
    return (
      <div className="jp-UserSettings-Container">
        <ColorPickerComponent
          user={this._user}
          handlerColor={this._handlerColor}
        />

        <div className="jp-UserSettings-Info-Container">
          <table className="jp-UserSettings-Info">
            <tbody>
              <tr>
                <td>
                  <label>Name:</label>
                </td>
                <td>
                  <input
                    onChange={this._handlerName}
                    value={this._user.name}
                    disabled={!this._user.anonymous}
                  ></input>
                </td>
              </tr>
              <tr>
                <td>
                  <label>Family Name:</label>
                </td>
                <td>
                  <input
                    onChange={this._handlerFamilyName}
                    value={this._user.familyName}
                    disabled={!this._user.anonymous}
                  ></input>
                </td>
              </tr>
            </tbody>
          </table>

          <div className="jp-UserSettings-Info-Item">
            <label>Description:</label>
            <textarea
              onChange={this._handlerDescription}
              value={this._user.description}
              disabled={!this._user.anonymous}
            ></textarea>
          </div>
        </div>
      </div>
    );
  }
}

type Props = {
  user: User.User;
  handlerColor: (event: any) => void;
};

/**
 * React component for the user color picker.
 *
 * @returns The React component
 */
const ColorPickerComponent: React.FC<Props> = props => {
  const { user, handlerColor } = props;
  const inputRef = React.useRef(null);

  const openPicker = () => {
    if (inputRef.current) {
      // @ts-ignore
      inputRef.current.click();
    }
  };

  return (
    <div
      title="Select color"
      onClick={openPicker}
      className="jp-UserSettings-Icon"
      style={{ backgroundColor: user.color }}
    >
      <input
        ref={inputRef}
        onChange={handlerColor}
        type="color"
        value={user.color}
      />
      <span>{user.initials}</span>
    </div>
  );
};
