/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import * as React from 'react';

import { ITranslator } from '@jupyterlab/translation';

import { EN_US } from '@lumino/keyboard';
import { checkIcon, errorIcon } from '@jupyterlab/ui-components';

export interface IShortcutInputProps {
  handleUpdate: Function;
  deleteShortcut: Function;
  toggleInput: Function;
  shortcut: ShortcutObject;
  shortcutId: string;
  toSymbols: Function;
  keyBindingsUsed: { [index: string]: TakenByObject };
  sortConflict: Function;
  clearConflicts: Function;
  displayInput: boolean;
  newOrReplace: string;
  placeholder: string;
  translator: ITranslator;
}

export interface IShortcutInputState {
  value: string;
  userInput: string;
  isAvailable: boolean;
  isFunctional: boolean;
  takenByObject: TakenByObject;
  keys: Array<string>;
  currentChain: string;
  selected: boolean;
}

/** Object for shortcut items */
export class ShortcutObject {
  commandName: string;
  label: string;
  keys: { [index: string]: Array<string> };
  source: string;
  selector: string;
  category: string;
  id: string;
  hasConflict: boolean;
  numberOfShortcuts: number;

  constructor() {
    this.commandName = '';
    this.label = '';
    this.keys = {};
    this.source = '';
    this.selector = '';
    this.category = '';
    this.id = '';
    this.numberOfShortcuts = 0;
    this.hasConflict = false;
  }

  get(sortCriteria: string): string {
    if (sortCriteria === 'label') {
      return this.label;
    } else if (sortCriteria === 'selector') {
      return this.selector;
    } else if (sortCriteria === 'category') {
      return this.category;
    } else if (sortCriteria === 'source') {
      return this.source;
    } else {
      return '';
    }
  }
}
/** Object for conflicting shortcut error messages */
export class ErrorObject extends ShortcutObject {
  takenBy: TakenByObject;

  constructor() {
    super();
    this.takenBy = new TakenByObject();
  }
}

/** Object for showing which shortcut conflicts with the new one */
export class TakenByObject {
  takenBy: ShortcutObject;
  takenByKey: string;
  takenByLabel: string;
  id: string;

  constructor(shortcut?: ShortcutObject) {
    if (shortcut) {
      this.takenBy = shortcut;
      this.takenByKey = '';
      this.takenByLabel = shortcut.category + ': ' + shortcut.label;
      this.id = shortcut.commandName + '_' + shortcut.selector;
    } else {
      this.takenBy = new ShortcutObject();
      this.takenByKey = '';
      this.takenByLabel = '';
      this.id = '';
    }
  }
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
      isFunctional: this.props.newOrReplace === 'replace',
      takenByObject: new TakenByObject(),
      keys: new Array<string>(),
      currentChain: '',
      selected: true
    };
  }

  handleUpdate = () => {
    let keys = this.state.keys;
    keys.push(this.state.currentChain);
    this.setState({ keys: keys });
    this.props.handleUpdate(this.props.shortcut, this.state.keys);
  };

  handleOverwrite = async () => {
    this.props
      .deleteShortcut(
        this.state.takenByObject.takenBy,
        this.state.takenByObject.takenByKey
      )
      .then(this.handleUpdate());
  };

  handleReplace = async () => {
    let keys = this.state.keys;
    keys.push(this.state.currentChain);
    this.props.toggleInput();
    await this.props.deleteShortcut(this.props.shortcut, this.props.shortcutId);
    this.props.handleUpdate(this.props.shortcut, keys);
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

      /** if last key was not a modefier then there is a chain */
      if (modKeys.lastIndexOf(lastKey) === -1 && lastKey != '') {
        userInput = userInput + ',';
        keys.push(currentChain);
        currentChain = '';

        /** check if a modefier key was held down through chain */
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

        /** if not a modefier key, add to user input and current chain */
        if (modKeys.lastIndexOf(event.key) === -1) {
          userInput = (userInput + ' ' + key).trim();
          currentChain = (currentChain + ' ' + key).trim();

          /** if a modefier key, add to user input and current chain */
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
        /** if modefier key, rename */
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

          /** if not a modefier key, add it regularly */
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
   * Check if shorcut being typed will work
   * (does not end with ctrl, alt, command, or shift)
   * */
  checkNonFunctional = (shortcut: string): boolean => {
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
  ): TakenByObject => {
    /** First, check whole shortcut */
    let isAvailable =
      Object.keys(this.props.keyBindingsUsed).indexOf(
        keys.join(' ') + currentChain + '_' + this.props.shortcut.selector
      ) === -1 || userInput === '';
    let takenByObject: TakenByObject = new TakenByObject();
    if (isAvailable) {
      /** Next, check each piece of a chain */
      for (let binding of keys) {
        if (
          Object.keys(this.props.keyBindingsUsed).indexOf(
            binding + '_' + this.props.shortcut.selector
          ) !== -1 &&
          binding !== ''
        ) {
          isAvailable = false;
          takenByObject =
            this.props.keyBindingsUsed[
              binding + '_' + this.props.shortcut.selector
            ];
          break;
        }
      }

      /** Check current chain */
      if (
        isAvailable &&
        Object.keys(this.props.keyBindingsUsed).indexOf(
          currentChain + '_' + this.props.shortcut.selector
        ) !== -1 &&
        currentChain !== ''
      ) {
        isAvailable = false;
        takenByObject =
          this.props.keyBindingsUsed[
            currentChain + '_' + this.props.shortcut.selector
          ];
      }

      /** If unavailable set takenByObject */
    } else {
      takenByObject =
        this.props.keyBindingsUsed[
          keys.join(' ') + currentChain + '_' + this.props.shortcut.selector
        ];
    }

    /** allow to set shortcut to what it initially was if replacing */
    if (!isAvailable) {
      if (
        takenByObject.takenBy.id === this.props.shortcut.id &&
        this.props.newOrReplace === 'replace'
      ) {
        isAvailable = true;
        takenByObject = new TakenByObject();
      }
    }

    this.setState({ isAvailable: isAvailable });
    return takenByObject;
  };

  checkConflict(takenByObject: TakenByObject, keys: string): void {
    if (
      takenByObject.id !== '' &&
      takenByObject.takenBy.id !== this.props.shortcut.id
    ) {
      this.props.sortConflict(
        this.props.shortcut,
        takenByObject,
        takenByObject.takenByLabel,
        ''
      );
    } else {
      this.props.clearConflicts();
    }
  }

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
    let takenByObject = this.checkShortcutAvailability(
      userInput,
      keys,
      currentChain
    );
    this.checkConflict(takenByObject, keys);

    this.setState(
      {
        value: value,
        userInput: userInput,
        takenByObject: takenByObject,
        keys: keys,
        currentChain: currentChain
      },
      () => this.checkNonFunctional(this.state.userInput)
    );
  };

  handleBlur = (event: React.FocusEvent<HTMLDivElement>) => {
    if (
      event.relatedTarget === null ||
      ((event.relatedTarget as HTMLElement).id !== 'no-blur' &&
        (event.relatedTarget as HTMLElement).id !== 'overwrite')
    ) {
      this.props.toggleInput();
      this.setState({
        value: '',
        userInput: ''
      });
      this.props.clearConflicts();
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
            ? this.props.newOrReplace === 'new'
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
        >
          <p
            className={
              this.state.selected && this.props.newOrReplace === 'replace'
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
          onClick={() => {
            if (this.props.newOrReplace === 'new') {
              this.handleUpdate();
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
                this.props.clearConflicts();
              } else {
                void this.handleReplace();
              }
            }
          }}
        >
          {this.state.isAvailable ? <checkIcon.react /> : <errorIcon.react />}
        </button>
        {!this.state.isAvailable && (
          <button
            hidden
            id="overwrite"
            onClick={() => {
              void this.handleOverwrite();
              this.props.clearConflicts();
              this.props.toggleInput();
            }}
          >
            {trans.__('Overwrite')}
          </button>
        )}
      </div>
    );
  }
}
