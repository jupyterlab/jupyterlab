import {
  ShortcutObject
} from '../index'

import * as React from 'react';

/** Props for ShortcutButton component */
export interface IShortcutButtonProps {
  shortcutKeys: string[];
  deleteShortcut: Function;
  shortcutObject: ShortcutObject;
  shortcutId: string;
  first: boolean;
  index: number;
  toSymbols: Function;
}

export class ShortcutButton extends React.Component<IShortcutButtonProps, {}> {
  constructor(props) {
    super(props)
  }
  render() {
    return (
      <button 
        className={this.props.first ? "jp-shortcut jp-shortcut-left" : "jp-shortcut jp-shortcut-right"} 
        onClick={() => 
          this.props.deleteShortcut(this.props.shortcutObject, this.props.shortcutId)
        }
      >
      {this.props.toSymbols(this.props.shortcutKeys[0])}
      </button>
    )
  }
}