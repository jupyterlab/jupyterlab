import {
  ShortcutObject
} from '../index'

import {
  style
} from 'typestyle'

import * as React from 'react';

import '../../style/ShortcutButton.css';

const shortcutStyle = style(
  {
    margin: '4px 8px 0 4px',
    paddingTop: '8px',
    backgroundSize: '16px',
    height: '16px',
    width: '16px',
    backgroundImage: 'var(--jp-icon-close)',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    backgroundColor: 'var(--jp-layout-color0)',
    border: 'none',
    opacity: 0.5,

    $nest: {
      '&:hover': {
        opacity: 1
      },
      '&:active': {
        color: 'var(--jp-layout-color3)'
      },
      '&:focus': {
        outline: 'none'
      }
    }
  }
)

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