/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { Dialog } from '@jupyterlab/apputils';
import type { CodeEditor } from '@jupyterlab/codeeditor';
import type { ITranslator, TranslationBundle } from '@jupyterlab/translation';
import type { JSONObject } from '@lumino/coreutils';
import { Widget } from '@lumino/widgets';
import * as React from 'react';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';

import { ShortcutRegistry } from '../registry';
import type {
  ICustomOptions,
  ISearchResult,
  IShortcutRegistry,
  IShortcutTarget,
  IShortcutUI
} from '../types';
import {
  appendCustomOptionFields,
  type ICustomOptionsFields
} from './ShortcutCustomOptions';
import type { ICaptureError } from './ShortcutInput';
import { ShortcutInput } from './ShortcutInput';
import { toSymbols } from '../keystrokeDisplay';

const MODIFIER_KEYS = new Set(['Ctrl', 'Alt', 'Accel', 'Shift']);

/**
 * Dialog for creating a new keyboard shortcut.
 */
export class NewShortcutDialog extends Dialog<NewShortcutDialog.IValue> {
  constructor(options: NewShortcutDialog.IOptions) {
    const { translator, editorFactory, commandRegistry, findConflictsFor } =
      options;
    const trans = translator.load('jupyterlab');

    // Defer until after super(): body construction may invoke checkValidation.
    let checkValidation = (): void => undefined;
    const body = new NewShortcutDialogBody({
      translator,
      editorFactory,
      commandRegistry,
      findConflictsFor,
      checkValidation: () => checkValidation()
    });

    super({
      title: trans.__('Add Shortcut'),
      body,
      buttons: [
        Dialog.cancelButton({ label: trans.__('Cancel') }),
        Dialog.okButton({ label: trans.__('Save') })
      ],
      focusNodeSelector: '#jp-Shortcuts-AddDialog-command'
    });

    this._formBody = body;
    this._trans = trans;
    checkValidation = () => this._checkValidation();
    this._checkValidation();
  }

  /**
   * Disable accept for missing command, incomplete keys, or invalid JSON.
   * Key conflicts stay allowed so the footer can show Overwrite.
   */
  protected _checkValidation(): void {
    const hasErrors =
      !this._formBody.hasCommand() ||
      !this._formBody.hasKeysReady() ||
      !!this.node.querySelector('.jp-JSONEditor.jp-mod-error');

    // Dialog keeps _hasValidationErrors private; mirror its accept-button logic.
    const dialog = this as unknown as {
      _hasValidationErrors: boolean;
      _buttons: ReadonlyArray<{ accept: boolean }>;
      _buttonNodes: ReadonlyArray<HTMLButtonElement>;
    };
    dialog._hasValidationErrors = hasErrors;
    for (let i = 0; i < dialog._buttons.length; i++) {
      if (dialog._buttons[i].accept) {
        dialog._buttonNodes[i].disabled = hasErrors;
      }
    }
    this._syncAcceptButton();
  }

  private _syncAcceptButton(): void {
    const accept = this.node.querySelector(
      '.jp-Dialog-footer button.jp-mod-accept'
    );
    if (!(accept instanceof HTMLButtonElement)) {
      return;
    }
    const overwrite = this._formBody.hasConflicts();
    const label = overwrite
      ? this._trans.__('Overwrite')
      : this._trans.__('Save');
    const labelNode = accept.querySelector('.jp-Dialog-buttonLabel');
    if (labelNode) {
      labelNode.textContent = label;
      labelNode.setAttribute('aria-label', label);
    } else {
      accept.textContent = label;
    }
    accept.classList.toggle('jp-mod-warn', overwrite);
  }

  private _formBody: NewShortcutDialogBody;
  private _trans: TranslationBundle;

  /**
   * Prevent Enter in the command select, JSON editor, or keystroke capture
   * from submitting the dialog.
   *
   * The dialog listens in the capture phase. For the capture field we must not
   * stopPropagation, or Enter never reaches ShortcutInput (so it cannot start
   * recording or be recorded). Skip super() so Accept is not triggered.
   */
  protected _evtKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      const activeElement = document.activeElement;
      if (!(activeElement instanceof HTMLElement)) {
        super._evtKeydown(event);
        return;
      }
      // Allow command list to open with Enter (and Space)
      if (activeElement instanceof HTMLSelectElement) {
        event.preventDefault();
        event.stopPropagation();
        activeElement.showPicker?.();
        return;
      }
      const jsonEditorNode = this.node.querySelector('.jp-JSONEditor');
      const captureHost = this.node.querySelector(
        '.jp-Shortcuts-AddDialog-capture'
      );
      if (
        jsonEditorNode instanceof HTMLElement &&
        jsonEditorNode.contains(activeElement)
      ) {
        // Do not accept the dialog; do not preventDefault or the editor
        // cannot insert a newline.
        return;
      }
      if (
        captureHost instanceof HTMLElement &&
        captureHost.contains(activeElement)
      ) {
        // Let Start recording / ShortcutInput handle Enter; do not accept.
        return;
      }
    }
    super._evtKeydown(event);
  }
}

/**
 * Types for {@link NewShortcutDialog}.
 */
export namespace NewShortcutDialog {
  /**
   * Value returned when the dialog is accepted.
   */
  export interface IValue extends ICustomOptions {
    command: string;
    category: string;
    label?: string;
    keys: string[];
    /** Conflicting targets to remove when accepting Overwrite. */
    overwriteTargets: IShortcutTarget[];
  }

  /**
   * Options for constructing the dialog.
   */
  export interface IOptions {
    translator: ITranslator;
    editorFactory: CodeEditor.Factory;
    commandRegistry: IShortcutUI.IExternalBundle['commandRegistry'];
    findConflictsFor: IShortcutRegistry['findConflictsFor'];
  }
}

/** Mutable draft target used while composing a new shortcut. */
type IDraftShortcut = {
  -readonly [K in keyof IShortcutTarget]: IShortcutTarget[K];
};

/**
 * Body widget for the add-shortcut dialog.
 */
class NewShortcutDialogBody
  extends Widget
  implements Dialog.IBodyWidget<NewShortcutDialog.IValue>
{
  constructor(options: {
    translator: ITranslator;
    editorFactory: CodeEditor.Factory;
    commandRegistry: NewShortcutDialog.IOptions['commandRegistry'];
    findConflictsFor: IShortcutRegistry['findConflictsFor'];
    checkValidation: () => void;
  }) {
    super();
    this._trans = options.translator.load('jupyterlab');
    this._translator = options.translator;
    this._findConflictsFor = options.findConflictsFor;
    this._checkValidation = options.checkValidation;
    this._commands = this._listCommands(options.commandRegistry);

    this.addClass('jp-Shortcuts-AddDialogBody');

    // Command
    const commandField = document.createElement('div');
    commandField.className = 'jp-Shortcuts-Field';

    const commandLabel = document.createElement('label');
    commandLabel.textContent = this._trans.__('Command (required):');
    commandLabel.htmlFor = 'jp-Shortcuts-AddDialog-command';
    commandLabel.className = 'jp-Dialog-label';
    commandField.appendChild(commandLabel);

    this._commandSelect = document.createElement('select');
    this._commandSelect.id = 'jp-Shortcuts-AddDialog-command';
    this._commandSelect.name = 'shortcut-command';
    this._commandSelect.className = 'jp-mod-styled';
    this._commandSelect.required = true;

    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = this._trans.__('Select a command');
    this._commandSelect.appendChild(placeholder);

    for (const command of this._commands) {
      const option = document.createElement('option');
      option.value = command.command;
      option.textContent = `${command.category}: ${command.label ?? command.command}`;
      this._commandSelect.appendChild(option);
    }
    this._commandSelect.addEventListener('change', this._onCommandChange);
    commandField.appendChild(this._commandSelect);
    this.node.appendChild(commandField);

    // Keystroke capture (label + control share an error indicator)
    const shortcutField = document.createElement('div');
    shortcutField.className = 'jp-Shortcuts-Field';

    // Not a <label>: the capture control is not a labelable form control; use
    // aria-labelledby on ShortcutInput instead.
    const shortcutLabel = document.createElement('div');
    shortcutLabel.id = 'jp-Shortcuts-AddDialog-shortcut-label';
    shortcutLabel.textContent = this._trans.__('Shortcut (required):');
    shortcutLabel.className = 'jp-Dialog-label';
    shortcutField.appendChild(shortcutLabel);

    this._captureHost = document.createElement('div');
    this._captureHost.className = 'jp-Shortcuts-AddDialog-capture';
    shortcutField.appendChild(this._captureHost);

    this._errorNode = document.createElement('div');
    this._errorNode.id = 'jp-Shortcuts-AddDialog-shortcut-error';
    this._errorNode.className = 'jp-Shortcuts-Field-error';
    this._errorNode.setAttribute('role', 'alert');
    this._errorNode.setAttribute('aria-live', 'assertive');
    this._errorNode.setAttribute('aria-atomic', 'true');
    shortcutField.appendChild(this._errorNode);

    this.node.appendChild(shortcutField);

    // Selector + arguments (shared with Custom Options dialog)
    this._customOptions = appendCustomOptionFields(this.node, {
      shortcut: this._draft,
      translator: options.translator,
      editorFactory: options.editorFactory,
      checkValidation: options.checkValidation,
      readOnly: false
    });
    this._selectorInput = this._customOptions.selectorInput;
    this._selectorInput.addEventListener('input', this._onSelectorChange);

    this._reactRoot = createRoot(this._captureHost);
    this._renderCapture();
  }

  /** Whether a command is selected. */
  hasCommand(): boolean {
    return this._commandSelect.value !== '';
  }

  /** Whether the captured chord is complete enough to save. */
  hasKeysReady(): boolean {
    return this._isChordFunctional(this._keys);
  }

  /** Whether the current capture conflicts with existing shortcuts. */
  hasConflicts(): boolean {
    return this._conflicts.length > 0;
  }

  getValue(): NewShortcutDialog.IValue {
    const options = this._customOptions.getValue();
    return {
      command: this._draft.command,
      category: this._draft.category,
      label: this._draft.label,
      keys: [...this._keys],
      overwriteTargets: [...this._conflicts],
      selector: options.selector,
      args: options.args
    };
  }

  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this._commandSelect.removeEventListener('change', this._onCommandChange);
    this._selectorInput.removeEventListener('input', this._onSelectorChange);
    this._reactRoot?.unmount();
    this._reactRoot = null;
    this._customOptions.dispose();
    super.dispose();
  }

  private _listCommands(
    commandRegistry: NewShortcutDialog.IOptions['commandRegistry']
  ): IShortcutTarget[] {
    const registry = new ShortcutRegistry({
      commandRegistry,
      allCommands: true
    });
    const commands = ShortcutRegistry.matchItems(registry, '')
      .map((item: ISearchResult) => item.item)
      .filter(target => !target.command.startsWith('__internal:'));

    commands.sort((a: IShortcutTarget, b: IShortcutTarget) => {
      const byCategory = a.category.localeCompare(b.category);
      if (byCategory) {
        return byCategory;
      }
      return (a.label ?? '').localeCompare(b.label ?? '');
    });
    return commands;
  }

  private _isChordFunctional(keys: string[]): boolean {
    if (keys.length === 0) {
      return false;
    }
    const lastChord = keys[keys.length - 1];
    const lastKey = lastChord.split(' ').filter(Boolean).pop() ?? '';
    return !MODIFIER_KEYS.has(lastKey);
  }

  private _onCommandChange = (): void => {
    const selected = this._commands.find(
      command => command.command === this._commandSelect.value
    );
    this._draft.command = selected?.command ?? '';
    this._draft.category = selected?.category ?? '';
    this._draft.label = selected?.label;
    this._renderCapture();
    this._checkValidation();
  };

  private _onSelectorChange = (): void => {
    this._draft.selector = this._selectorInput.value;
    this._renderCapture();
  };

  private _onKeysChange = (keys: string[]): void => {
    this._keys = keys;
    this._checkValidation();
  };

  private _displayCaptureError = (data: ICaptureError): void => {
    this._conflicts = data.kind === 'conflict' ? [...data.conflictsWith] : [];
    // Assertive error region also announces that the footer is now Overwrite
    // (label swap alone is easy to miss while focus stays in the capture field).
    this._errorNode.textContent =
      data.kind === 'conflict'
        ? this._trans.__('%1 Press Overwrite to replace it.', data.message)
        : data.message;
    this._checkValidation();
  };

  private _clearCaptureError = (): void => {
    this._conflicts = [];
    this._errorNode.textContent = '';
    this._checkValidation();
  };

  private _noopAdd: IShortcutUI['addKeybinding'] = async () => {
    // Persistence is deferred to dialog Save.
  };

  private _noopReplace: IShortcutUI['replaceKeybinding'] = async () => {
    // Persistence is deferred to dialog Save.
  };

  private _noopDelete: IShortcutUI['deleteKeybinding'] = async () => {
    // Persistence is deferred to dialog Save.
  };

  private _renderCapture(): void {
    if (!this._reactRoot) {
      return;
    }
    this._reactRoot.render(
      <ShortcutInput
        addKeybinding={this._noopAdd}
        replaceKeybinding={this._noopReplace}
        deleteKeybinding={this._noopDelete}
        findConflictsFor={this._findConflictsFor}
        displayCaptureError={this._displayCaptureError}
        clearCaptureError={this._clearCaptureError}
        toggleInput={() => undefined}
        shortcut={this._draft}
        toSymbols={toSymbols}
        displayInput={true}
        placeholder=""
        translator={this._translator}
        deferPersist={true}
        onKeysChange={this._onKeysChange}
        id="jp-Shortcuts-AddDialog-shortcut"
        labelledBy="jp-Shortcuts-AddDialog-shortcut-label"
        externalErrorId="jp-Shortcuts-AddDialog-shortcut-error"
      />
    );
  }

  private _trans: TranslationBundle;
  private _translator: ITranslator;
  private _findConflictsFor: IShortcutRegistry['findConflictsFor'];
  private _checkValidation: () => void;
  private _commands: IShortcutTarget[];
  private _commandSelect: HTMLSelectElement;
  private _captureHost: HTMLDivElement;
  private _errorNode: HTMLDivElement;
  private _customOptions: ICustomOptionsFields;
  private _selectorInput: HTMLInputElement;
  private _reactRoot: Root | null = null;
  private _keys: string[] = [];
  private _conflicts: IShortcutTarget[] = [];
  private _draft: IDraftShortcut = {
    id: 'new-shortcut',
    command: '',
    category: '',
    selector: 'body',
    keybindings: [],
    args: {} as JSONObject
  };
}
