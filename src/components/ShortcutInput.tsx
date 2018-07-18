import { ShortcutObject } from '../index';

import * as React from 'react';

import { classes } from 'typestyle';

import {
  InputStyle,
  InputUnavailableStyle,
  InputBoxHiddenStyle,
  InputBoxStyle,
  SubmitNonFunctionalStyle,
  SubmitConflictStyle,
  SubmitStyle
} from './ShortcutInputStyle';

export interface IShortcutInputProps {
  handleUpdate: Function;
  toggleInput: Function;
  shortcut: ShortcutObject;
  toSymbols: Function;
  keyBindingsUsed: Object;
  sortConflict: Function;
  clearConflicts: Function;
  displayInput: boolean;
}

export interface IShortcutInputState {
  value: string;
  userInput: string;
  isAvailable: boolean;
  isFunctional: boolean;
  takenBy: ShortcutObject;
}

export class ShortcutInput extends React.Component<
  IShortcutInputProps,
  IShortcutInputState
> {
  state = {
    value: '',
    userInput: '',
    isAvailable: true,
    isFunctional: false,
    takenBy: new ShortcutObject()
  };

  /** Get array of keys from user input */
  keysFromValue = value => {
    const keys: string[] = value.split(',');
    return keys;
  };

  /** Parse user input for chained shortcuts */
  parseChaining = (event: any, value: string, userInput: string): string => {
    event.preventDefault();
    const wordKeys = [
      'Tab',
      'Shift',
      'Ctrl',
      'Control',
      'Alt',
      'Accel',
      'Meta',
      'Enter',
      'ArrowUp',
      'ArrowDown',
      'ArrowRight',
      'ArrowLeft',
      'Escape'
    ];
    if (event.key === 'Backspace') {
      userInput = '';
      value = '';
      this.setState({
        value: value,
        userInput: userInput
      });
    } else if (event.key !== 'CapsLock') {
      const lastKey = userInput
        .substr(userInput.lastIndexOf(' ') + 1, userInput.length)
        .trim();
      if (wordKeys.lastIndexOf(lastKey) === -1 && lastKey != '') {
        userInput = userInput + ',';
        if (event.ctrlKey && event.key != 'Control') {
          userInput = (userInput + ' Ctrl').trim();
        }
        if (event.metaKey && event.key != 'Meta') {
          userInput = (userInput + ' Accel').trim();
        }
        if (event.altKey && event.key != 'Alt') {
          userInput = (userInput + ' Alt').trim();
        }
        if (event.shiftKey && event.key != 'Shift') {
          userInput = (userInput + ' Shift').trim();
        }
        if (wordKeys.lastIndexOf(event.key) === -1) {
          userInput = (userInput + ' ' + event.key.toUpperCase()).trim();
        } else {
          if (event.key === 'Meta') {
            userInput = (userInput + ' Accel').trim();
          } else if (event.key === 'Control') {
            userInput = (userInput + ' Ctrl').trim();
          } else {
            userInput = (userInput + ' ' + event.key).trim();
          }
        }
      } else {
        if (event.key === 'Control') {
          userInput = (userInput + ' Ctrl').trim();
        } else if (event.key === 'Meta') {
          userInput = (userInput + ' Accel').trim();
        } else if (event.key === 'Shift') {
          userInput = (userInput + ' Shift').trim();
        } else if (event.key === 'Alt') {
          userInput = (userInput + ' Alt').trim();
        } else if (wordKeys.lastIndexOf(event.key) === -1) {
          userInput = (userInput + ' ' + event.key.toUpperCase()).trim();
        } else {
          userInput = (userInput + ' ' + event.key).trim();
        }
      }
    }
    return userInput;
  };

  /**
   * Check if shorcut being typed will work
   * (does not end with ctrl, alt, command, or shift)
   * */
  checkNonFunctional = (shortcut: string): boolean => {
    const dontEnd = ['Ctrl', 'Alt', 'Accel', 'Shift'];
    const shortcutKeys = shortcut.split(', ');
    const last = shortcutKeys[shortcutKeys.length - 1];
    this.setState({
      isFunctional: !(dontEnd.includes(last) || shortcut === '')
    });
    return dontEnd.includes(last) || shortcut === '';
  };

  /** Check if shortcut being typed is already taken */
  checkShortcutAvailability = (
    userInput: string,
    keys: string[]
  ): ShortcutObject => {
    let isAvailable =
      !Object.keys(this.props.keyBindingsUsed).includes(
        userInput + '_' + this.props.shortcut.selector
      ) || userInput === '';
    let takenBy = new ShortcutObject();
    if (isAvailable) {
      for (let binding of keys) {
        if (
          Object.keys(this.props.keyBindingsUsed).includes(
            binding + '_' + this.props.shortcut.selector
          ) &&
          userInput !== ''
        ) {
          isAvailable = false;
          takenBy = this.props.keyBindingsUsed[
            binding + '_' + this.props.shortcut.selector
          ];
        }
      }
    } else {
      takenBy = this.props.keyBindingsUsed[
        userInput + '_' + this.props.shortcut.selector
      ];
    }
    this.setState({ isAvailable: isAvailable });
    return takenBy;
  };

  checkConflict(takenBy: ShortcutObject): void {
    if (takenBy.id !== '' && takenBy.id !== this.props.shortcut.id) {
      this.props.sortConflict(this.props.shortcut, takenBy);
    } else {
      this.props.clearConflicts();
    }
  }

  /** Parse and normalize user input */
  handleInput = (event: any): void => {
    const userInput = this.parseChaining(
      event,
      this.state.value,
      this.state.userInput
    );
    const value = this.props.toSymbols(userInput);
    let keys = this.keysFromValue(userInput);
    let takenBy = this.checkShortcutAvailability(userInput, keys);
    this.checkConflict(takenBy);

    this.setState(
      {
        value: value,
        userInput: userInput,
        takenBy: takenBy
      },
      () => this.checkNonFunctional(this.state.userInput)
    );
  };

  handleBlur = event => {
    if (event.relatedTarget === null || event.relatedTarget.id !== 'no-blur') {
      this.props.toggleInput();
      this.setState({
        value: '',
        userInput: ''
      });
      this.props.clearConflicts();
    }
  };

  render() {
    let inputClassName = InputStyle;
    if (!this.state.isAvailable) {
      inputClassName = classes(inputClassName, InputUnavailableStyle);
    }
    return (
      <div
        className={
          this.props.displayInput ? InputBoxStyle : InputBoxHiddenStyle
        }
        onBlur={event => this.handleBlur(event)}
      >
        <input
          className={inputClassName}
          value={this.state.value}
          onKeyDown={this.handleInput}
          ref={input => input && input.focus()}
          placeholder="press keys"
        />
        <button
          className={
            !this.state.isFunctional
              ? classes(SubmitStyle, SubmitNonFunctionalStyle)
              : !this.state.isAvailable
                ? classes(SubmitStyle, SubmitConflictStyle)
                : SubmitStyle
          }
          id={this.state.value !== '' ? 'no-blur' : 'blur'}
          disabled={!this.state.isAvailable || !this.state.isFunctional}
          onClick={() => {
            this.props.handleUpdate(
              this.props.shortcut,
              this.keysFromValue(this.state.userInput)
            );
            this.setState({
              value: ''
            });
            this.props.toggleInput();
          }}
        />
      </div>
    );
  }
}
