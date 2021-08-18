import { ErrorObject, ShortcutObject, TakenByObject } from './ShortcutInput';

import { ShortcutInput } from './ShortcutInput';

import { Platform } from '@lumino/domutils';

import { classes } from 'typestyle';

import * as React from 'react';

import {
  CellStyle,
  CommaStyle,
  ConflictContainerStyle,
  EmptyShortcutCellStyle,
  ErrorButtonStyle,
  ErrorMessageStyle,
  OrStyle,
  OrTwoStyle,
  PlusStyle,
  ResetStyle,
  RowStyle,
  ShortcutCellStyle,
  ShortcutContainerStyle,
  ShortcutKeysContainerStyle,
  ShortcutKeysStyle,
  SingleShortcutCellStyle,
  SourceCellStyle
} from '../componentStyle/ShortcutItemStyle';

import { UISize } from './ShortcutUI';
import { IShortcutUIexternal } from './TopNav';

/** Props for ShortcutItem component */
export interface IShortcutItemProps {
  shortcut: ShortcutObject | ErrorObject;
  handleUpdate: Function;
  resetShortcut: Function;
  deleteShortcut: Function;
  showSelectors: boolean;
  keyBindingsUsed: { [index: string]: TakenByObject };
  sortConflict: Function;
  clearConflicts: Function;
  errorSize: UISize;
  contextMenu: Function;
  external: IShortcutUIexternal;
}

/** State for ShortcutItem component */
export interface IShortcutItemState {
  displayNewInput: boolean;
  displayReplaceInputLeft: boolean;
  displayReplaceInputRight: boolean;
  numShortcuts: number;
}

enum ShortCutLocation {
  Left,
  Right
}

/** Describe commands that are used by shortcuts */
namespace Commands {
  export const shortcutEditLeft = {
    commandId: 'shortcutui:EditLeft',
    label: 'Edit First',
    caption: 'Edit existing shortcut'
  };
  export const shortcutEditRight = {
    commandId: 'shortcutui:EditRight',
    label: 'Edit Second',
    caption: 'Edit existing shortcut'
  };
  export const shortcutEdit = {
    commandId: 'shortcutui:Edit',
    label: 'Edit',
    caption: 'Edit existing sortcut'
  };
  export const shortcutAddNew = {
    commandId: 'shortcutui:AddNew',
    label: 'Add',
    caption: 'Add new shortcut'
  };
  export const shortcutAddAnother = {
    commandId: 'shortcutui:AddAnother',
    label: 'Add',
    caption: 'Add another shortcut'
  };
  export const shortcutReset = {
    commandId: 'shortcutui:Reset',
    label: 'Reset',
    caption: 'Reset shortcut back to default'
  };
}

/** React component for each command shortcut item */
export class ShortcutItem extends React.Component<
  IShortcutItemProps,
  IShortcutItemState
> {
  constructor(props: any) {
    super(props);

    this.state = {
      displayNewInput: false,
      displayReplaceInputLeft: false,
      displayReplaceInputRight: false,
      numShortcuts: Object.keys(this.props.shortcut.keys).filter(
        key => this.props.shortcut.keys[key][0] !== ''
      ).length
    };
  }

  /** Toggle display state of input box */
  private toggleInputNew = (): void => {
    this.setState({
      displayNewInput: !this.state.displayNewInput
    });
  };

  private toggleInputReplaceLeft = (): void => {
    this.setState({
      displayReplaceInputLeft: !this.state.displayReplaceInputLeft
    });
  };

  private toggleInputReplaceRight = (): void => {
    this.setState({
      displayReplaceInputRight: !this.state.displayReplaceInputRight
    });
  };

  private addCommandIfNeeded = (command: any, action: () => void): void => {
    const key =
      this.props.shortcut.commandName + '_' + this.props.shortcut.selector;

    if (!this.props.external.hasCommand(command.commandId + key)) {
      this.props.external.addCommand(command.commandId + key, {
        label: command.label,
        caption: command.caption,
        execute: action
      });
    }
  };

  private handleRightClick = (e: any): void => {
    this.addCommandIfNeeded(Commands.shortcutEdit, () =>
      this.toggleInputReplaceLeft()
    );
    this.addCommandIfNeeded(Commands.shortcutEditLeft, () =>
      this.toggleInputReplaceLeft()
    );
    this.addCommandIfNeeded(Commands.shortcutEditRight, () =>
      this.toggleInputReplaceRight()
    );
    this.addCommandIfNeeded(Commands.shortcutAddNew, () =>
      this.toggleInputNew()
    );
    this.addCommandIfNeeded(Commands.shortcutAddAnother, () =>
      this.toggleInputNew()
    );
    this.addCommandIfNeeded(Commands.shortcutReset, () =>
      this.props.resetShortcut(this.props.shortcut)
    );

    const key =
      this.props.shortcut.commandName + '_' + this.props.shortcut.selector;

    this.setState(
      {
        numShortcuts: Object.keys(this.props.shortcut.keys).filter(
          key => this.props.shortcut.keys[key][0] !== ''
        ).length
      },
      () => {
        let commandList: any[] = [];
        if (this.state.numShortcuts == 2) {
          commandList = commandList.concat([
            Commands.shortcutEditLeft.commandId + key,
            Commands.shortcutEditRight.commandId + key
          ]);
        } else if (this.state.numShortcuts == 1) {
          commandList = commandList.concat([
            Commands.shortcutEdit.commandId + key,
            Commands.shortcutAddAnother.commandId + key
          ]);
        } else {
          commandList = commandList.concat([
            Commands.shortcutAddNew.commandId + key
          ]);
        }

        if (this.props.shortcut.source === 'Custom') {
          commandList = commandList.concat([
            Commands.shortcutReset.commandId + key
          ]);
        }

        this.props.contextMenu(e, commandList);
      }
    );
  };

  /** Transform special key names into unicode characters */
  toSymbols = (value: string): string => {
    return value.split(' ').reduce((result, key) => {
      if (key === 'Ctrl') {
        return (result + ' ⌃').trim();
      } else if (key === 'Alt') {
        return (result + ' ⌥').trim();
      } else if (key === 'Shift') {
        return (result + ' ⇧').trim();
      } else if (key === 'Accel' && Platform.IS_MAC) {
        return (result + ' ⌘').trim();
      } else if (key === 'Accel') {
        return (result + ' ⌃').trim();
      } else {
        return (result + ' ' + key).trim();
      }
    }, '');
  };

  getErrorRow(): JSX.Element {
    return (
      <div className={classes(RowStyle)}>
        <div
          className={ConflictContainerStyle(
            this.props.showSelectors,
            this.props.errorSize
          )}
        >
          <div className={ErrorMessageStyle}>
            {'Shortcut already in use by ' +
              (this.props.shortcut as ErrorObject).takenBy.takenByLabel +
              '. Overwrite it?'}
          </div>
          <div className={ErrorButtonStyle}>
            <button>Cancel</button>
            <button
              id="no-blur"
              onClick={() => {
                document.getElementById('overwrite')?.click();
              }}
            >
              Overwrite
            </button>
          </div>
        </div>
      </div>
    );
  }

  getCategoryCell(): JSX.Element {
    return <div className={CellStyle}>{this.props.shortcut.category}</div>;
  }

  getLabelCell(): JSX.Element {
    return (
      <div className={CellStyle}>
        <div className="jp-label">{this.props.shortcut.label}</div>
      </div>
    );
  }

  getResetShortCutLink(): JSX.Element {
    return (
      <a
        className={ResetStyle}
        onClick={() => this.props.resetShortcut(this.props.shortcut)}
      >
        Reset
      </a>
    );
  }

  getSourceCell(): JSX.Element {
    return (
      <div className={CellStyle}>
        <div className={SourceCellStyle}>{this.props.shortcut.source}</div>
        {this.props.shortcut.source === 'Custom' && this.getResetShortCutLink()}
      </div>
    );
  }

  getOptionalSelectorCell(): JSX.Element {
    return this.props.showSelectors ? (
      <div className={CellStyle}>
        <div className="jp-selector">{this.props.shortcut.selector}</div>
      </div>
    ) : (
      <div />
    );
  }

  getClassNameForShortCuts(nonEmptyKeys: string[]): string {
    return nonEmptyKeys.length === 0
      ? classes(ShortcutCellStyle, EmptyShortcutCellStyle)
      : nonEmptyKeys.length === 1
      ? classes(ShortcutCellStyle, SingleShortcutCellStyle)
      : ShortcutCellStyle;
  }

  getToggleInputReplaceMethod(location: ShortCutLocation): () => void {
    switch (location) {
      case ShortCutLocation.Left:
        return this.toggleInputReplaceLeft;
      case ShortCutLocation.Right:
        return this.toggleInputReplaceRight;
    }
  }

  getDisplayReplaceInput(location: ShortCutLocation): boolean {
    switch (location) {
      case ShortCutLocation.Left:
        return this.state.displayReplaceInputLeft;
      case ShortCutLocation.Right:
        return this.state.displayReplaceInputRight;
    }
  }

  getOrDiplayIfNeeded(nonEmptyKeys: string[]): JSX.Element {
    return (
      <div
        className={
          nonEmptyKeys.length == 2 || this.state.displayNewInput
            ? OrTwoStyle
            : OrStyle
        }
        id={
          nonEmptyKeys.length == 2
            ? 'secondor'
            : this.state.displayReplaceInputLeft
            ? 'noor'
            : 'or'
        }
      >
        or
      </div>
    );
  }

  getShortCutAsInput(key: string, location: ShortCutLocation): JSX.Element {
    return (
      <ShortcutInput
        handleUpdate={this.props.handleUpdate}
        deleteShortcut={this.props.deleteShortcut}
        toggleInput={this.getToggleInputReplaceMethod(location)}
        shortcut={this.props.shortcut}
        shortcutId={key}
        toSymbols={this.toSymbols}
        keyBindingsUsed={this.props.keyBindingsUsed}
        sortConflict={this.props.sortConflict}
        clearConflicts={this.props.clearConflicts}
        displayInput={this.getDisplayReplaceInput(location)}
        newOrReplace={'replace'}
        placeholder={this.toSymbols(this.props.shortcut.keys[key].join(', '))}
      />
    );
  }

  getShortCutForDisplayOnly(key: string): JSX.Element[] {
    return this.props.shortcut.keys[key].map(
      (keyBinding: string, index: number) => (
        <div className={ShortcutKeysContainerStyle} key={index}>
          <div className={ShortcutKeysStyle} id={'shortcut-keys'}>
            {this.toSymbols(keyBinding)}
          </div>
          {index + 1 < this.props.shortcut.keys[key].length ? (
            <div className={CommaStyle}>,</div>
          ) : null}
        </div>
      )
    );
  }

  isLocationBeingEdited(location: ShortCutLocation): boolean {
    return (
      (location === ShortCutLocation.Left &&
        this.state.displayReplaceInputLeft) ||
      (location === ShortCutLocation.Right &&
        this.state.displayReplaceInputRight)
    );
  }

  getLocationFromIndex(index: number): ShortCutLocation {
    return index === 0 ? ShortCutLocation.Left : ShortCutLocation.Right;
  }

  getDivForKey(
    index: number,
    key: string,
    nonEmptyKeys: string[]
  ): JSX.Element {
    const location = this.getLocationFromIndex(index);
    return (
      <div
        className={ShortcutContainerStyle}
        key={this.props.shortcut.id + '_' + index}
        onClick={this.getToggleInputReplaceMethod(location)}
      >
        {this.isLocationBeingEdited(location)
          ? this.getShortCutAsInput(key, location)
          : this.getShortCutForDisplayOnly(key)}
        {location === ShortCutLocation.Left &&
          this.getOrDiplayIfNeeded(nonEmptyKeys)}
      </div>
    );
  }

  getAddLink(): JSX.Element {
    return (
      <a
        className={!this.state.displayNewInput ? PlusStyle : ''}
        onClick={() => {
          this.toggleInputNew(), this.props.clearConflicts();
        }}
        id="add-link"
      >
        Add
      </a>
    );
  }

  getInputBoxWhenToggled(): JSX.Element {
    return this.state.displayNewInput ? (
      <ShortcutInput
        handleUpdate={this.props.handleUpdate}
        deleteShortcut={this.props.deleteShortcut}
        toggleInput={this.toggleInputNew}
        shortcut={this.props.shortcut}
        shortcutId=""
        toSymbols={this.toSymbols}
        keyBindingsUsed={this.props.keyBindingsUsed}
        sortConflict={this.props.sortConflict}
        clearConflicts={this.props.clearConflicts}
        displayInput={this.state.displayNewInput}
        newOrReplace={'new'}
        placeholder={''}
      />
    ) : (
      <div />
    );
  }

  getShortCutsCell(nonEmptyKeys: string[]): JSX.Element {
    return (
      <div className={CellStyle}>
        <div className={this.getClassNameForShortCuts(nonEmptyKeys)}>
          {nonEmptyKeys.map((key, index) =>
            this.getDivForKey(index, key, nonEmptyKeys)
          )}
          {nonEmptyKeys.length === 1 &&
            !this.state.displayNewInput &&
            !this.state.displayReplaceInputLeft &&
            this.getAddLink()}
          {nonEmptyKeys.length === 0 &&
            !this.state.displayNewInput &&
            this.getAddLink()}
          {this.getInputBoxWhenToggled()}
        </div>
      </div>
    );
  }

  render() {
    const nonEmptyKeys = Object.keys(this.props.shortcut.keys).filter(
      (key: string) => this.props.shortcut.keys[key][0] !== ''
    );
    if (this.props.shortcut.id === 'error_row') {
      return this.getErrorRow();
    } else {
      return (
        <div
          className={RowStyle}
          onContextMenu={e => {
            e.persist();
            this.handleRightClick(e);
          }}
        >
          {this.getCategoryCell()}
          {this.getLabelCell()}
          {this.getShortCutsCell(nonEmptyKeys)}
          {this.getSourceCell()}
          {this.getOptionalSelectorCell()}
        </div>
      );
    }
  }
}
