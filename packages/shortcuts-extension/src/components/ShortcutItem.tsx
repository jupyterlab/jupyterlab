/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { TranslationBundle } from '@jupyterlab/translation';
import { Platform } from '@lumino/domutils';
import * as React from 'react';
import {
  CONFLICT_CONTAINER_CLASS,
  IConflicts,
  ShortcutInput
} from './ShortcutInput';
import {
  IKeybinding,
  IShortcutRegistry,
  IShortcutTarget,
  IShortcutUI
} from '../types';

/** Props for ShortcutItem component */
export interface IShortcutItemProps {
  shortcut: IShortcutTarget;
  addKeybinding: IShortcutUI['addKeybinding'];
  replaceKeybinding: IShortcutUI['replaceKeybinding'];
  resetKeybindings: IShortcutUI['resetKeybindings'];
  deleteKeybinding: IShortcutUI['deleteKeybinding'];
  findConflictsFor: IShortcutRegistry['findConflictsFor'];
  showSelectors: boolean;
  external: IShortcutUI.IExternalBundle;
}

/** State for ShortcutItem component */
export interface IShortcutItemState {
  displayNewInput: boolean;
  displayReplaceInput: Readonly<Record<number, boolean>>;
  conflicts: ReadonlyMap<IKeybinding | null, IConflicts>;
}

/** React component for each command shortcut item */
export class ShortcutItem extends React.Component<
  IShortcutItemProps,
  IShortcutItemState
> {
  constructor(props: IShortcutItemProps) {
    super(props);
    this._trans = this.props.external.translator.load('jupyterlab');

    this.state = {
      displayNewInput: false,
      displayReplaceInput: Object.freeze({}),
      conflicts: new Map()
    };
  }

  componentDidMount(): void {
    this.props.external.actionRequested.connect(this._onActionRequested, this);
  }

  componentWillUnmount(): void {
    this.props.external.actionRequested.disconnect(
      this._onActionRequested,
      this
    );
  }

  private async _onActionRequested(
    _: unknown,
    action: IShortcutUI.ActionRequest
  ): Promise<void> {
    if (
      'shortcutId' in action &&
      action.shortcutId !== this.props.shortcut.id
    ) {
      return;
    }
    if (action.request === 'add-keybinding') {
      return this.toggleInputNew();
    }
    if (action.request === 'edit-keybinding') {
      this.toggleInputReplaceMethod(action.keybinding);
    }
    if (action.request === 'delete-keybinding') {
      const target = this.props.shortcut;
      const binding = target.keybindings[action.keybinding];
      this.props.deleteKeybinding(target, binding).catch(console.error);
    }
  }

  /** Toggle display state of input box */
  private toggleInputNew = (): void => {
    this.setState({
      displayNewInput: !this.state.displayNewInput,
      // reset conflicts
      conflicts: new Map()
    });
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

  getCategoryCell(): JSX.Element {
    return (
      <div className="jp-Shortcuts-Cell">{this.props.shortcut.category}</div>
    );
  }

  getLabelCell(): JSX.Element {
    return (
      <div className="jp-Shortcuts-Cell">
        <div className="jp-label">
          {this.props.shortcut.label ??
            this._trans.__('(Command label missing)')}
        </div>
      </div>
    );
  }

  getResetShortCutLink(): JSX.Element {
    return (
      <a
        className="jp-Shortcuts-Reset"
        onClick={() => this.props.resetKeybindings(this.props.shortcut)}
      >
        {this._trans.__('Reset')}
      </a>
    );
  }

  getSourceCell(): JSX.Element {
    const allDefault = this.props.shortcut.keybindings.every(
      binding => binding.isDefault
    );
    return (
      <div className="jp-Shortcuts-Cell">
        <div className="jp-Shortcuts-SourceCell">
          {allDefault ? this._trans.__('Default') : this._trans.__('Custom')}
        </div>
        {!allDefault ? this.getResetShortCutLink() : ''}
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

  getClassNameForShortCuts(nonEmptyBindings: IKeybinding[]): string {
    const classes = ['jp-Shortcuts-ShortcutCell'];
    switch (nonEmptyBindings.length) {
      case 1:
        classes.push('jp-Shortcuts-SingleCell');
        break;
      case 0:
        classes.push('jp-Shortcuts-EmptyCell');
        break;
    }
    return classes.join(' ');
  }

  toggleInputReplaceMethod(location: number): void {
    const previous = this.state.displayReplaceInput[location];
    this.setState({
      displayReplaceInput: {
        ...this.state.displayReplaceInput,
        [location]: !previous
      },
      // Clear old conflicts
      conflicts: new Map()
    });
  }

  getDisplayReplaceInput(location: number): boolean {
    return this.state.displayReplaceInput[location];
  }

  getOrDiplayIfNeeded(force: boolean): JSX.Element {
    const classes = ['jp-Shortcuts-Or'];
    if (force || this.state.displayNewInput) {
      classes.push('jp-Shortcuts-Or-Forced');
    }
    return <div className={classes.join(' ')}>{this._trans.__('or')}</div>;
  }

  getShortCutAsInput(binding: IKeybinding, location: number): JSX.Element {
    return (
      <ShortcutInput
        addKeybinding={this.props.addKeybinding}
        replaceKeybinding={this.props.replaceKeybinding}
        deleteKeybinding={this.props.deleteKeybinding}
        findConflictsFor={this.props.findConflictsFor}
        toggleInput={() => this.toggleInputReplaceMethod(location)}
        shortcut={this.props.shortcut}
        keybinding={binding}
        displayConflicts={(data: IConflicts) => {
          const conflicts = new Map(this.state.conflicts);
          conflicts.set(binding, data);
          this.setState({ conflicts });
        }}
        toSymbols={this.toSymbols}
        displayInput={this.getDisplayReplaceInput(location)}
        placeholder={this.toSymbols(binding.keys.join(', '))}
        translator={this.props.external.translator}
      />
    );
  }

  getShortCutForDisplayOnly(binding: IKeybinding): JSX.Element[] {
    return binding.keys.map((keyboardKey: string, index: number) => (
      <div className="jp-Shortcuts-ShortcutKeysContainer" key={index}>
        <div className="jp-Shortcuts-ShortcutKeys">
          {this.toSymbols(keyboardKey)}
        </div>
        {index + 1 < binding.keys.length ? (
          <div className="jp-Shortcuts-Comma">,</div>
        ) : null}
      </div>
    ));
  }

  isLocationBeingEdited(location: number): boolean {
    return this.state.displayReplaceInput[location];
  }

  getDivForKey(
    index: number,
    binding: IKeybinding,
    nonEmptyBindings: IKeybinding[]
  ): JSX.Element {
    return (
      <div
        className="jp-Shortcuts-ShortcutContainer"
        key={this.props.shortcut.id + '_' + index}
        data-keybinding={index}
        data-shortcut={this.props.shortcut.id}
        onClick={() => this.toggleInputReplaceMethod(index)}
      >
        {this.isLocationBeingEdited(index)
          ? this.getShortCutAsInput(binding, index)
          : this.getShortCutForDisplayOnly(binding)}
        {!(
          index === this._nonEmptyBindings.length - 1 &&
          Object.values(this.state.displayReplaceInput).some(Boolean)
        ) &&
          this.getOrDiplayIfNeeded(index < this._nonEmptyBindings.length - 1)}
      </div>
    );
  }

  getAddLink(): JSX.Element {
    return (
      <a
        className={!this.state.displayNewInput ? 'jp-Shortcuts-Plus' : ''}
        onClick={() => {
          this.toggleInputNew();
        }}
      >
        {this._trans.__('Add')}
      </a>
    );
  }

  getInputBoxWhenToggled(): JSX.Element {
    return this.state.displayNewInput ? (
      <ShortcutInput
        addKeybinding={this.props.addKeybinding}
        replaceKeybinding={this.props.replaceKeybinding}
        deleteKeybinding={this.props.deleteKeybinding}
        findConflictsFor={this.props.findConflictsFor}
        toggleInput={this.toggleInputNew}
        shortcut={this.props.shortcut}
        displayConflicts={(data: IConflicts) => {
          const conflicts = new Map(this.state.conflicts);
          conflicts.set(null, data);
          this.setState({ conflicts });
        }}
        toSymbols={this.toSymbols}
        displayInput={this.state.displayNewInput}
        placeholder={''}
        translator={this.props.external.translator}
      />
    ) : (
      <div />
    );
  }

  getShortCutsCell(nonEmptyBindings: IKeybinding[]): JSX.Element {
    return (
      <div className="jp-Shortcuts-Cell">
        <div className={this.getClassNameForShortCuts(nonEmptyBindings)}>
          {nonEmptyBindings.map((key, index) =>
            this.getDivForKey(index, key, nonEmptyBindings)
          )}
          {nonEmptyBindings.length >= 1 &&
            !this.state.displayNewInput &&
            !Object.values(this.state.displayReplaceInput).some(Boolean) &&
            this.getAddLink()}
          {nonEmptyBindings.length === 0 &&
            !this.state.displayNewInput &&
            this.getAddLink()}
          {this.getInputBoxWhenToggled()}
        </div>
      </div>
    );
  }

  getConflicts(): JSX.Element {
    const conflicts = [...this.state.conflicts.values()].filter(
      conflict => conflict.conflictsWith.length !== 0
    );
    if (conflicts.length === 0) {
      return <></>;
    }
    return (
      <div className="jp-Shortcuts-Row jp-Shortcuts-RowWithConflict">
        <div className={CONFLICT_CONTAINER_CLASS}>
          {conflicts.map(conflict => {
            const key =
              conflict.keys.join(' ') +
              '_' +
              conflict.conflictsWith.map(target => target.id).join('');
            return (
              <div className="jp-Shortcuts-Conflict" key={key}>
                <div className="jp-Shortcuts-ErrorMessage">
                  {this._trans.__(
                    'Shortcut already in use by %1. Overwrite it?',
                    conflict.conflictsWith
                      .map(target => target.label ?? target.command)
                      .join(', ')
                  )}
                </div>
                <div className="jp-Shortcuts-ErrorButton">
                  <button
                    className="jp-Button jp-mod-reject jp-mod-styled"
                    onClick={() => {
                      this._clearConflict(conflict);
                      conflict.cancel();
                    }}
                  >
                    {this._trans.__('Cancel')}
                  </button>
                  <button
                    className="jp-Button jp-mod-warn jp-mod-styled"
                    onClick={() => {
                      // Clear the conflict first to prevent user from accidentally clicking this button twice
                      this._clearConflict(conflict);
                      conflict.overwrite();
                    }}
                  >
                    {this._trans.__('Overwrite')}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  /**
   * Mark conflict as resolved.
   */
  private _clearConflict(conflictToClear: IConflicts) {
    const conflicts = new Map();
    const idToSkip = this._conflictId(conflictToClear);
    for (const [binding, conflict] of this.state.conflicts.entries()) {
      if (this._conflictId(conflict) !== idToSkip) {
        conflicts.set(binding, conflict);
      }
    }
    this.setState({ conflicts });
  }

  /**
   * Create a unique conflict identifier.
   */
  private _conflictId(conflict: IConflicts): string {
    return (
      conflict.keys.join(' ') +
      '_' +
      conflict.conflictsWith.map(target => target.id).join('')
    );
  }

  private get _nonEmptyBindings() {
    return this.props.shortcut.keybindings.filter(
      binding => binding.keys.filter(k => k != '').length !== 0
    );
  }

  render(): JSX.Element {
    return (
      <>
        <div
          className="jp-Shortcuts-Row"
          data-shortcut={this.props.shortcut.id}
        >
          {this.getCategoryCell()}
          {this.getLabelCell()}
          {this.getShortCutsCell(this._nonEmptyBindings)}
          {this.getSourceCell()}
          {this.getOptionalSelectorCell()}
        </div>
        {this.getConflicts()}
      </>
    );
  }

  private _trans: TranslationBundle;
}
