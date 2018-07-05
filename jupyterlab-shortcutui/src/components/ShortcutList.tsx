import {
  ShortcutItem
} from './ShortcutItem'

import * as React from 'react';

/** Props for ShortcutList component */
export interface IShortcutListProps {
    shortcuts: Object;
    handleUpdate: Function;
    resetShortcut: Function;
    deleteShortcut: Function;
    showSelectors: boolean;
    keyBindingsUsed: Object;
}

/** React component for list of shortcuts */
export class ShortcutList extends React.Component<IShortcutListProps, {}> {
  render() {
    return (
      <div className='jp-shortcutlist'>
        <div className='row table-header'>
          <div className='cell category-cell'>Category</div>
          <div className='cell command-cell'>Command</div>
          <div className='cell shortcut-cell'>Shortcut</div>
          <div className='cell source-cell'>Source</div>
          {this.props.showSelectors && 
            <div className='cell selector-cell'>Selector</div> 
          }
        </div>
        {Object(this.props.shortcuts).map(shortcut => 
          <ShortcutItem key={shortcut.commandName + "_" + shortcut.selector} 
            resetShortcut={this.props.resetShortcut} 
            shortcut={shortcut} 
            handleUpdate={this.props.handleUpdate}
            deleteShortcut={this.props.deleteShortcut}
            showSelectors={this.props.showSelectors}
            keyBindingsUsed={this.props.keyBindingsUsed}
          />)
        }
      </div>
    );
  }
}