/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import * as React from 'react';
import { ShortcutItem } from './ShortcutItem';
import { IShortcutRegistry, IShortcutTarget, IShortcutUI } from '../types';

const ARROW_KEYS = ['ArrowUp', 'ArrowDown', 'ArrowRight'];

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
  constructor(props: IShortcutListProps) {
    super(props);
    this._shortcutListRef = React.createRef<HTMLDivElement>();
  }

  /**
   * Handle key down for row navigation
   */
  handleRowKeyDown = (event: React.KeyboardEvent): void => {
    if (!ARROW_KEYS.includes(event.key)) {
      return;
    }
    const shortcutList = this._shortcutListRef.current;

    const focusable: Element[] = [];

    if (shortcutList) {
      // Get focusable children within the shortcut list
      Array.from(shortcutList.children).forEach(child => {
        focusable.push(child);
      });
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
    let evTarget = event.target as HTMLElement;

    if (event.key === 'ArrowDown' && evTarget.tagName !== 'BUTTON') {
      let nxtNode = nextNode;
      if (nxtNode) {
        nxtNode.setAttribute('tabindex', '0');
        activeNode.setAttribute('tabindex', '-1');
        nxtNode.focus();
        currentNode += 1;
      }
    } else if (event.key === 'ArrowUp' && evTarget.tagName !== 'BUTTON') {
      let prvNode = previousNode;
      let activeNode = focusable[currentNode] as HTMLElement;
      if (prvNode && currentNode >= 0) {
        prvNode.setAttribute('tabindex', '0');
        activeNode.setAttribute('tabindex', '-1');
        prvNode.focus();
        currentNode -= 1;
      }
    } else if (event.key === 'ArrowRight') {
      const focusedElement = document.activeElement;

      // Create a list of all focusable elements in the focused shortcuts row.
      if (focusedElement?.className === 'jp-Shortcuts-Row') {
        const elements = Array.from(focusedElement.querySelectorAll('button'));

        const focusable: Element[] = [...elements];

        // If the row contains elements, set focus to next element.
        if (focusable.length >= 1) {
          (focusable[0] as HTMLButtonElement).focus();

          // If the row contains no elements, nothing to do.
        } else {
          return;
        }
        event.preventDefault();
        event.stopPropagation();
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
        <div className="jp-Shortcuts-ShortcutList" ref={this._shortcutListRef}>
          {this.props.shortcuts.map(
            (shortcut: IShortcutTarget, index: number) => {
              return (
                <ShortcutItem
                  tabIndex={index === 0 ? 0 : -1}
                  key={shortcut.id}
                  addKeybinding={this.props.addKeybinding}
                  replaceKeybinding={this.props.replaceKeybinding}
                  deleteKeybinding={this.props.deleteKeybinding}
                  resetKeybindings={this.props.resetKeybindings}
                  findConflictsFor={this.props.findConflictsFor}
                  shortcut={shortcut}
                  showSelectors={this.props.showSelectors}
                  external={this.props.external}
                  handleRowKeyDown={this.handleRowKeyDown}
                />
              );
            }
          )}
        </div>
      </div>
    );
  }

  private _shortcutListRef: React.RefObject<HTMLDivElement>;
}
