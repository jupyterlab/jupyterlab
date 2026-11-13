/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { Dialog } from '@jupyterlab/apputils';
import type { CodeEditor } from '@jupyterlab/codeeditor';
import type { ITranslator, TranslationBundle } from '@jupyterlab/translation';
import type { JSONObject } from '@lumino/coreutils';
import { Platform } from '@lumino/domutils';
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
import type { IConflicts } from './ShortcutInput';
import { ShortcutInput } from './ShortcutInput';

const MAC_SYMBOLS: Record<string, string> = {
  Ctrl: '⌃',
  Alt: '⌥',
  Shift: '⇧',
  Accel: '⌘',
  Cmd: '⌘'
};

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

    checkValidation = () => this._checkValidation();
    this._checkValidation();
  }

  /**
   * Prevent Enter in the command select, JSON editor, or keystroke capture
   * from submitting the dialog.
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
      const captureNode = this.node.querySelector('.jp-Shortcuts-Input');
      if (
        (jsonEditorNode instanceof HTMLElement &&
          jsonEditorNode.contains(activeElement)) ||
        (captureNode instanceof HTMLElement &&
          captureNode.contains(activeElement))
      ) {
        event.stopPropagation();
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
    commandLabel.textContent = this._trans.__('Command:');
    commandLabel.htmlFor = 'jp-Shortcuts-AddDialog-command';
    commandLabel.className = 'jp-Dialog-label';
    commandField.appendChild(commandLabel);

    this._commandSelect = document.createElement('select');
    this._commandSelect.id = 'jp-Shortcuts-AddDialog-command';
    this._commandSelect.name = 'shortcut-command';
    this._commandSelect.className = 'jp-mod-styled';
    this._commandSelect.required = true;
    this._commandSelect.setAttribute(
      'aria-label',
      this._trans.__('Select a command')
    );

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

    const shortcutLabel = document.createElement('label');
    shortcutLabel.textContent = this._trans.__('Shortcut:');
    shortcutLabel.className = 'jp-Dialog-label';
    shortcutField.appendChild(shortcutLabel);

    this._keysValidity = document.createElement('input');
    this._keysValidity.type = 'text';
    this._keysValidity.required = true;
    this._keysValidity.tabIndex = -1;
    this._keysValidity.className = 'jp-sr-only';
    this._keysValidity.setAttribute('aria-hidden', 'true');
    this._updateKeysValidity([]);
    shortcutField.appendChild(this._keysValidity);

    this._captureHost = document.createElement('div');
    this._captureHost.className = 'jp-Shortcuts-AddDialog-capture';
    shortcutField.appendChild(this._captureHost);

    this._conflictNode = document.createElement('div');
    this._conflictNode.className = 'jp-Shortcuts-AddDialog-conflict';
    this._conflictNode.setAttribute('role', 'status');
    shortcutField.appendChild(this._conflictNode);

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

  /**
   * Value for the dialog when accepted.
   */
  getValue(): NewShortcutDialog.IValue {
    const options = this._customOptions.getValue();
    return {
      command: this._draft.command,
      category: this._draft.category,
      label: this._draft.label,
      keys: [...this._keys],
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

  private _toSymbols = (value: string): string => {
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

  private _isChordFunctional(keys: string[]): boolean {
    if (keys.length === 0) {
      return false;
    }
    const lastChord = keys[keys.length - 1];
    const lastKey = lastChord.split(' ').filter(Boolean).pop() ?? '';
    return !MODIFIER_KEYS.has(lastKey);
  }

  private _updateKeysValidity(keys: string[]): void {
    this._keys = keys;
    const functional = this._isChordFunctional(keys);
    this._keysValidity.value = functional ? keys.join(' ') : '';
    this._keysValidity.setCustomValidity(
      functional ? '' : this._trans.__('Capture a complete shortcut.')
    );
    this._checkValidation();
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
    this._updateKeysValidity(keys);
  };

  private _displayConflicts = (data: IConflicts): void => {
    if (data.conflictsWith.length === 0) {
      this._conflictNode.textContent = '';
      return;
    }
    this._conflictNode.textContent = this._trans.__(
      'Shortcut already in use by %1.',
      data.conflictsWith
        .map(target => target.label ?? target.command)
        .join(', ')
    );
  };

  private _clearConflict = (): void => {
    this._conflictNode.textContent = '';
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
        displayConflicts={this._displayConflicts}
        clearConflict={this._clearConflict}
        toggleInput={() => undefined}
        shortcut={this._draft}
        toSymbols={this._toSymbols}
        displayInput={true}
        placeholder=""
        translator={this._translator}
        deferPersist={true}
        onKeysChange={this._onKeysChange}
      />
    );
  }

  private _trans: TranslationBundle;
  private _translator: ITranslator;
  private _findConflictsFor: IShortcutRegistry['findConflictsFor'];
  private _checkValidation: () => void;
  private _commands: IShortcutTarget[];
  private _commandSelect: HTMLSelectElement;
  private _keysValidity: HTMLInputElement;
  private _captureHost: HTMLDivElement;
  private _conflictNode: HTMLDivElement;
  private _customOptions: ICustomOptionsFields;
  private _selectorInput: HTMLInputElement;
  private _reactRoot: Root | null = null;
  private _keys: string[] = [];
  private _draft: IDraftShortcut = {
    id: 'new-shortcut',
    command: '',
    category: '',
    selector: 'body',
    keybindings: [],
    args: {} as JSONObject
  };
}
