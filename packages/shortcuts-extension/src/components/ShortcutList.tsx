/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import * as React from 'react';
import { ShortcutObject, TakenByObject } from './ShortcutInput';
import { ShortcutItem } from './ShortcutItem';
import { IShortcutUIexternal } from './TopNav';

const TOPNAV_HEIGHT: number = 115;

/** Props for ShortcutList component */
export interface IShortcutListProps {
  shortcuts: ShortcutObject[];
  handleUpdate: Function;
  resetShortcut: Function;
  deleteShortcut: Function;
  showSelectors: boolean;
  keyBindingsUsed: { [index: string]: TakenByObject };
  sortConflict: Function;
  clearConflicts: Function;
  height: number;
  contextMenu: Function;
  external: IShortcutUIexternal;
}

/** React component for list of shortcuts */
export class ShortcutList extends React.Component<IShortcutListProps> {
  render(): JSX.Element {
    return (
      <div
        className="jp-Shortcuts-ShortcutListContainer"
        style={{
          height: `${this.props.height - TOPNAV_HEIGHT}px`
        }}
        id="shortcutListContainer"
      >
        <div className="jp-Shortcuts-ShortcutList">
          {this.props.shortcuts.map((shortcut: ShortcutObject) => {
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
                contextMenu={this.props.contextMenu}
                external={this.props.external}
              />
            );
          })}
        </div>
      </div>
    );
  }
}
