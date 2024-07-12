/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import * as React from 'react';
import { ITranslator } from '@jupyterlab/translation';
import { JSONExt } from '@lumino/coreutils';
import { EN_US } from '@lumino/keyboard';
import { checkIcon, errorIcon } from '@jupyterlab/ui-components';
import {
  IKeybinding,
  IShortcutRegistry,
  IShortcutTarget,
  IShortcutUI
} from '../types';

export interface IConflicts {
  keys: string[];
  conflictsWith: IShortcutTarget[];
  overwrite: () => void;
}

export interface IShortcutInputProps {
  addKeybinding: IShortcutUI['addKeybinding'];
  replaceKeybinding: IShortcutUI['replaceKeybinding'];
  deleteKeybinding: IShortcutUI['deleteKeybinding'];
  findConflictsFor: IShortcutRegistry['findConflictsFor'];
  displayConflicts: (conflicts: IConflicts) => void;
  toggleInput: () => void;
  shortcut: IShortcutTarget;
  /* If keybinding is not given, the input is used for adding a keybinding, otherwise for replacing a keybinding */
  keybinding?: IKeybinding;
  toSymbols: (value: string) => string;
  displayInput: boolean;
  placeholder: string;
  translator: ITranslator;
}

export interface IShortcutInputState {
  value: string;
  userInput: string;
  isAvailable: boolean;
  isFunctional: boolean;
  conflicts: IShortcutTarget[];
  keys: string[];
  currentChain: string;
  selected: boolean;
}

export class ShortcutInput extends React.Component<
  IShortcutInputProps,
  IShortcutInputState
> {
  constructor(props: IShortcutInputProps) {
    super(props);

    this.state = {
      value: this.props.placeholder,
      userInput: '',
      isAvailable: true,
      isFunctional: this._isReplacingExistingKeybinding,
      conflicts: [],
      keys: [],
      currentChain: '',
      selected: true
    };
  }

  /** Whether this input replaces existing keybinding or creates a new one */
  private get _isReplacingExistingKeybinding() {
    return !!this.props.keybinding;
  }

  private _updateConflictDisplay() {
    this.props.displayConflicts({
      conflictsWith: this.state.conflicts,
      keys: this.state.keys,
      overwrite: this.handleOverwrite
    });
  }

  handleSubmit = async () => {
    if (!this._isReplacingExistingKeybinding) {
      await this._updateShortcut();
      this.setState({
        value: '',
        keys: [],
        currentChain: ''
      });
      this.props.toggleInput();
    } else {
      /** don't replace if field has not been edited */
      if (this.state.selected) {
        this.props.toggleInput();
        this.setState({
          value: '',
          userInput: ''
        });
      } else {
        await this._updateShortcut();
      }
    }
    this._updateConflictDisplay();
  };

  private _updateShortcut = async () => {
    const keys = [...this.state.keys, this.state.currentChain];
    this.setState({ keys });
    if (this.props.keybinding) {
      await this.props.replaceKeybinding(
        this.props.shortcut,
        this.props.keybinding,
        keys
      );
    } else {
      await this.props.addKeybinding(this.props.shortcut, keys);
    }
  };

  handleOverwrite = async () => {
    const keys = [...this.state.keys, this.state.currentChain];
    for (const conflict of this.state.conflicts) {
      const conflictingBinding = conflict.keybindings.filter(
        binding =>
          JSONExt.deepEqual(binding.keys, keys) ||
          keys.some(key => JSONExt.deepEqual(binding.keys, [key]))
      )[0];
      if (!conflictingBinding) {
        console.error(
          `Conflicting binding could not be found for ${conflict} using keys ${keys}`
        );
        continue;
      }
      await this.props.deleteKeybinding(conflict, conflictingBinding);
    }
    this.setState({ conflicts: [] });
    await this._updateShortcut();
    this._updateConflictDisplay();
  };

  /** Parse user input for chained shortcuts */
  parseChaining = (
    event: React.KeyboardEvent,
    value: string,
    userInput: string,
    keys: Array<string>,
    currentChain: string
  ): Array<any> => {
    let key = EN_US.keyForKeydownEvent(event.nativeEvent);

    const modKeys = ['Shift', 'Control', 'Alt', 'Meta', 'Ctrl', 'Accel'];

    if (event.key === 'Backspace') {
      userInput = '';
      value = '';
      keys = [];
      currentChain = '';
      this.setState({
        value: value,
        userInput: userInput,
        keys: keys,
        currentChain: currentChain
      });
    } else if (event.key !== 'CapsLock') {
      const lastKey = userInput
        .substr(userInput.lastIndexOf(' ') + 1, userInput.length)
        .trim();

      /** if last key was not a modifier then there is a chain */
      if (modKeys.lastIndexOf(lastKey) === -1 && lastKey != '') {
        userInput = userInput + ',';
        keys.push(currentChain);
        currentChain = '';

        /** check if a modifier key was held down through chain */
        if (event.ctrlKey && event.key != 'Control') {
          userInput = (userInput + ' Ctrl').trim();
          currentChain = (currentChain + ' Ctrl').trim();
        }
        if (event.metaKey && event.key != 'Meta') {
          userInput = (userInput + ' Accel').trim();
          currentChain = (currentChain + ' Accel').trim();
        }
        if (event.altKey && event.key != 'Alt') {
          userInput = (userInput + ' Alt').trim();
          currentChain = (currentChain + ' Alt').trim();
        }
        if (event.shiftKey && event.key != 'Shift') {
          userInput = (userInput + ' Shift').trim();
          currentChain = (currentChain + ' Shift').trim();
        }

        /** if not a modifier key, add to user input and current chain */
        if (modKeys.lastIndexOf(event.key) === -1) {
          userInput = (userInput + ' ' + key).trim();
          currentChain = (currentChain + ' ' + key).trim();

          /** if a modifier key, add to user input and current chain */
        } else {
          if (event.key === 'Meta') {
            userInput = (userInput + ' Accel').trim();
            currentChain = (currentChain + ' Accel').trim();
          } else if (event.key === 'Control') {
            userInput = (userInput + ' Ctrl').trim();
            currentChain = (currentChain + ' Ctrl').trim();
          } else if (event.key === 'Shift') {
            userInput = (userInput + ' Shift').trim();
            currentChain = (currentChain + ' Shift').trim();
          } else if (event.key === 'Alt') {
            userInput = (userInput + ' Alt').trim();
            currentChain = (currentChain + ' Alt').trim();
          } else {
            userInput = (userInput + ' ' + event.key).trim();
            currentChain = (currentChain + ' ' + event.key).trim();
          }
        }

        /** if not a chain, add the key to user input and current chain */
      } else {
        /** if modifier key, rename */
        if (event.key === 'Control') {
          userInput = (userInput + ' Ctrl').trim();
          currentChain = (currentChain + ' Ctrl').trim();
        } else if (event.key === 'Meta') {
          userInput = (userInput + ' Accel').trim();
          currentChain = (currentChain + ' Accel').trim();
        } else if (event.key === 'Shift') {
          userInput = (userInput + ' Shift').trim();
          currentChain = (currentChain + ' Shift').trim();
        } else if (event.key === 'Alt') {
          userInput = (userInput + ' Alt').trim();
          currentChain = (currentChain + ' Alt').trim();

          /** if not a modifier key, add it regularly */
        } else {
          userInput = (userInput + ' ' + key).trim();
          currentChain = (currentChain + ' ' + key).trim();
        }
      }
    }

    /** update state of keys and currentChain */
    this.setState({
      keys: keys,
      currentChain: currentChain
    });
    return [userInput, keys, currentChain];
  };

  /**
   * Check if shortcut being typed will work
   * (does not end with ctrl, alt, command, or shift)
   * */
  checkNonFunctional = (): boolean => {
    const dontEnd = ['Ctrl', 'Alt', 'Accel', 'Shift'];
    const shortcutKeys = this.state.currentChain.split(' ');
    const last = shortcutKeys[shortcutKeys.length - 1];
    this.setState({
      isFunctional: !(dontEnd.indexOf(last) !== -1)
    });

    return dontEnd.indexOf(last) !== -1;
  };

  /** Check if shortcut being typed is already taken */
  checkShortcutAvailability = (
    userInput: string,
    keys: string[],
    currentChain: string
  ): IShortcutTarget[] => {
    const conflicts = this.props.findConflictsFor(
      [...keys, currentChain],
      this.props.shortcut.selector
    );
    const isAvailable = userInput === '' || conflicts.length === 0;

    // Allow to set shortcut to what it initially was if replacing.
    if (!isAvailable) {
      // TODO: should we keep this logic? It masks what may be a genuine
      // conflict in the defaults or between extensions; ideally we would
      // allow saving, but still warn the user.
      if (
        conflicts.length === 1 &&
        conflicts[0].id === this.props.shortcut.id &&
        this._isReplacingExistingKeybinding
      ) {
        this.setState({ isAvailable: true });
        return [];
      }
    }

    this.setState({ isAvailable: isAvailable });
    return conflicts;
  };

  /** Parse and normalize user input */
  handleInput = (event: React.KeyboardEvent): void => {
    event.preventDefault();
    this.setState({ selected: false });
    const parsed = this.parseChaining(
      event,
      this.state.value,
      this.state.userInput,
      this.state.keys,
      this.state.currentChain
    );
    const userInput = parsed[0];
    const keys = parsed[1];
    const currentChain = parsed[2];

    const value = this.props.toSymbols(userInput);
    let conflicts = this.checkShortcutAvailability(
      userInput,
      keys,
      currentChain
    );

    this.setState(
      {
        value: value,
        userInput: userInput,
        conflicts: conflicts,
        keys: keys,
        currentChain: currentChain
      },
      () => {
        this.checkNonFunctional();
        this._updateConflictDisplay();
      }
    );
  };

  handleBlur = (event: React.FocusEvent<HTMLDivElement>) => {
    if (
      event.relatedTarget === null ||
      // TODO: get rid of IDs here
      (event.relatedTarget as HTMLElement).id !== 'no-blur'
    ) {
      this.props.toggleInput();
      this.setState(
        {
          value: '',
          userInput: '',
          conflicts: []
        },
        () => {
          this._updateConflictDisplay();
        }
      );
    }
  };

  render() {
    const trans = this.props.translator.load('jupyterlab');
    let inputClassName = 'jp-Shortcuts-Input';
    if (!this.state.isAvailable) {
      inputClassName += ' jp-mod-unavailable-Input';
    }
    return (
      <div
        className={
          this.props.displayInput
            ? !this._isReplacingExistingKeybinding
              ? 'jp-Shortcuts-InputBox jp-Shortcuts-InputBoxNew'
              : 'jp-Shortcuts-InputBox'
            : 'jp-mod-hidden'
        }
        onBlur={event => this.handleBlur(event)}
      >
        <div
          tabIndex={0}
          id="no-blur"
          className={inputClassName}
          onKeyDown={this.handleInput}
          ref={input => input && input.focus()}
          data-lm-suppress-shortcuts="true"
        >
          <p
            className={
              this.state.selected && this._isReplacingExistingKeybinding
                ? 'jp-Shortcuts-InputText jp-mod-selected-InputText'
                : this.state.value === ''
                ? 'jp-Shortcuts-InputText jp-mod-waiting-InputText'
                : 'jp-Shortcuts-InputText'
            }
          >
            {this.state.value === ''
              ? trans.__('press keys')
              : this.state.value}
          </p>
        </div>
        <button
          className={
            !this.state.isFunctional
              ? 'jp-Shortcuts-Submit jp-mod-defunc-Submit'
              : !this.state.isAvailable
              ? 'jp-Shortcuts-Submit jp-mod-conflict-Submit'
              : 'jp-Shortcuts-Submit'
          }
          id={'no-blur'}
          disabled={!this.state.isAvailable || !this.state.isFunctional}
          onClick={this.handleSubmit}
        >
          {this.state.isAvailable ? <checkIcon.react /> : <errorIcon.react />}
        </button>
      </div>
    );
  }
}
