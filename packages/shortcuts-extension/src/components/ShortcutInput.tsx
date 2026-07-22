/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */
import * as React from 'react';
import type { ITranslator } from '@jupyterlab/translation';
import { CommandRegistry } from '@lumino/commands';
import { JSONExt } from '@lumino/coreutils';
import { EN_US } from '@lumino/keyboard';
import { checkIcon } from '@jupyterlab/ui-components';
import type {
  IKeybinding,
  IShortcutRegistry,
  IShortcutTarget,
  IShortcutUI
} from '../types';

export const CONFLICT_CONTAINER_CLASS = 'jp-Shortcuts-ConflictContainer';

/** Idle time after the last keystroke before leaving active capture. */
const CAPTURE_IDLE_MS = 2000;

type CapturePhase = 'capturing' | 'ready' | 'incompleteIdle';

export interface IConflicts {
  keys: string[];
  conflictsWith: IShortcutTarget[];
  overwrite: () => void;
  cancel: () => void;
}

export interface IShortcutInputProps {
  addKeybinding: IShortcutUI['addKeybinding'];
  replaceKeybinding: IShortcutUI['replaceKeybinding'];
  deleteKeybinding: IShortcutUI['deleteKeybinding'];
  findConflictsFor: IShortcutRegistry['findConflictsFor'];
  displayConflicts: (conflicts: IConflicts) => void;
  clearConflict: () => void;
  toggleInput: () => void;
  onCloseAfterSubmit?: () => void;
  onCloseAfterCancel?: () => void;
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
  keys: string[];
  currentChain: string;
  selected: boolean;
  activeConflicts: IShortcutTarget[];
  phase: CapturePhase;
  /** Bumped to restart the CSS progress animation. */
  timerGeneration: number;
  timerRunning: boolean;
}

export class ShortcutInput extends React.Component<
  IShortcutInputProps,
  IShortcutInputState
> {
  constructor(props: IShortcutInputProps) {
    super(props);
    this._ref = React.createRef();

    this.state = {
      value: this.props.placeholder,
      userInput: '',
      isAvailable: true,
      isFunctional: this._isReplacingExistingKeybinding,
      keys: [],
      currentChain: '',
      selected: true,
      activeConflicts: [],
      phase: 'capturing',
      timerGeneration: 0,
      timerRunning: false
    };
  }

  componentDidMount(): void {
    this._inputRef.current?.focus();
  }

  componentWillUnmount(): void {
    this._clearIdleTimer();
  }

  /** Whether this input replaces existing keybinding or creates a new one */
  private get _isReplacingExistingKeybinding() {
    return !!this.props.keybinding;
  }

  private _emitConflicts(conflicts: IShortcutTarget[]) {
    const keys = [...this.state.keys, this.state.currentChain];
    this.setState({ activeConflicts: conflicts });
    this.props.displayConflicts({
      conflictsWith: conflicts,
      keys,
      overwrite: async () => {
        await this._overwriteConflicts(conflicts, keys);
      },
      cancel: () => {
        // Hide the input
        this.props.toggleInput();
      }
    });
  }

  private _overwriteConflicts = async (
    conflicts: IShortcutTarget[],
    keys: string[]
  ): Promise<void> => {
    this.props.clearConflict();
    this.setState({
      // Since user decided to overwrite, no need to show it as conflicted anymore
      isAvailable: true,
      activeConflicts: []
    });
    await this._handleOverwrite(conflicts, keys);
    this._closeAfterSubmit();
  };

  private _closeAfterSubmit = (): void => {
    this._clearIdleTimer();
    this.props.toggleInput();
    this.props.onCloseAfterSubmit?.();
  };

  private _cancel = (): void => {
    this._clearIdleTimer();
    this.props.toggleInput();
    this.props.onCloseAfterCancel?.();
  };

  private _clearIdleTimer = (): void => {
    if (this._idleTimer !== null) {
      window.clearTimeout(this._idleTimer);
      this._idleTimer = null;
    }
  };

  private _resetIdleTimer = (): void => {
    this._clearIdleTimer();
    const hasKeys =
      this.state.userInput !== '' ||
      this.state.keys.length > 0 ||
      this.state.currentChain !== '';
    if (!hasKeys) {
      this.setState({ timerRunning: false });
      return;
    }
    this.setState(prev => ({
      timerRunning: true,
      timerGeneration: prev.timerGeneration + 1
    }));
    this._idleTimer = window.setTimeout(this._onIdleTimerFire, CAPTURE_IDLE_MS);
  };

  private _onIdleTimerFire = (): void => {
    this._idleTimer = null;
    this.setState({
      phase: this.state.isFunctional ? 'ready' : 'incompleteIdle',
      timerRunning: false
    });
  };

  handleSubmit = async () => {
    if (!this.state.isAvailable && this.state.activeConflicts.length > 0) {
      const keys = [...this.state.keys, this.state.currentChain];
      await this._overwriteConflicts(this.state.activeConflicts, keys);
      return;
    }
    if (!this._isReplacingExistingKeybinding) {
      await this._updateShortcut();
      this._closeAfterSubmit();
    } else {
      /** don't replace if field has not been edited */
      if (this.state.selected) {
        this._closeAfterSubmit();
      } else {
        await this._updateShortcut();
        this._closeAfterSubmit();
      }
    }
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

  private _handleOverwrite = async (
    conflicts: IShortcutTarget[],
    keys: string[]
  ) => {
    const normalizedKeys = keys.map(CommandRegistry.normalizeKeystroke);
    for (const conflict of conflicts) {
      const conflictingBinding = conflict.keybindings.filter(
        binding =>
          JSONExt.deepEqual(binding.keys, normalizedKeys) ||
          normalizedKeys.some(key => JSONExt.deepEqual(binding.keys, [key]))
      )[0];
      if (!conflictingBinding) {
        console.error(
          `Conflicting binding could not be found for ${conflict} using keys ${keys}`
        );
        continue;
      }
      await this.props.deleteKeybinding(conflict, conflictingBinding);
    }
    await this._updateShortcut();
  };

  /** Parse user input for chained shortcuts */
  parseChaining = (
    event: React.KeyboardEvent,
    value: string,
    userInput: string,
    keys: Array<string>,
    currentChain: string
  ): [string, string[], string] => {
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
          userInput = (userInput + ' ' + (key ?? event.key)).trim();
          currentChain = (currentChain + ' ' + (key ?? event.key)).trim();

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
          userInput = (userInput + ' ' + (key ?? event.key)).trim();
          currentChain = (currentChain + ' ' + (key ?? event.key)).trim();
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
   * Whether the current chord can be saved (does not end with a modifier).
   */
  private _isChordFunctional(currentChain: string): boolean {
    const dontEnd = ['Ctrl', 'Alt', 'Accel', 'Shift'];
    const shortcutKeys = currentChain.split(' ');
    const last = shortcutKeys[shortcutKeys.length - 1];
    return !(dontEnd.indexOf(last) !== -1);
  }

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
    if (this.state.phase === 'incompleteIdle' || this.state.phase === 'ready') {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        this._cancel();
        return;
      }
      if (event.key === 'Tab') {
        // Allow normal focus movement; blur will dismiss the input.
        return;
      }
    }

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
    const conflicts = this.checkShortcutAvailability(
      userInput,
      keys,
      currentChain
    );
    const isFunctional = this._isChordFunctional(currentChain);

    this.setState(
      {
        value: value,
        userInput: userInput,
        keys: keys,
        currentChain: currentChain,
        isFunctional,
        phase: 'capturing'
      },
      () => {
        this._emitConflicts(conflicts);
        this._resetIdleTimer();
      }
    );
  };

  render() {
    const trans = this.props.translator.load('jupyterlab');
    const hasConflict =
      !this.state.isAvailable && this.state.activeConflicts.length > 0;
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
        ref={this._ref}
        onBlur={this._handleBlur}
      >
        <div
          tabIndex={0}
          className={inputClassName}
          onKeyDown={this.handleInput}
          ref={this._inputRef}
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
          {this.state.timerRunning ? (
            <div
              key={this.state.timerGeneration}
              className="jp-Shortcuts-CaptureTimer jp-mod-running"
              style={{ animationDuration: `${CAPTURE_IDLE_MS}ms` }}
              aria-hidden="true"
            />
          ) : null}
        </div>
        {hasConflict ? (
          <button
            ref={this._submitRef}
            type="button"
            className={`jp-Button jp-mod-styled jp-mod-warn jp-Shortcuts-Overwrite${
              !this.state.isFunctional ? ' jp-mod-defunc-Submit' : ''
            }`}
            disabled={!this.state.isFunctional}
            onClick={this.handleSubmit}
            title={trans.__('Overwrite')}
            aria-label={trans.__('Overwrite')}
          >
            {trans.__('Overwrite')}
          </button>
        ) : (
          <button
            ref={this._submitRef}
            type="button"
            className={`jp-Button jp-mod-styled jp-Shortcuts-Submit jp-mod-accept jp-Shortcuts-Icon${
              !this.state.isFunctional ? ' jp-mod-defunc-Submit' : ''
            }`}
            disabled={!this.state.isFunctional}
            onClick={this.handleSubmit}
            title={trans.__('Save shortcut')}
            aria-label={trans.__('Save shortcut')}
          >
            <checkIcon.react tag={null} />
          </button>
        )}
      </div>
    );
  }

  private _handleBlur = (event: React.FocusEvent<HTMLDivElement>) => {
    if (this._ref.current?.contains(event.relatedTarget)) {
      // Do not hide when clicking inside the input
      return;
    }
    if (event.relatedTarget?.closest(`.${CONFLICT_CONTAINER_CLASS}`)) {
      // Do not hide input when clicking on conflict container as this would destroy the state
      return;
    }
    this._clearIdleTimer();
    // Hide the input
    this.props.toggleInput();
  };

  private _ref: React.RefObject<HTMLDivElement>;
  private _inputRef = React.createRef<HTMLDivElement>();
  private _submitRef = React.createRef<HTMLButtonElement>();
  private _idleTimer: number | null = null;
}
