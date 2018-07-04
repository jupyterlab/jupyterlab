import {
  ShortcutObject
} from '../index'

/** Props for ShortcutButton component */
export interface IShortcutButtonProps {
    shortcutKeys: string;
    deleteShortcut: Function;
    shortcutObject: ShortcutObject;
    shortcutId: string;
  }

import * as React from 'react';

export class ShortcutButton extends React.Component<IShortcutButtonProps, {}> {
  constructor(props) {
    super(props)
  }
  render() {
    console.log(this.props.shortcutId, this.props.shortcutObject)
    return (
      <button className='jp-shortcut' onClick={() => 
        this.props.deleteShortcut(this.props.shortcutObject, this.props.shortcutId)
      }
    >
      {this.props.shortcutKeys}
    </button>
    )
  }
}