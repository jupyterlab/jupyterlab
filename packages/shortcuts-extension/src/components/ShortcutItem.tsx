/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import type { TranslationBundle } from '@jupyterlab/translation';
import {
  addIcon,
  deleteIcon,
  editIcon,
  infoIcon,
  restoreIcon
} from '@jupyterlab/ui-components';
import { Platform } from '@lumino/domutils';
import * as React from 'react';
import { CustomOptionsDialog } from './ShortcutCustomOptions';
import type { IConflicts } from './ShortcutInput';
import { ShortcutInput } from './ShortcutInput';
import type {
  IKeybinding,
  IShortcutRegistry,
  IShortcutTarget,
  IShortcutUI
} from '../types';

const MAC_SYMBOLS: Record<string, string> = {
  Ctrl: '⌃',
  Alt: '⌥',
  Shift: '⇧',
  Accel: '⌘',
  Cmd: '⌘'
};

/** Props for ShortcutItem component */
export interface IShortcutItemProps {
  shortcut: IShortcutTarget;
  addKeybinding: IShortcutUI['addKeybinding'];
  replaceKeybinding: IShortcutUI['replaceKeybinding'];
  resetKeybindings: IShortcutUI['resetKeybindings'];
  deleteKeybinding: IShortcutUI['deleteKeybinding'];
  findConflictsFor: IShortcutRegistry['findConflictsFor'];
  setCustomOptions: IShortcutUI['setCustomOptions'];
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

  componentDidUpdate(): void {
    if (this._pendingFocusAddButton) {
      this._pendingFocusAddButton = false;
      requestAnimationFrame(() => {
        (
          this._shortcutCellRef.current?.querySelector(
            '.jp-Shortcuts-Plus'
          ) as HTMLElement | null
        )?.focus();
      });
      return;
    }
    if (this._pendingFocusKeybindingIndex === null) {
      return;
    }
    const index =
      this._pendingFocusKeybindingIndex === -1
        ? this._nonEmptyBindings.length - 1
        : this._pendingFocusKeybindingIndex;
    this._pendingFocusKeybindingIndex = null;
    if (index >= 0) {
      this._focusShortcutContainer(index);
    }
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

  /** Transform keystrokes for display; use + within a chord, comma between chords. */
  toSymbols = (value: string): string => {
    const mapKey = (key: string): string =>
      Platform.IS_MAC
        ? (MAC_SYMBOLS[key] ?? key)
        : key === 'Accel'
          ? 'Ctrl'
          : key;
    return value
      .split(',')
      .map(chord =>
        chord.trim().split(/\s+/).filter(Boolean).map(mapKey).join(' + ')
      )
      .join(', ');
  };

  getCategoryCell(): JSX.Element {
    return (
      <td className="jp-Shortcuts-Cell">{this.props.shortcut.category}</td>
    );
  }

  getLabelCell(): JSX.Element {
    return (
      <td className="jp-Shortcuts-Cell">
        <div className="jp-label">
          {this.props.shortcut.label ??
            this._trans.__('(Command label missing)')}
        </div>
      </td>
    );
  }

  getResetShortCutLink(): JSX.Element {
    const isDelete = this.props.shortcut.userDefined;
    const label = isDelete
      ? this._trans.__('Delete shortcut')
      : this._trans.__('Reset to default');
    return (
      <button
        type="button"
        className="jp-Button jp-mod-styled jp-mod-warn jp-Shortcuts-Reset jp-Shortcuts-Icon"
        onClick={() => this.props.resetKeybindings(this.props.shortcut)}
        title={label}
        aria-label={label}
      >
        {isDelete ? (
          <deleteIcon.react tag={null} />
        ) : (
          <restoreIcon.react tag={null} />
        )}
      </button>
    );
  }

  getSourceCell(): JSX.Element {
    const allDefault = this.props.shortcut.keybindings.every(
      binding => binding.isDefault
    );
    const editable = !!this.props.shortcut.userDefined;
    const showOptionsButtonTitle = editable
      ? this._trans.__('Custom options')
      : this._trans.__('Shortcut details');

    return (
      <td className="jp-Shortcuts-Cell">
        <div className="jp-Shortcuts-SourceCell">
          {allDefault ? this._trans.__('Default') : this._trans.__('Custom')}
        </div>
        {!allDefault ? this.getResetShortCutLink() : ''}
        {this.props.external.editorFactory && (
          <button
            type="button"
            className="jp-Button jp-mod-styled jp-mod-reject jp-Shortcuts-CustomOptions jp-Shortcuts-Icon"
            onClick={async () => {
              if (!this.props.external.editorFactory) {
                console.error('Cannot build the custom options form');
                return;
              }
              const dialog = new CustomOptionsDialog({
                shortcut: this.props.shortcut,
                translator: this.props.external.translator,
                editorFactory: this.props.external.editorFactory,
                readOnly: !editable
              });

              const result = await dialog.launch();
              if (result.button.accept && editable && result.value) {
                await this.props.setCustomOptions(
                  this.props.shortcut,
                  result.value
                );
              }
            }}
            title={showOptionsButtonTitle}
            aria-label={showOptionsButtonTitle}
          >
            {editable ? (
              <editIcon.react tag={null} />
            ) : (
              <infoIcon.react tag={null} />
            )}
          </button>
        )}
      </td>
    );
  }

  getOptionalSelectorCell(): JSX.Element | null {
    return this.props.showSelectors ? (
      <td className="jp-Shortcuts-Cell">
        <div className="jp-selector">{this.props.shortcut.selector}</div>
      </td>
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

  getOrDisplayIfNeeded(force: boolean): JSX.Element {
    const classes = ['jp-Shortcuts-Or'];
    if (force || this.state.displayNewInput) {
      classes.push('jp-Shortcuts-Or-Forced');
    }
    return <div className={classes.join(' ')}>{this._trans.__('or')}</div>;
  }

  getShortCutAsInput(binding: IKeybinding, location: number): JSX.Element {
    const commandName =
      this.props.shortcut.label ?? this.props.shortcut.command;
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
        clearConflict={() => this._clearConflictForBinding(binding)}
        onCloseAfterSubmit={() =>
          this._scheduleFocusShortcutContainer(location)
        }
        onCloseAfterCancel={() =>
          this._scheduleFocusShortcutContainer(location)
        }
        toSymbols={this.toSymbols}
        displayInput={this.getDisplayReplaceInput(location)}
        placeholder={this.toSymbols(binding.keys.join(', '))}
        translator={this.props.external.translator}
        ariaLabel={this._trans.__('Edit shortcut for %1', commandName)}
      />
    );
  }

  getShortCutForDisplayOnly(binding: IKeybinding): JSX.Element {
    return (
      <>
        {binding.keys.map((keyboardKey: string, index: number) => (
          <React.Fragment key={index}>
            <div className="jp-Shortcuts-ShortcutKeys">
              {this.toSymbols(keyboardKey)
                .split(' + ')
                .map((keyPart, keyPartIndex, keyParts) => (
                  <React.Fragment key={`${index}-${keyPart}-${keyPartIndex}`}>
                    <span className="jp-ContextualShortcut-Key">{keyPart}</span>
                    {keyPartIndex + 1 < keyParts.length ? ' + ' : null}
                  </React.Fragment>
                ))}
            </div>
            {index + 1 < binding.keys.length ? (
              <div className="jp-Shortcuts-Comma">,</div>
            ) : null}
          </React.Fragment>
        ))}
      </>
    );
  }

  isLocationBeingEdited(location: number): boolean {
    return this.state.displayReplaceInput[location];
  }

  getDivForKey(
    index: number,
    binding: IKeybinding,
    nonEmptyBindings: IKeybinding[]
  ): JSX.Element {
    // Hide "or" after the last keybinding while any binding is being replaced.
    // Otherwise show it between keybindings (forced) and before Add (on hover).
    const showOr = !(
      index === this._nonEmptyBindings.length - 1 &&
      Object.values(this.state.displayReplaceInput).some(Boolean)
    );

    return (
      <React.Fragment key={this.props.shortcut.id + '_' + index}>
        <div
          className="jp-Shortcuts-ShortcutContainer"
          role="button"
          aria-label={this._trans.__(
            'Edit keybinding %1 for %2',
            this.toSymbols(binding.keys.join(', ')),
            this.props.shortcut.label ?? this.props.shortcut.command
          )}
          data-keybinding={index}
          data-shortcut={this.props.shortcut.id}
          tabIndex={this.isLocationBeingEdited(index) ? -1 : 0}
          onClick={() => {
            if (!this.isLocationBeingEdited(index)) {
              this.toggleInputReplaceMethod(index);
            }
          }}
          onKeyDown={event => {
            if (this.isLocationBeingEdited(index)) {
              return;
            }
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              this.toggleInputReplaceMethod(index);
            }
          }}
        >
          {this.isLocationBeingEdited(index)
            ? this.getShortCutAsInput(binding, index)
            : this.getShortCutForDisplayOnly(binding)}
        </div>
        {showOr
          ? this.getOrDisplayIfNeeded(index < this._nonEmptyBindings.length - 1)
          : null}
      </React.Fragment>
    );
  }

  getAddLink(): JSX.Element {
    const label = this._trans.__('Add keybinding');
    return (
      <button
        type="button"
        className="jp-Button jp-mod-styled jp-mod-accept jp-Shortcuts-Plus jp-Shortcuts-Icon"
        onClick={() => {
          this.toggleInputNew();
        }}
        title={label}
        aria-label={label}
      >
        <addIcon.react tag={null} />
      </button>
    );
  }

  getInputBoxWhenToggled(): JSX.Element {
    const commandName =
      this.props.shortcut.label ?? this.props.shortcut.command;
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
        clearConflict={() => this._clearConflictForBinding(null)}
        onCloseAfterSubmit={() => this._scheduleFocusNewKeybinding()}
        onCloseAfterCancel={() => this._scheduleFocusAddButton()}
        toSymbols={this.toSymbols}
        displayInput={this.state.displayNewInput}
        placeholder={''}
        translator={this.props.external.translator}
        ariaLabel={this._trans.__('Add shortcut for %1', commandName)}
      />
    ) : (
      <div />
    );
  }

  getShortCutsCell(nonEmptyBindings: IKeybinding[]): JSX.Element {
    return (
      <td className="jp-Shortcuts-Cell">
        <div
          className={this.getClassNameForShortCuts(nonEmptyBindings)}
          ref={this._shortcutCellRef}
        >
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
      </td>
    );
  }

  getConflicts(): JSX.Element {
    const conflicts = [...this.state.conflicts.values()].filter(
      conflict => conflict.conflictsWith.length !== 0
    );
    if (conflicts.length === 0) {
      return <></>;
    }
    const columnCount = this.props.showSelectors ? 5 : 4;
    return (
      <tr className="jp-Shortcuts-Row jp-Shortcuts-RowWithConflict">
        <td className="jp-Shortcuts-Cell" colSpan={columnCount}>
          <div className="jp-Shortcuts-ConflictContainer">
            {conflicts.map(conflict => {
              const key =
                conflict.keys.join(' ') +
                '_' +
                conflict.conflictsWith.map(target => target.id).join('');
              return (
                <div className="jp-Shortcuts-Conflict" key={key}>
                  <div className="jp-Shortcuts-ErrorMessage">
                    {this._trans.__(
                      'Shortcut already in use by %1.',
                      conflict.conflictsWith
                        .map(target => target.label ?? target.command)
                        .join(', ')
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </td>
      </tr>
    );
  }

  private _clearConflictForBinding(binding: IKeybinding | null): void {
    const conflicts = new Map(this.state.conflicts);
    conflicts.delete(binding);
    this.setState({ conflicts });
  }

  private get _nonEmptyBindings() {
    return this.props.shortcut.keybindings.filter(
      binding => binding.keys.filter(k => k != '').length !== 0
    );
  }

  private _focusShortcutContainer(keybindingIndex: number): void {
    requestAnimationFrame(() => {
      const container = this._shortcutCellRef.current?.querySelector(
        `.jp-Shortcuts-ShortcutContainer[data-keybinding="${keybindingIndex}"]`
      ) as HTMLElement | null;
      container?.focus();
    });
  }

  private _scheduleFocusShortcutContainer(keybindingIndex: number): void {
    this._focusShortcutContainer(keybindingIndex);
  }

  private _scheduleFocusNewKeybinding(): void {
    this._pendingFocusKeybindingIndex = -1;
  }

  private _scheduleFocusAddButton(): void {
    this._pendingFocusAddButton = true;
  }

  private _shortcutCellRef = React.createRef<HTMLDivElement>();
  private _pendingFocusKeybindingIndex: number | null = null;
  private _pendingFocusAddButton = false;

  render(): JSX.Element {
    return (
      <>
        <tr className="jp-Shortcuts-Row" data-shortcut={this.props.shortcut.id}>
          {this.getCategoryCell()}
          {this.getLabelCell()}
          {this.getShortCutsCell(this._nonEmptyBindings)}
          {this.getSourceCell()}
          {this.getOptionalSelectorCell()}
        </tr>
        {this.getConflicts()}
      </>
    );
  }

  private _trans: TranslationBundle;
}
