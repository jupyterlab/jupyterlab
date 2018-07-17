import { ShortcutItem } from './ShortcutItem';

import * as React from 'react';

import { ShortcutListStyle } from './ShortcutListStyle';

/** Props for ShortcutList component */
export interface IShortcutListProps {
  shortcuts: Object;
  handleUpdate: Function;
  resetShortcut: Function;
  deleteShortcut: Function;
  showSelectors: boolean;
  keyBindingsUsed: Object;
  sortConflict: Function;
  clearConflicts: Function;
}

/** React component for list of shortcuts */
export class ShortcutList extends React.Component<IShortcutListProps, {}> {
  render() {
    return (
      <div className={ShortcutListStyle}>
        {Object.keys(this.props.shortcuts).map(key => {
          const shortcut = this.props.shortcuts[key];
          return (
            <ShortcutItem
              key={shortcut.commandName + '_' + shortcut.selector}
              resetShortcut={this.props.resetShortcut}
              shortcut={shortcut}
              handleUpdate={this.props.handleUpdate}
              deleteShortcut={this.props.deleteShortcut}
              showSelectors={this.props.showSelectors}
              keyBindingsUsed={this.props.keyBindingsUsed}
              sortConflict={this.props.sortConflict}
              clearConflicts={this.props.clearConflicts}
            />
          );
        })}
      </div>
    );
  }
}
