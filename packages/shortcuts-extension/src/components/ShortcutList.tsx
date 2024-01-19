/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import * as React from 'react';
import { ShortcutObject, TakenByObject } from './ShortcutInput';
import { ShortcutItem } from './ShortcutItem';
import { IShortcutUIexternal } from './TopNav';

const ARROW_KEYS = ['ArrowUp', 'ArrowDown'];

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
  id?: string;
}

/** React component for list of shortcuts */
export class ShortcutList extends React.Component<IShortcutListProps> {
  handleTabIndex(shortcut: ShortcutObject): number {
    let title = shortcut.commandName;
    let firstElement = this.props.shortcuts[0].commandName;

    if (firstElement === title) {
      return 0;
    }
    return -1;
  }

  /**
   * Handle key down for row navigation
   */
  handleRowKeyDown = (event: React.KeyboardEvent): void => {
    if (ARROW_KEYS.includes(event.key)) {
      let shortcutList;

      if (this.props.id) {
        shortcutList = document.getElementById(this.props.id) as HTMLElement;
      }

      const focusable: Element[] = [];

      if (shortcutList) {
        // Get focusable children within the shortcut list
        Array.from(shortcutList.children).forEach(child => {
          focusable.push(child);
        });
        console.log(`Array length: ${focusable.length}`);
        // If focusable contains only one element, nothing to do.
        if (focusable.length <= 1) {
          return;
        }
        event.preventDefault();
        event.stopPropagation();
      }
      let activeElement = document.activeElement as HTMLElement;
      let currentNode = focusable.indexOf(activeElement);
      let activeNode = focusable[currentNode] as HTMLElement;
      let nextNode = focusable[currentNode + 1] as HTMLElement;
      let previousNode = focusable[currentNode - 1] as HTMLElement;

      if (event.key === 'ArrowDown') {
        let nxtNode = nextNode;
        if (nxtNode) {
          nxtNode.setAttribute('tabindex', '0');
          activeNode.setAttribute('tabindex', '-1');
          nxtNode.focus();
          currentNode += 1;
        } else if (currentNode >= focusable.length - 1) {
          let node = focusable[0] as HTMLElement;
          let activeNode = focusable[currentNode] as HTMLElement;

          node.setAttribute('tabindex', '0');
          activeNode.setAttribute('tabindex', '-1');
          node.focus();
          currentNode = 0;
        }
      }

      if (event.key === 'ArrowUp') {
        let prvNode = previousNode;
        let activeNode = focusable[currentNode] as HTMLElement;
        if (prvNode && currentNode >= 0) {
          prvNode.setAttribute('tabindex', '0');
          activeNode.setAttribute('tabindex', '-1');
          prvNode.focus();
          currentNode -= 1;
        }

        if (currentNode <= 0) {
          let lastNode = focusable[focusable.length - 1] as HTMLElement;
          let activeNode = focusable[currentNode] as HTMLElement;

          lastNode.setAttribute('tabindex', '0');
          activeNode.setAttribute('tabindex', '-1');
          lastNode.focus();
        }
      }
    }
  };

  render(): JSX.Element {
    return (
      <div
        className="jp-Shortcuts-ShortcutListContainer"
        style={{
          height: `${this.props.height - TOPNAV_HEIGHT}px`
        }}
        id="shortcutListContainer"
      >
        <div
          className="jp-Shortcuts-ShortcutList"
          role="tablist"
          tabIndex={0}
          id={this.props.id}
        >
          {this.props.shortcuts.map((shortcut: ShortcutObject) => {
            return (
              <ShortcutItem
                tabIndex={this.handleTabIndex(shortcut)}
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
                handleRowKeyDown={this.handleRowKeyDown}
              />
            );
          })}
        </div>
      </div>
    );
  }
}
