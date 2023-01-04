/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { TranslationBundle } from '@jupyterlab/translation';
import { Platform } from '@lumino/domutils';
import * as React from 'react';
import {
  ErrorObject,
  ShortcutInput,
  ShortcutObject,
  TakenByObject
} from './ShortcutInput';
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
function getCommands(trans: TranslationBundle): {
  [key: string]: { commandId: string; label: string; caption: string };
} {
  return {
    shortcutEditLeft: {
      commandId: 'shortcutui:EditLeft',
      label: trans.__('Edit First'),
      caption: trans.__('Edit existing shortcut')
    },
    shortcutEditRight: {
      commandId: 'shortcutui:EditRight',
      label: trans.__('Edit Second'),
      caption: trans.__('Edit existing shortcut')
    },
    shortcutEdit: {
      commandId: 'shortcutui:Edit',
      label: trans.__('Edit'),
      caption: trans.__('Edit existing shortcut')
    },
    shortcutAddNew: {
      commandId: 'shortcutui:AddNew',
      label: trans.__('Add'),
      caption: trans.__('Add new shortcut')
    },
    shortcutAddAnother: {
      commandId: 'shortcutui:AddAnother',
      label: trans.__('Add'),
      caption: trans.__('Add another shortcut')
    },
    shortcutReset: {
      commandId: 'shortcutui:Reset',
      label: trans.__('Reset'),
      caption: trans.__('Reset shortcut back to default')
    }
  };
}

/** React component for each command shortcut item */
export class ShortcutItem extends React.Component<
  IShortcutItemProps,
  IShortcutItemState
> {
  constructor(props: IShortcutItemProps) {
    super(props);

    this._commands = getCommands(props.external.translator.load('jupyterlab'));

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
    this.addCommandIfNeeded(this._commands.shortcutEdit, () =>
      this.toggleInputReplaceLeft()
    );
    this.addCommandIfNeeded(this._commands.shortcutEditLeft, () =>
      this.toggleInputReplaceLeft()
    );
    this.addCommandIfNeeded(this._commands.shortcutEditRight, () =>
      this.toggleInputReplaceRight()
    );
    this.addCommandIfNeeded(this._commands.shortcutAddNew, () =>
      this.toggleInputNew()
    );
    this.addCommandIfNeeded(this._commands.shortcutAddAnother, () =>
      this.toggleInputNew()
    );
    this.addCommandIfNeeded(this._commands.shortcutReset, () =>
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
            this._commands.shortcutEditLeft.commandId + key,
            this._commands.shortcutEditRight.commandId + key
          ]);
        } else if (this.state.numShortcuts == 1) {
          commandList = commandList.concat([
            this._commands.shortcutEdit.commandId + key,
            this._commands.shortcutAddAnother.commandId + key
          ]);
        } else {
          commandList = commandList.concat([
            this._commands.shortcutAddNew.commandId + key
          ]);
        }

        if (this.props.shortcut.source === 'Custom') {
          commandList = commandList.concat([
            this._commands.shortcutReset.commandId + key
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
    const trans = this.props.external.translator.load('jupyterlab');

    return (
      <div className="jp-Shortcuts-Row">
        <div className="jp-Shortcuts-ConflictContainer">
          <div className="jp-Shortcuts-ErrorMessage">
            {trans.__(
              'Shortcut already in use by %1. Overwrite it?',
              (this.props.shortcut as ErrorObject).takenBy.takenByLabel
            )}
          </div>
          <div className="jp-Shortcuts-ErrorButton">
            <button>{trans.__('Cancel')}</button>
            <button
              id="no-blur"
              onClick={() => {
                document.getElementById('overwrite')?.click();
              }}
            >
              {trans.__('Overwrite')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  getCategoryCell(): JSX.Element {
    return (
      <div className="jp-Shortcuts-Cell">{this.props.shortcut.category}</div>
    );
  }

  getLabelCell(): JSX.Element {
    return (
      <div className="jp-Shortcuts-Cell">
        <div className="jp-label">{this.props.shortcut.label}</div>
      </div>
    );
  }

  getResetShortCutLink(): JSX.Element {
    const trans = this.props.external.translator.load('jupyterlab');
    return (
      <a
        className="jp-Shortcuts-Reset"
        onClick={() => this.props.resetShortcut(this.props.shortcut)}
      >
        {trans.__('Reset')}
      </a>
    );
  }

  getSourceCell(): JSX.Element {
    return (
      <div className="jp-Shortcuts-Cell">
        <div className="jp-Shortcuts-SourceCell">
          {this.props.shortcut.source}
        </div>
        {this.props.shortcut.source === 'Custom' && this.getResetShortCutLink()}
      </div>
    );
  }

  getOptionalSelectorCell(): JSX.Element | null {
    return this.props.showSelectors ? (
      <div className="jp-Shortcuts-Cell">
        <div className="jp-selector">{this.props.shortcut.selector}</div>
      </div>
    ) : null;
  }

  getClassNameForShortCuts(nonEmptyKeys: string[]): string {
    const classes = ['jp-Shortcuts-ShortcutCell'];
    switch (nonEmptyKeys.length) {
      case 1:
        classes.push('jp-Shortcuts-SingleCell');
        break;
      case 0:
        classes.push('jp-Shortcuts-EmptyCell');
        break;
    }
    return classes.join(' ');
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
    const trans = this.props.external.translator.load('jupyterlab');
    return (
      <div
        className={
          nonEmptyKeys.length == 2 || this.state.displayNewInput
            ? 'jp-Shortcuts-OrTwo'
            : 'jp-Shortcuts-Or'
        }
        id={
          nonEmptyKeys.length == 2
            ? 'secondor'
            : this.state.displayReplaceInputLeft
            ? 'noor'
            : 'or'
        }
      >
        {trans.__('or')}
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
        translator={this.props.external.translator}
      />
    );
  }

  getShortCutForDisplayOnly(key: string): JSX.Element[] {
    return this.props.shortcut.keys[key].map(
      (keyBinding: string, index: number) => (
        <div className="jp-Shortcuts-ShortcutKeysContainer" key={index}>
          <div className="jp-Shortcuts-ShortcutKeys">
            {this.toSymbols(keyBinding)}
          </div>
          {index + 1 < this.props.shortcut.keys[key].length ? (
            <div className="jp-Shortcuts-Comma">,</div>
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
        className="jp-Shortcuts-ShortcutContainer"
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
    const trans = this.props.external.translator.load('jupyterlab');
    return (
      <a
        className={!this.state.displayNewInput ? 'jp-Shortcuts-Plus' : ''}
        onClick={() => {
          this.toggleInputNew(), this.props.clearConflicts();
        }}
        id="add-link"
      >
        {trans.__('Add')}
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
        translator={this.props.external.translator}
      />
    ) : (
      <div />
    );
  }

  getShortCutsCell(nonEmptyKeys: string[]): JSX.Element {
    return (
      <div className="jp-Shortcuts-Cell">
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

  render(): JSX.Element {
    const nonEmptyKeys = Object.keys(this.props.shortcut.keys).filter(
      (key: string) => this.props.shortcut.keys[key][0] !== ''
    );
    if (this.props.shortcut.id === 'error_row') {
      return this.getErrorRow();
    } else {
      return (
        <div
          className="jp-Shortcuts-Row"
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

  private _commands: {
    [key: string]: { commandId: string; label: string; caption: string };
  };
}
