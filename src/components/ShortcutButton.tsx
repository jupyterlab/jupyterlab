import {
  ShortcutObject
} from '../index'

import * as React from 'react';

import {
  shortcutStyle
} from './ShortcutButtonStyle'

/** Props for ShortcutButton component */
export interface IShortcutButtonProps {
  shortcutKeys: string[],
  deleteShortcut: Function,
  shortcutObject: ShortcutObject,
  shortcutId: string,
  index: number,
  toSymbols: Function,
}

/** React component for an interactive button displaying a command's keyboard shortcut */
export class ShortcutButton extends React.Component<IShortcutButtonProps, {}> {
  constructor(props) {
    super(props)
  }
  render() {
    return (
      <button 
        className={shortcutStyle} 
        onClick={() => 
          this.props.deleteShortcut(this.props.shortcutObject, this.props.shortcutId)
        }
      >
      </button>
    )
  }
}