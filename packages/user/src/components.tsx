// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { DOMUtils } from '@jupyterlab/apputils';
import { userIcon } from '@jupyterlab/ui-components';
import React from 'react';

import { User } from './model';
import { IUser } from './tokens';
import { getInitials } from './utils';

/**
 * React component to render the user icon.
 *
 * @param user User information as IUser or JSON object.
 */
export function getUserIcon(user: IUser | IUser.User): JSX.Element {
  const isReady = user instanceof User ? user.isReady : true;

  if (isReady && user.avatar_url) {
    return (
      <div key={user.id} className="jp-User-icon">
        <img className="jp-User-img" src={user.avatar_url} />
      </div>
    );
  } else if (isReady) {
    return (
      <div
        key={user.id}
        className="jp-User-icon"
        style={{ backgroundColor: user.color }}
      >
        <div>{getInitials(user.name)}</div>
      </div>
    );
  } else {
    return (
      <div key={DOMUtils.createDomID()} className="jp-User-icon">
        <userIcon.react
          className="jp-User-img"
          tag="span"
          width="25px"
          height="25px"
        />
      </div>
    );
  }
}

/**
 * ColorPickerComponent properties.
 */
export type Props = {
  /**
   * Current user as a JSON object.
   */
  user: IUser.User;

  /**
   * Callback to invoke when the color changes.
   */
  handlerColor: (event: any) => void;
};

/**
 * React component to render a custom color picker.
 *
 * @param user User information as JSON object.
 * @param handlerColor callback to call when color changes.
 */
export function ColorPickerComponent(props: Props): JSX.Element {
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
      className="jp-User-ColorPickerIcon"
      style={{ backgroundColor: user.color }}
    >
      <input
        ref={inputRef}
        onChange={handlerColor}
        type="color"
        value={user.color}
      />
      <span>{getInitials(user.name)}</span>
    </div>
  );
}
