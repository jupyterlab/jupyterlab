import { ShortcutObject, ErrorObject, TakenByObject } from '../index';

// import { ShortcutButton } from './ShortcutButton';

import { ShortcutInput } from './ShortcutInput';

import {
  CellStyle,
  ShortcutCellStyle,
  RowStyle,
  ErrorButtonStyle,
  ErrorMessageStyle,
  ConflictContainerStyle,
  ShortcutContainerStyle,
  ShortcutKeysContainerStyle,
  ShortcutKeysStyle,
  OrStyle,
  CommaStyle,
  PlusStyle,
  SourceCellStyle,
  ResetStyle
} from '../componentStyle/ShortcutItemStyle';

import { classes } from 'typestyle'

import * as React from 'react';

/** Props for ShortcutItem component */
export interface IShortcutItemProps {
  shortcut: ShortcutObject | ErrorObject;
  handleUpdate: Function;
  resetShortcut: Function;
  deleteShortcut: Function;
  showSelectors: boolean;
  keyBindingsUsed: { [index: string] : TakenByObject };
  sortConflict: Function;
  clearConflicts: Function;
  errorSize: string;
}

/** State for ShortcutItem component */
export interface IShortcutItemState {
  displayNewInput: boolean;
  displayReplaceInputLeft: boolean;
  displayReplaceInputRight: boolean;
}

/** React component for each command shortcut item */
export class ShortcutItem extends React.Component<
  IShortcutItemProps,
  IShortcutItemState
> {
  state = {
    displayNewInput: false,
    displayReplaceInputLeft: false,
    displayReplaceInputRight: false,
  };

  /** Toggle display state of input box */
  private toggleInputNew = (): void => {
    this.setState({
      displayNewInput: !this.state.displayNewInput,
    });
  };

  private toggleInputReplaceLeft = (): void => {
    this.setState({
      displayReplaceInputLeft: !this.state.displayReplaceInputLeft,
    });
  };

  private toggleInputReplaceRight = (): void => {
    this.setState({
      displayReplaceInputRight: !this.state.displayReplaceInputRight,
    })
  }

  /** Transform special key names into unicode characters */
  toSymbols = (value: string): string => {
    return value.split(' ').reduce((result, key) => {
      if (key === 'Ctrl') {
        return (result + ' ⌃').trim();
      } else if (key === 'Accel') {
        return (result + ' ⌘').trim();
      } else if (key === 'Shift') {
        return (result + ' ⇧').trim();
      } else if (key === 'Alt') {
        return (result + ' ⌥').trim();
      } else {
        return (result + ' ' + key).trim();
      }
    }, '');
  };

  render() {
    const nonEmptyKeys = Object.keys(this.props.shortcut.keys).filter(
      (key: string) => this.props.shortcut.keys[key][0] !== ''
    );
    if (this.props.shortcut.id === 'error_row') {
      return (
        <tr 
          className = {classes(RowStyle)}
        >
          <td colSpan={this.props.showSelectors ? 5 : 4}>
            <div className = {ConflictContainerStyle(this.props.showSelectors, this.props.errorSize)}>
              <div className = {ErrorMessageStyle}>{'Shortcut already in use by ' + (this.props.shortcut as ErrorObject).takenBy.takenByLabel + '. Overwrite it?'}</div>
              <div className={ErrorButtonStyle}>
                <button>Cancel</button>
                <button 
                  id='no-blur'
                  onClick={()=>{document.getElementById('overwrite').click()}}
                >Overwrite</button>
              </div>
            </div>
          </td>
        </tr>
      )
    } else {
      return (
        <div
          className={ RowStyle }
        >
          <div className={CellStyle}>
            {this.props.shortcut.category}
          </div>
          <div className={CellStyle}>
            <div className="jp-label">{this.props.shortcut.label}</div>
          </div>
          <div className={CellStyle}>
            <div className={ShortcutCellStyle}>
              {/** Create shortcut boxes and delete buttons for each shortcut */}
              {nonEmptyKeys.map((key, index) => (
                <div 
                  className={ShortcutContainerStyle} 
                  key={key + '_' + index}
                  onClick={() => {
                    if (index == 0) {
                      this.toggleInputReplaceLeft()
                    } else {
                      this.toggleInputReplaceRight()
                    }
                  }}
                >
                  {!((index === 0 && this.state.displayReplaceInputLeft) || 
                      (index === 1 && this.state.displayReplaceInputRight)) ? 
                      
                      this.props.shortcut.keys[key].map((keyBinding: string, index: number) => (
                      <div className={ShortcutKeysContainerStyle} key={index}>
                        <div className={ShortcutKeysStyle} id={'shortcut-keys'}>
                          {this.toSymbols(keyBinding)}
                        </div>
                        {index + 1 < this.props.shortcut.keys[key].length ? (
                          <div className={CommaStyle}>,</div>
                        ) : null}
                      </div>
                      ))

                    : <ShortcutInput
                        handleUpdate={this.props.handleUpdate}
                        deleteShortcut={this.props.deleteShortcut}
                        toggleInput={index === 0 
                          ? this.toggleInputReplaceLeft 
                          : this.toggleInputReplaceRight
                        }
                        shortcut={this.props.shortcut}
                        shortcutId={key}
                        toSymbols={this.toSymbols}
                        keyBindingsUsed={this.props.keyBindingsUsed}
                        sortConflict={this.props.sortConflict}
                        clearConflicts={this.props.clearConflicts}
                        displayInput={index === 0
                          ? this.state.displayReplaceInputLeft
                          : this.state.displayReplaceInputRight
                        }
                        newOrReplace={'replace'}
                        placeholder={this.toSymbols(this.props.shortcut.keys[key].join(', '))}
                      />
                  }
                  {index === 0 && (
                    <div className={OrStyle}>or</div>
                  )}
                </div>
              ))}

              {/** Add a plus for adding new shortcuts if there are less than two set */}
              {nonEmptyKeys.length ===1 && !this.state.displayNewInput && (
                <a
                  className={!this.state.displayNewInput ? PlusStyle : ''}
                  onClick={() => {
                    this.toggleInputNew(), this.props.clearConflicts();
                  }}
                  id='add-link'
                >
                  Add Another
                </a>
              )}
              {nonEmptyKeys.length === 0 && !this.state.displayNewInput && (
                <a
                className={!this.state.displayNewInput ? PlusStyle : ''}
                onClick={() => {
                  this.toggleInputNew(), this.props.clearConflicts();
                }}
                id='add-link'
              >
                Add New
              </a>
              )}

              {/** Display input box when toggled */}
              {this.state.displayNewInput && (
                <ShortcutInput
                  handleUpdate={this.props.handleUpdate}
                  deleteShortcut={this.props.deleteShortcut}
                  toggleInput={this.toggleInputNew}
                  shortcut={this.props.shortcut}
                  shortcutId=''
                  toSymbols={this.toSymbols}
                  keyBindingsUsed={this.props.keyBindingsUsed}
                  sortConflict={this.props.sortConflict}
                  clearConflicts={this.props.clearConflicts}
                  displayInput={this.state.displayNewInput}
                  newOrReplace={'new'}
                  placeholder={''}
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
}
