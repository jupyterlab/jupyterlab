/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import * as React from 'react';
import { ShortcutItem } from './ShortcutItem';
import { IShortcutRegistry, IShortcutTarget, IShortcutUI } from '../types';

const TOPNAV_HEIGHT: number = 115;

/** Props for ShortcutList component */
export interface IShortcutListProps {
  shortcuts: IShortcutTarget[];
  addKeybinding: IShortcutUI['addKeybinding'];
  replaceKeybinding: IShortcutUI['replaceKeybinding'];
  resetKeybindings: IShortcutUI['resetKeybindings'];
  deleteKeybinding: IShortcutUI['deleteKeybinding'];
  findConflictsFor: IShortcutRegistry['findConflictsFor'];
  showSelectors: boolean;
  height: number;
  external: IShortcutUI.IExternalBundle;
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
          {this.props.shortcuts.map((shortcut: IShortcutTarget) => {
            return (
              <ShortcutItem
                key={shortcut.id}
                addKeybinding={this.props.addKeybinding}
                replaceKeybinding={this.props.replaceKeybinding}
                deleteKeybinding={this.props.deleteKeybinding}
                resetKeybindings={this.props.resetKeybindings}
                findConflictsFor={this.props.findConflictsFor}
                shortcut={shortcut}
                showSelectors={this.props.showSelectors}
                external={this.props.external}
              />
            );
          })}
        </div>
      </div>
    );
  }
}
