/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */
import * as React from 'react';
import type { ITranslator, TranslationBundle } from '@jupyterlab/translation';
import { CommandRegistry } from '@lumino/commands';
import { JSONExt } from '@lumino/coreutils';
import { Platform } from '@lumino/domutils';
import { EN_US } from '@lumino/keyboard';
import { checkIcon } from '@jupyterlab/ui-components';
import type {
  IKeybinding,
  IShortcutRegistry,
  IShortcutTarget,
  IShortcutUI
} from '../types';

/** Idle time after the last keystroke before leaving active capture. */
const CAPTURE_IDLE_MS = 2000;

type CapturePhase = 'capturing' | 'ready' | 'incompleteIdle';

export interface ICaptureError {
  keys: string[];
  /** Empty when the error is not a binding clash. */
  conflictsWith: IShortcutTarget[];
  /** Human-readable message; empty string clears the error UI. */
  message: string;
  kind: 'none' | 'conflict' | 'incomplete';
}

export interface IShortcutInputProps {
  addKeybinding: IShortcutUI['addKeybinding'];
  replaceKeybinding: IShortcutUI['replaceKeybinding'];
  deleteKeybinding: IShortcutUI['deleteKeybinding'];
  findConflictsFor: IShortcutRegistry['findConflictsFor'];
  displayCaptureError: (error: ICaptureError) => void;
  clearCaptureError: () => void;
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
  /**
   * When true, do not persist on Submit and keep the capture open for a parent
   * dialog to commit later. Hides the Submit control and reports keys via
   * {@link onKeysChange}.
   */
  deferPersist?: boolean;
  /**
   * Called when the captured key sequence changes (deferred mode and after edits).
   * Keys omit empty segments; may be incomplete while modifiers are held.
   */
  onKeysChange?: (keys: string[]) => void;
  /**
   * Id of a visible label element. When set, used as `aria-labelledby`
   * (preferred over {@link ariaLabel}). Needed because the capture control is
   * a `div`, which is not associated via a label's `htmlFor`.
   */
  labelledBy?: string;
  /**
   * Accessible name when {@link labelledBy} is not set.
   */
  ariaLabel?: string;
  /**
   * Id for the capture textbox. Generated when omitted.
   */
  id?: string;
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
  /** One-shot start announcement for the polite live region. */
  announceCaptureStart: boolean;
  /** Whether the capture textbox itself has focus. */
  inputFocused: boolean;
}

export class ShortcutInput extends React.Component<
  IShortcutInputProps,
  IShortcutInputState
> {
  constructor(props: IShortcutInputProps) {
    super(props);
    this._ref = React.createRef();
    const idSuffix = ShortcutInput._nextHintId++;
    this._inputId = props.id ?? `jp-Shortcuts-CaptureInput-${idSuffix}`;
    this._hintId = `jp-Shortcuts-CaptureHint-${idSuffix}`;
    this._errorId = `${this._hintId}-error`;

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
      timerRunning: false,
      announceCaptureStart: false,
      // Inline edit focuses immediately; the add dialog focuses the command list first.
      inputFocused: !props.deferPersist
    };
  }

  componentDidMount(): void {
    // In dialog mode the parent owns initial focus (e.g. command select).
    if (!this._deferPersist) {
      this._inputRef.current?.focus();
      // Defer so aria-live announces; initial mount content is often skipped.
      this._announceStartRaf = requestAnimationFrame(() => {
        this._announceStartRaf = null;
        this.setState({ announceCaptureStart: true });
      });
    }
  }

  componentWillUnmount(): void {
    this._clearIdleTimer();
    if (this._announceStartRaf !== null) {
      cancelAnimationFrame(this._announceStartRaf);
      this._announceStartRaf = null;
    }
    if (this._blurRaf !== null) {
      cancelAnimationFrame(this._blurRaf);
      this._blurRaf = null;
    }
  }

  /** Whether this input replaces existing keybinding or creates a new one */
  private get _isReplacingExistingKeybinding() {
    return !!this.props.keybinding;
  }

  private _buildCaptureError(
    conflicts: IShortcutTarget[],
    phase: CapturePhase = this.state.phase,
    keys: string[] = this._capturedKeys()
  ): ICaptureError {
    const trans = this.props.translator.load('jupyterlab');
    if (conflicts.length > 0) {
      return {
        keys,
        conflictsWith: conflicts,
        kind: 'conflict',
        message: trans.__(
          'Shortcut already in use by %1.',
          conflicts.map(target => target.label ?? target.command).join(', ')
        )
      };
    }
    if (phase === 'incompleteIdle') {
      return {
        keys,
        conflictsWith: [],
        kind: 'incomplete',
        message: trans.__('Incomplete shortcut. Continue typing.')
      };
    }
    return {
      keys,
      conflictsWith: [],
      kind: 'none',
      message: ''
    };
  }

  private _emitCaptureError(
    conflicts: IShortcutTarget[],
    phase: CapturePhase = this.state.phase,
    keys?: string[]
  ): void {
    this.setState({ activeConflicts: conflicts });
    this.props.displayCaptureError(
      this._buildCaptureError(conflicts, phase, keys)
    );
  }

  private get _deferPersist(): boolean {
    return !!this.props.deferPersist;
  }

  private _capturedKeys(
    keys: string[] = this.state.keys,
    currentChain: string = this.state.currentChain
  ): string[] {
    return [...keys, currentChain].filter(key => key !== '');
  }

  private _emitKeysChange(
    keys: string[] = this.state.keys,
    currentChain: string = this.state.currentChain
  ): void {
    this.props.onKeysChange?.(this._capturedKeys(keys, currentChain));
  }

  private _overwriteConflicts = async (
    conflicts: IShortcutTarget[],
    keys: string[]
  ): Promise<void> => {
    this.props.clearCaptureError();
    this.setState({
      // Since user decided to overwrite, no need to show it as conflicted anymore
      isAvailable: true,
      activeConflicts: []
    });
    if (this._deferPersist) {
      // Defer deleting conflicting bindings until the parent dialog saves.
      this._emitKeysChange(keys, '');
      return;
    }
    await this._handleOverwrite(conflicts, keys);
    this._closeAfterSubmit();
  };

  private _closeAfterSubmit = (): void => {
    this._clearIdleTimer();
    this.props.toggleInput();
    this.props.onCloseAfterSubmit?.();
  };

  private _resetCapture = (): void => {
    this._clearIdleTimer();
    this.setState(
      {
        value: '',
        userInput: '',
        keys: [],
        currentChain: '',
        selected: true,
        isAvailable: true,
        isFunctional: false,
        activeConflicts: [],
        phase: 'capturing',
        timerRunning: false,
        announceCaptureStart: true
      },
      () => {
        this.props.clearCaptureError();
        this._emitKeysChange([], '');
      }
    );
  };

  private _cancel = (): void => {
    if (this._deferPersist) {
      this._resetCapture();
      this.props.onCloseAfterCancel?.();
      return;
    }
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
    this.setState(
      prev => ({
        phase: prev.isFunctional ? 'ready' : 'incompleteIdle',
        timerRunning: false
      }),
      () => {
        this._emitCaptureError(this.state.activeConflicts, this.state.phase);
      }
    );
  };

  handleSubmit = async () => {
    if (this._deferPersist) {
      // Persistence is owned by the parent dialog Save action.
      this._emitKeysChange();
      return;
    }
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
      this.setState(
        {
          value: value,
          userInput: userInput,
          keys: keys,
          currentChain: currentChain
        },
        () => this._emitKeysChange([], '')
      );
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
          // Shift keydown may have been skipped after idle (for Shift+Tab).
          if (
            event.shiftKey &&
            !currentChain.split(' ').filter(Boolean).includes('Shift')
          ) {
            userInput = (userInput + ' Shift').trim();
            currentChain = (currentChain + ' Shift').trim();
          }
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
      // Allow normal focus movement (Tab | Shift + Tab)
      if (event.key === 'Tab' || event.key === 'Shift') {
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
        phase: 'capturing',
        announceCaptureStart: false
      },
      () => {
        this._emitCaptureError(
          conflicts,
          'capturing',
          this._capturedKeys(keys, currentChain)
        );
        this._emitKeysChange(keys, currentChain);
        this._resetIdleTimer();
      }
    );
  };

  /**
   * Speak a single key token in words (not glyphs) for the live region.
   */
  private _spokenKey(token: string, trans: TranslationBundle): string {
    switch (token) {
      case 'Ctrl':
        return trans.__('Control');
      case 'Accel':
        return Platform.IS_MAC ? trans.__('Command') : trans.__('Control');
      case 'Alt':
        return Platform.IS_MAC ? trans.__('Option') : trans.__('Alt');
      case 'Shift':
        return trans.__('Shift');
      default:
        return token;
    }
  }

  /**
   * Speak the current captured sequence in words, e.g. "Control Shift E".
   */
  private _spokenShortcut(trans: TranslationBundle): string {
    if (!this.state.userInput.trim()) {
      return '';
    }
    return this.state.userInput
      .split(',')
      .map(chord =>
        chord
          .trim()
          .split(/\s+/)
          .filter(Boolean)
          .map(token => this._spokenKey(token, trans))
          .join(' ')
      )
      .filter(Boolean)
      .join(', ');
  }

  private _statusMessage(trans: TranslationBundle): string {
    const spoken = this._spokenShortcut(trans);

    if (this.state.phase === 'ready') {
      return spoken
        ? trans.__('Shortcut ready: %1.', spoken)
        : trans.__('Shortcut ready.');
    }

    // Incomplete is announced via the error channel, not the status region.
    if (this.state.phase === 'incompleteIdle') {
      return '';
    }

    if (this.state.isFunctional && spoken) {
      return spoken;
    }

    // Only claim capturing while the textbox is focused (add dialog starts
    // focused on the command list).
    if (
      this.state.inputFocused &&
      (this.state.announceCaptureStart ||
        this.state.userInput !== '' ||
        this.state.keys.length > 0)
    ) {
      return trans.__('Capturing shortcut keys.');
    }

    return '';
  }

  private _errorMessage(trans: TranslationBundle): string {
    return this._buildCaptureError(
      !this.state.isAvailable ? this.state.activeConflicts : [],
      this.state.phase
    ).message;
  }

  render() {
    const trans = this.props.translator.load('jupyterlab');
    const hasConflict =
      !this.state.isAvailable && this.state.activeConflicts.length > 0;
    const hasCapture =
      this.state.userInput !== '' ||
      this.state.keys.length > 0 ||
      this.state.phase === 'incompleteIdle';
    const isInvalid = hasConflict || (hasCapture && !this.state.isFunctional);
    let inputClassName = 'jp-Shortcuts-Input';
    if (!this.state.isAvailable) {
      inputClassName += ' jp-mod-unavailable-Input';
    }
    const statusMessage = this._statusMessage(trans);
    const errorMessage = this._errorMessage(trans);
    const describedBy = errorMessage
      ? `${this._hintId} ${this._errorId}`
      : this._hintId;
    const activelyRecording =
      this.state.phase === 'capturing' && this.state.inputFocused;
    const captureHint = activelyRecording
      ? trans.__('Recording…')
      : this.state.phase === 'capturing'
        ? trans.__('Focus this field to record a shortcut.')
        : trans.__(
            'Recording paused. Press Tab or Shift+Tab to navigate normally.'
          );
    const commandName =
      this.props.shortcut.label ?? this.props.shortcut.command;
    const defaultAriaLabel = this._isReplacingExistingKeybinding
      ? trans.__('Shortcut for %1', commandName)
      : trans.__('New shortcut for %1', commandName);
    const labelledBy = this.props.labelledBy;
    const ariaLabel = labelledBy
      ? undefined
      : (this.props.ariaLabel ?? defaultAriaLabel);
    const boxClass = [
      'jp-Shortcuts-InputBox',
      !this._isReplacingExistingKeybinding ? 'jp-Shortcuts-InputBoxNew' : '',
      isInvalid ? 'jp-mod-error' : '',
      this.props.displayInput ? '' : 'jp-mod-hidden'
    ]
      .filter(Boolean)
      .join(' ');
    return (
      <div className={boxClass} ref={this._ref} onBlur={this._handleBlur}>
        <div className="jp-Shortcuts-InputBox-controls">
          <div
            id={this._inputId}
            role="textbox"
            aria-readonly="true"
            tabIndex={0}
            className={inputClassName}
            onKeyDown={this.handleInput}
            onFocus={this._handleInputFocus}
            onBlur={this._handleInputBlur}
            ref={this._inputRef}
            data-lm-suppress-shortcuts="true"
            aria-invalid={isInvalid || undefined}
            aria-describedby={describedBy}
            aria-labelledby={labelledBy}
            aria-label={ariaLabel}
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
          <div
            className="jp-sr-only"
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            {statusMessage}
          </div>
          <div
            id={this._errorId}
            className="jp-sr-only"
            role="alert"
            aria-live="assertive"
            aria-atomic="true"
          >
            {errorMessage}
          </div>
          {!this._deferPersist &&
            (hasConflict ? (
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
            ))}
        </div>
        <p id={this._hintId} className="jp-Shortcuts-CaptureHint">
          {captureHint}
        </p>
      </div>
    );
  }

  private _handleInputFocus = (): void => {
    this.setState({ inputFocused: true });
    if (this._deferPersist && !this.state.announceCaptureStart) {
      if (this._announceStartRaf !== null) {
        cancelAnimationFrame(this._announceStartRaf);
      }
      this._announceStartRaf = requestAnimationFrame(() => {
        this._announceStartRaf = null;
        this.setState({ announceCaptureStart: true });
      });
    }
  };

  private _handleInputBlur = (): void => {
    this.setState({ inputFocused: false });
  };

  private _handleBlur = (): void => {
    if (this._deferPersist) {
      // Keep capture mounted while the parent dialog owns focus movement.
      return;
    }
    if (this._blurRaf !== null) {
      cancelAnimationFrame(this._blurRaf);
    }
    // Defer until focus settles (Edge may emit a spurious focusout with relatedTarget null).
    this._blurRaf = requestAnimationFrame(() => {
      this._blurRaf = null;
      const root = this._ref.current;
      const active = document.activeElement;

      if (root?.contains(active)) {
        return;
      }

      this._clearIdleTimer();
      this.props.toggleInput();
    });
  };

  private _ref: React.RefObject<HTMLDivElement>;
  private _inputRef = React.createRef<HTMLDivElement>();
  private _submitRef = React.createRef<HTMLButtonElement>();
  private _inputId: string;
  private _hintId: string;
  private _errorId: string;
  private _idleTimer: number | null = null;
  private _announceStartRaf: number | null = null;
  private _blurRaf: number | null = null;
  private static _nextHintId = 0;
}
