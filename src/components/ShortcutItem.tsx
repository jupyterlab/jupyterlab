import { ShortcutObject } from '../index';

import { ShortcutButton } from './ShortcutButton';

import { ShortcutInput } from './ShortcutInput';

import { classes } from 'typestyle';

import {
  CellStyle,
  CellTextStyle,
  ShortcutCellStyle,
  RowStyle,
  ConflictRowStyle,
  ShortcutContainerStyle,
  ShortcutKeysContainerStyle,
  ShortcutKeysStyle,
  OrStyle,
  CommaStyle,
  PlusStyle,
  SourceCellStyle,
  ResetStyle
} from './ShortcutItemStyle';

import * as React from 'react';

/** Props for ShortcutItem component */
export interface IShortcutItemProps {
  shortcut: ShortcutObject;
  handleUpdate: Function;
  resetShortcut: Function;
  deleteShortcut: Function;
  showSelectors: boolean;
  keyBindingsUsed: Object;
  sortConflict: Function;
  clearConflicts: Function;
}

/** State for ShortcutItem component */
export interface IShortcutItemState {
  displayInput: boolean;
}

/** React component for each command shortcut item */
export class ShortcutItem extends React.Component<
  IShortcutItemProps,
  IShortcutItemState
> {
  state = {
    displayInput: false
  };

  /** Toggle display state of input box */
  private toggleInput = (): void => {
    this.setState({
      displayInput: !this.state.displayInput
    });
  };

  /** Transform special key names into unicode characters */
  toSymbols = (value: string): string => {
    const wordKeys = [
      'Tab',
      'Enter',
      'ArrowUp',
      'ArrowDown',
      'ArrowRight',
      'ArrowLeft',
      'Escape'
    ];
    // const display = value.split(' ').map(key => {
    //   if (key === 'Ctrl') {
    //     return '⌃'
    //   } else if (key === 'Accel') {
    //     return '⌘'
    //   } else if (key === 'Shift') {
    //     return '⇧'
    //   } else if (key === 'Alt') {
    //     return '⌥'
    //   } else if (wordKeys.includes(key)) {
    //     return key
    //   } else {
    //     return key.toUpperCase()
    //   }
    // })
    // return display.join(' ')
    return value.split(' ').reduce((result, key) => {
      if (key === 'Ctrl') {
        return result + '⌃';
      } else if (key === 'Accel') {
        return result + '⌘';
      } else if (key === 'Shift') {
        return result + '⇧';
      } else if (key === 'Alt') {
        return result + '⌥';
      } else if (wordKeys.includes(key)) {
        return result + key;
      } else {
        return result + key.toUpperCase();
      }
    }, '');
  };

  render() {
    const nonEmptyKeys = Object.keys(this.props.shortcut.keys).filter(
      key => this.props.shortcut.keys[key][0] !== ''
    );
    return (
      <div
        className={
          this.props.shortcut.hasConflict
            ? classes(RowStyle, ConflictRowStyle)
            : RowStyle
        }
      >
        <div className={CellStyle}>
          <div className={CellTextStyle}>{this.props.shortcut.category}</div>
        </div>
        <div className={CellStyle}>
          <div className="jp-label">{this.props.shortcut.label}</div>
        </div>
        <div className={CellStyle}>
          <div className={ShortcutCellStyle}>
            {/** Create shortcut boxes and delete buttons for each shortcut */}
            {nonEmptyKeys.map((key, index) => (
              <div className={ShortcutContainerStyle} key={key + '_' + index}>
                {this.props.shortcut.keys[key].map((keyBinding, index) => (
                  <div className={ShortcutKeysContainerStyle} key={index}>
                    <div className={ShortcutKeysStyle}>
                      {this.toSymbols(keyBinding)}
                    </div>
                    {index + 1 < this.props.shortcut.keys[key].length ? (
                      <div className={CommaStyle}>,</div>
                    ) : null}
                  </div>
                ))}
                <ShortcutButton
                  shortcutKeys={this.props.shortcut.keys[key]}
                  deleteShortcut={this.props.deleteShortcut}
                  hasConflict={this.props.shortcut.hasConflict}
                  shortcutObject={this.props.shortcut}
                  shortcutId={key}
                  toSymbols={this.toSymbols}
                  index={index}
                />
                {index === 0 && nonEmptyKeys.length > 1 ? (
                  <div className={OrStyle}>or</div>
                ) : null}
              </div>
            ))}

            {/** Add a plus for adding new shortcuts if there are less than two set */}
            {nonEmptyKeys.length < 2 && (
              <span
                className={!this.state.displayInput ? PlusStyle : ''}
                onClick={() => {
                  this.toggleInput(), this.props.clearConflicts();
                }}
              />
            )}

            {/** Display input box when toggled */}
            {this.state.displayInput && (
              <ShortcutInput
                handleUpdate={this.props.handleUpdate}
                toggleInput={this.toggleInput}
                shortcut={this.props.shortcut}
                toSymbols={this.toSymbols}
                keyBindingsUsed={this.props.keyBindingsUsed}
                sortConflict={this.props.sortConflict}
                clearConflicts={this.props.clearConflicts}
                displayInput={this.state.displayInput}
              />
            )}
          </div>
        </div>
        <div className={CellStyle}>
          <div className={SourceCellStyle}>{this.props.shortcut.source}</div>
          {this.props.shortcut.source === 'Custom' && (
            <a
              className={ResetStyle}
              onClick={() => this.props.resetShortcut(this.props.shortcut)}
            >
              reset
            </a>
          )}
        </div>
        {this.props.showSelectors && (
          <div className={CellStyle}>
            <div className="jp-selector">{this.props.shortcut.selector}</div>
          </div>
        )}
      </div>
    );
  }
}
