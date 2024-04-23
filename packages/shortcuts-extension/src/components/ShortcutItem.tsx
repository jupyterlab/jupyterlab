/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { TranslationBundle } from '@jupyterlab/translation';
import { Platform } from '@lumino/domutils';
import * as React from 'react';
import { IConflicts, ShortcutInput } from './ShortcutInput';
import {
  IKeybinding,
  IShortcutRegistry,
  IShortcutTarget,
  IShortcutUI
} from '../types';

const NAV_KEYS = [
  'ArrowLeft',
  'ArrowUp',
  'ArrowRight',
  'ArrowDown',
  'Home',
  'End',
  'Escape'
];

/** Props for ShortcutItem component */
export interface IShortcutItemProps {
  shortcut: IShortcutTarget;
  addKeybinding: IShortcutUI['addKeybinding'];
  replaceKeybinding: IShortcutUI['replaceKeybinding'];
  resetKeybindings: IShortcutUI['resetKeybindings'];
  deleteKeybinding: IShortcutUI['deleteKeybinding'];
  findConflictsFor: IShortcutRegistry['findConflictsFor'];
  showSelectors: boolean;
  tabIndex: number;
  handleRowKeyDown: (event: React.KeyboardEvent) => void;
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
      displayNewInput: !this.state.displayNewInput
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

  punctuationToText = (value: string): string => {
    const trans = this._trans;
    const keyToText: { [key: string]: string } = {
      ']': trans.__('Closing bracket'),
      '[': trans.__('Opening bracket'),
      ',': trans.__('Comma'),
      '.': trans.__('Full stop'),
      "'": trans.__('Single quote'),
      '-': trans.__('Hyphen-minus')
    };
    return value.split(' ').reduce((result, key) => {
      return (result + ' ' + (keyToText[key] || key)).trim();
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
      <button
        className="jp-Shortcuts-Reset"
        onClick={() => this.props.resetKeybindings(this.props.shortcut)}
        onKeyDown={this.handleKeyDown}
        tabIndex={-1}
      >
        {this._trans.__('Reset')}
      </button>
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
      }
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
      <div
        className="jp-Shortcuts-ShortcutKeysContainer"
        key={index}
        data-keybinding={index}
        data-shortcut={this.props.shortcut.id}
      >
        <button
          className="jp-Shortcuts-ShortcutKeys"
          aria-label={this.punctuationToText(keyboardKey)}
          onKeyDown={this.handleKeyDown}
        >
          {this.toSymbols(keyboardKey)}
        </button>
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
        onClick={() => this.toggleInputReplaceMethod(index)}
      >
        {this.isLocationBeingEdited(index)
          ? this.getShortCutAsInput(binding, index)
          : this.getShortCutForDisplayOnly(binding)}
        {this.getOrDiplayIfNeeded(index < nonEmptyBindings.length - 1)}
      </div>
    );
  }

  getAddLink(): JSX.Element {
    return (
      <button
        className={!this.state.displayNewInput ? 'jp-Shortcuts-Plus' : ''}
        onClick={() => {
          this.toggleInputNew();
        }}
        onKeyDown={this.handleKeyDown}
        tabIndex={-1}
      >
        {this._trans.__('Add')}
      </button>
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
      <div className="jp-Shortcuts-Cell" role="tab">
        <div className={this.getClassNameForShortCuts(nonEmptyBindings)}>
          {nonEmptyBindings.map((key, index) =>
            this.getDivForKey(index, key, nonEmptyBindings)
          )}
          {nonEmptyBindings.length >= 1 &&
            !this.state.displayNewInput &&
            !this.state.displayReplaceInput[0] &&
            this.getAddLink()}
          {nonEmptyBindings.length === 0 &&
            !this.state.displayNewInput &&
            this.getAddLink()}
          {this.getInputBoxWhenToggled()}
        </div>
      </div>
    );
  }

  // handle key down function to navigate within each row
  handleKeyDown(event: React.KeyboardEvent): void {
    // Handle the arrow keys to navigate through rows.
    if (NAV_KEYS.includes(event.key)) {
      const focusedElement = document.activeElement;
      const evTarget = event.target as HTMLElement;

      const parentRow = focusedElement?.closest('.jp-Shortcuts-Row');
      const rowBelow = parentRow?.nextElementSibling;
      const rowAbove = parentRow?.previousElementSibling;
      const elements = parentRow!.querySelectorAll('button');
      const focusable: Element[] = [...elements];

      // Get the current focused element.
      let focusedIndex = focusable.indexOf(document.activeElement as Element);

      if (event.key === 'Tab') {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      // Find the next element to focus on.
      let nextFocused: Element | null | undefined;
      let rowBelowFocused: Element | null | undefined;
      let rowAboveFocused: Element | null | undefined;
      if (event.key === 'ArrowRight') {
        nextFocused = focusable[focusedIndex + 1] ?? focusable[0];
      } else if (event.key === 'ArrowLeft') {
        nextFocused =
          focusable[focusedIndex - 1] ?? focusable[focusable.length - 1];
      } else if (event.key === 'Home') {
        nextFocused = focusable[0];
      } else if (event.key === 'End') {
        nextFocused = focusable[focusable.length - 1];
      } else if (event.key === 'Escape') {
        focusedElement?.setAttribute('tabindex', '-1');
        const parentRow = focusedElement?.closest('.jp-Shortcuts-Row');
        (parentRow as HTMLDivElement).focus();
      } else if (
        event.key === 'ArrowDown' &&
        evTarget.className !== 'jp-Shortcuts-Reset'
      ) {
        if (rowBelow !== null) {
          const rowBelowShortcuts = rowBelow!.querySelectorAll('button');
          const rowBelowFocusable: Element[] = [...rowBelowShortcuts];
          rowBelowFocused = rowBelowFocusable[0];
          focusedElement?.setAttribute('tabindex', '-1');
          rowBelowFocused?.setAttribute('tabindex', '0');
          (rowBelowFocused as HTMLButtonElement).focus();
        }
      } else if (
        event.key === 'ArrowUp' &&
        evTarget.className !== 'jp-Shortcuts-Reset'
      ) {
        if (rowAbove !== null) {
          const rowAboveShortcuts = rowAbove!.querySelectorAll('button');
          const rowAboveFocusable: Element[] = [...rowAboveShortcuts];
          rowAboveFocused = rowAboveFocusable[0];
          focusedElement?.setAttribute('tabindex', '-1');
          rowAboveFocused?.setAttribute('tabindex', '0');
          (rowAboveFocused as HTMLButtonElement).focus();
        }
      } else if (
        event.key === 'ArrowDown' &&
        evTarget.className === 'jp-Shortcuts-Reset'
      ) {
        if (rowBelow !== null) {
          const rowBelowShortcuts = rowBelow!.querySelectorAll('button');
          const rowBelowFocusable: Element[] = [...rowBelowShortcuts];
          rowBelowFocused = rowBelowFocusable[rowBelowFocusable.length - 1];
          focusedElement?.setAttribute('tabindex', '-1');
          rowBelowFocused?.setAttribute('tabindex', '0');
          if (rowBelowFocused.className === 'jp-Shortcuts-Reset') {
            (rowBelowFocused as HTMLButtonElement).focus();
          }
        }
      } else if (
        event.key === 'ArrowUp' &&
        evTarget.className === 'jp-Shortcuts-Reset'
      ) {
        if (rowAbove !== null) {
          const rowAboveShortcuts = rowAbove!.querySelectorAll('button');
          const rowAboveFocusable: Element[] = [...rowAboveShortcuts];
          rowAboveFocused = rowAboveFocusable[rowAboveFocusable.length - 1];
          focusedElement?.setAttribute('tabindex', '-1');
          rowAboveFocused?.setAttribute('tabindex', '0');
          if (rowAboveFocused.className === 'jp-Shortcuts-Reset') {
            (rowAboveFocused as HTMLButtonElement).focus();
          }
        }
      }
      // Change the focused element and the tabindex value.
      if (nextFocused) {
        focusable[focusedIndex]?.setAttribute('tabindex', '-1');
        nextFocused?.setAttribute('tabindex', '0');
        (nextFocused as HTMLButtonElement).focus();
      }
    }
  }

  getConflicts(): JSX.Element {
    const conflicts = [...this.state.conflicts.values()].filter(
      conflict => conflict.conflictsWith.length !== 0
    );
    if (conflicts.length === 0) {
      return <></>;
    }
    return (
      <div className="jp-Shortcuts-Row">
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
                    'Shortcut already in use by %1. Overwrite it?',
                    conflict.conflictsWith
                      .map(target => target.label ?? target.command)
                      .join(', ')
                  )}
                </div>
                <div className="jp-Shortcuts-ErrorButton">
                  <button>{this._trans.__('Cancel')}</button>
                  <button
                    id="no-blur"
                    onClick={() => {
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

  private get _nonEmptyBindings() {
    return this.props.shortcut.keybindings.filter(
      binding => binding.keys.filter(k => k != '').length !== 0
    );
  }

  render(): JSX.Element {
    return (
      <>
        <div
          title={this.props.shortcut.label}
          role="tab"
          className="jp-Shortcuts-Row"
          tabIndex={this.props.tabIndex}
          onKeyDown={event => {
            this.props.handleRowKeyDown(event);
          }}
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
