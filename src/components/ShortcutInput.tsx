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
} from '../componentStyle/ShortcutInputStyle';

export interface IShortcutInputProps {
  handleUpdate: Function;
  toggleInput: Function;
  shortcut: ShortcutObject;
  toSymbols: Function;
  keyBindingsUsed: { [index: string] : ShortcutObject };
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
  keys: Array<string>;
  currentChain: string;
}

export class ShortcutInput extends React.Component<
  IShortcutInputProps,
  IShortcutInputState
> {
  constructor(props: any) {
    super(props)
  }

  state = {
    value: '',
    userInput: '',
    isAvailable: true,
    isFunctional: false,
    takenBy: new ShortcutObject(),
    keys: new Array<string>(),
    currentChain: ''
  };

  handleUpdate = () => {
    let keys = this.state.keys
    keys.push(this.state.currentChain)
    this.setState(
      {keys: keys}
    )
    this.props.handleUpdate(
      this.props.shortcut,
      this.state.keys
    );
  }

  onKeyPress = (
    event: any
  ): void => {
    event.preventDefault()
  }

  /** Parse user input for chained shortcuts */
  parseChaining = (
    event: any, 
    value: string, 
    userInput: string, 
    keys: Array<string>, 
    currentChain: string
  ): Array<any> => {
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
      if (wordKeys.lastIndexOf(lastKey) === -1 && lastKey != '') {
        userInput = userInput + ',';
        keys.push(currentChain);
        currentChain = '';
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
        if (wordKeys.lastIndexOf(event.key) === -1) {
          userInput = (userInput + ' ' + event.key.toUpperCase()).trim();
          currentChain = (currentChain + ' ' + event.key.toUpperCase()).trim();
        } else {
          if (event.key === 'Meta') {
            userInput = (userInput + ' Accel').trim();
            currentChain = (currentChain + ' Accel').trim();
          } else if (event.key === ' Control') {
            userInput = (userInput + ' Ctrl').trim();
            currentChain = (currentChain + ' Ctrl').trim();
          } else {
            userInput = (userInput + ' ' + event.key).trim();
            currentChain = (currentChain + ' ' + event.key).trim();
          }
        }
      } else {
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
        } else if (wordKeys.lastIndexOf(event.key) === -1) {
          userInput = (userInput + ' ' + event.key.toUpperCase()).trim();
          currentChain = (currentChain + ' ' + event.key.toUpperCase()).trim();
        } else {
          userInput = (userInput + ' ' + event.key).trim();
          currentChain = (currentChain + ' ' + event.key).trim();
        }
      }
    }
    this.setState({
      keys: keys,
      currentChain: currentChain
    })
    return [userInput, keys, currentChain];
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
      isFunctional: !(dontEnd.indexOf(last) !== -1 || shortcut === '')
    });
    return dontEnd.indexOf(last) !== -1 || shortcut === '';
  };

  /** Check if shortcut being typed is already taken */
  checkShortcutAvailability = (
    userInput: string,
    keys: string[],
    currentChain: string
  ): ShortcutObject => {
    let isAvailable =
      (Object.keys(this.props.keyBindingsUsed).indexOf(
        keys.join(' ') + currentChain + '_' + this.props.shortcut.selector
      ) === -1) || userInput === '';
    let takenBy: ShortcutObject = new ShortcutObject();
    if (isAvailable) {
      for (let binding of keys) {
        if (
          Object.keys(this.props.keyBindingsUsed).indexOf(
            binding + '_' + this.props.shortcut.selector
          ) !== -1 &&
          binding !== ''
        ) {
          isAvailable = false;
          takenBy = this.props.keyBindingsUsed[
            binding + '_' + this.props.shortcut.selector
          ];
        }
      }
      if (
        Object.keys(this.props.keyBindingsUsed).indexOf(
          currentChain + '_' + this.props.shortcut.selector
        ) !== -1 &&
        currentChain !== ''
      ) {
        isAvailable = false;
        takenBy = this.props.keyBindingsUsed[
          currentChain + '_' + this.props.shortcut.selector
        ];
      }
    } else {
      takenBy = this.props.keyBindingsUsed[
        keys.join(' ') + currentChain + '_' + this.props.shortcut.selector
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
    const parsed = this.parseChaining(
      event,
      this.state.value,
      this.state.userInput,
      this.state.keys,
      this.state.currentChain
    );
    const userInput = parsed[0]
    const keys = parsed[1]
    const currentChain = parsed[2]

    const value = this.props.toSymbols(userInput);
    let takenBy = this.checkShortcutAvailability(userInput, keys, currentChain);
    this.checkConflict(takenBy);

    this.setState(
      {
        value: value,
        userInput: userInput,
        takenBy: takenBy,
        keys: keys,
        currentChain: currentChain
      },
      () => this.checkNonFunctional(this.state.userInput)
    );
  };

  handleBlur = (event: React.FocusEvent<HTMLDivElement>) => {
    if (event.relatedTarget === null || (event.relatedTarget as HTMLElement).id !== 'no-blur') {
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
        onBlur={(event) => this.handleBlur(event)}
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
            this.handleUpdate();
            this.setState({
              value: '',
              keys: [],
              currentChain: ''
            });
            this.props.toggleInput();
          }}
        />
      </div>
    );
  }
}
