/** Props for ShortcutButton component */
export interface IShortcutButtonProps {
    shortcutKeys: string;
    commandId: string;
    shortcutSelector: string;
    shortcutCommandName: string;
    deleteShortcut: Function;
  }

import * as React from 'react';

export class ShortcutButton extends React.Component<IShortcutButtonProps, {}> {
  constructor(props) {
    super(props)
  }
  render() {
    return (
      <button className='jp-shortcut' onClick={() => 
        this.props.deleteShortcut(this.props.commandId, this.props.shortcutCommandName, this.props.shortcutSelector)
      }
    >
      {this.props.shortcutKeys}
    </button>
    )
  }
}