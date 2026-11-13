/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { Dialog } from '@jupyterlab/apputils';
import { CodeEditor } from '@jupyterlab/codeeditor';
import type { ITranslator } from '@jupyterlab/translation';
import type { JSONObject } from '@lumino/coreutils';
import { Widget } from '@lumino/widgets';

import type { ICustomOptions, IShortcutTarget } from '../types';

export class CustomOptionsDialog extends Dialog<ICustomOptions> {
  constructor(options: {
    shortcut: IShortcutTarget;
    editorFactory: CodeEditor.Factory;
    translator: ITranslator;
    readOnly: boolean;
  }) {
    const { shortcut, translator, editorFactory } = options;
    const trans = translator.load('jupyterlab');

    // Defer until after super(): body may invoke checkValidation during setup.
    let checkValidation = (): void => undefined;
    const body = new CustomOptionsDialogBody({
      shortcut,
      translator,
      editorFactory,
      checkValidation: () => checkValidation(),
      readOnly: options.readOnly
    });

    const buttons: Dialog.IButton[] = [];
    if (options.readOnly) {
      buttons.push(Dialog.cancelButton({ label: trans.__('OK') }));
    } else {
      buttons.push(Dialog.cancelButton({ label: trans.__('Cancel') }));
      buttons.push(Dialog.okButton({ label: trans.__('Apply') }));
    }
    super({
      title: options.readOnly
        ? trans.__('Shortcut Options')
        : trans.__('Custom Shortcut Options'),
      body,
      buttons
    });

    checkValidation = () => this._checkValidation();
    this._checkValidation();
  }

  /**
   * Overwrite the keyboard event to prevent the dialog from submitting when
   * pressing Enter in the JSON editor.
   *
   * For all other keys (and Enter outside the JSON editor), delegate to the
   * base dialog handler to preserve standard keyboard behavior.
   */
  protected _evtKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      // If focus is inside the JSON editor, prevent the dialog from treating
      // Enter as a submit/activate-default-button key.
      const jsonEditorNode = this.node.querySelector('.jp-JSONEditor');
      const activeElement = document.activeElement;
      if (
        jsonEditorNode instanceof HTMLElement &&
        activeElement instanceof HTMLElement &&
        jsonEditorNode.contains(activeElement)
      ) {
        event.stopPropagation();
        return;
      }
    }
    // Fallback to the default dialog behavior.
    super._evtKeydown(event);
  }
}

/**
 * Options for selector and arguments fields.
 */
export interface ICustomOptionsFieldsOptions {
  shortcut: IShortcutTarget;
  translator: ITranslator;
  editorFactory: CodeEditor.Factory;
  checkValidation: () => void;
  readOnly: boolean;
}

/**
 * Options for {@link CustomOptionsDialogBody}.
 */
export type ICustomOptionsDialogBodyOptions = ICustomOptionsFieldsOptions;

/**
 * Selector and arguments fields appended to a host (dialog body).
 */
export interface ICustomOptionsFields {
  readonly selectorInput: HTMLInputElement;
  getValue(): ICustomOptions;
  dispose(): void;
}

/**
 * Append Selector and Arguments fields to `host`.
 */
export function appendCustomOptionFields(
  host: HTMLElement,
  options: ICustomOptionsFieldsOptions
): ICustomOptionsFields {
  const { shortcut, translator, editorFactory, checkValidation, readOnly } =
    options;
  const trans = translator.load('jupyterlab');

  const selectorField = document.createElement('div');
  selectorField.className = 'jp-Shortcuts-Field';

  const selectorLabel = document.createElement('label');
  selectorLabel.textContent = trans.__('Selector:');
  selectorLabel.className = 'jp-Dialog-label';

  const selectorInput = document.createElement('input');
  selectorInput.type = 'text';
  selectorInput.disabled = readOnly;
  selectorInput.value = shortcut.selector;
  selectorInput.className = 'jp-mod-styled';

  selectorField.appendChild(selectorLabel);
  selectorField.appendChild(selectorInput);
  host.appendChild(selectorField);

  const argsField = document.createElement('div');
  argsField.className = 'jp-Shortcuts-Field';

  const argsLabel = document.createElement('label');
  argsLabel.textContent = trans.__('Arguments:');
  argsLabel.className = 'jp-Dialog-label';
  argsField.appendChild(argsLabel);

  let editorWidget: JSONEditorWidget | undefined;
  if (readOnly) {
    const argsPre = document.createElement('pre');
    argsPre.textContent = JSON.stringify(shortcut.args ?? {}, undefined, 2);
    argsField.appendChild(argsPre);
  } else {
    editorWidget = new JSONEditorWidget(
      shortcut.args ?? {},
      editorFactory,
      checkValidation
    );
    argsField.appendChild(editorWidget.node);
  }
  host.appendChild(argsField);

  return {
    selectorInput,
    getValue(): ICustomOptions {
      const argsText = editorWidget?.getJSON() ?? '{}';
      let args: JSONObject;

      try {
        args = JSON.parse(argsText);
      } catch (error) {
        console.error(
          `Invalid JSON in arguments: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
        args = {};
      }

      return {
        selector: selectorInput.value,
        args
      };
    },
    dispose(): void {
      editorWidget?.dispose();
    }
  };
}

/**
 * Body widget for selector and arguments fields.
 */
export class CustomOptionsDialogBody
  extends Widget
  implements Dialog.IBodyWidget<ICustomOptions>
{
  private _fields: ICustomOptionsFields;

  constructor(options: ICustomOptionsDialogBodyOptions) {
    super();
    this.addClass('jp-Shortcuts-CustomOptionsDialogBody');
    this._fields = appendCustomOptionFields(this.node, options);
  }

  /**
   * Get the value from the dialog body.
   */
  getValue(): ICustomOptions {
    return this._fields.getValue();
  }

  /**
   * Dispose resources.
   */
  dispose(): void {
    this._fields.dispose();
    super.dispose();
  }
}

/**
 * A dedicated widget for JSON editing with validation.
 */
class JSONEditorWidget extends Widget {
  private _editor: CodeEditor.IEditor;
  private _checkValidation: () => void;
  private _editorHostNode: HTMLDivElement;

  constructor(
    initialArgs: Record<string, unknown>,
    editorFactory: CodeEditor.Factory,
    checkValidation: () => void
  ) {
    super();
    this.addClass('jp-JSONEditor');
    this._checkValidation = checkValidation;
    this._editorHostNode = document.createElement('div');
    this._editorHostNode.className = 'jp-JSONEditor-host';

    const model = new CodeEditor.Model({ mimeType: 'application/json' });
    const content = JSON.stringify(initialArgs, null, 2);
    model.sharedModel.setSource(content);

    this._editor = editorFactory({
      host: this._editorHostNode,
      model,
      config: {
        readOnly: false
      }
    });

    this.node.appendChild(this._editorHostNode);

    // CodeMirror binds Tab to indent; in dialogs Tab should move focus instead.
    this._editorHostNode.addEventListener(
      'keydown',
      this._onEditorKeydown,
      true
    );

    this._editor.model.sharedModel.changed.connect(this._validateJSON, this);
  }

  /**
   * Get the current JSON text.
   */
  getJSON(): string {
    return this._editor.model.sharedModel.getSource();
  }

  /**
   * Validate the JSON sources.
   */
  private _validateJSON = () => {
    try {
      const text = this._editor.model.sharedModel.getSource();
      JSON.parse(text);
      this.node.classList.remove('jp-mod-error');
    } catch (error) {
      this.node.classList.add('jp-mod-error');
    }
    this._checkValidation();
  };

  private _onEditorKeydown = (event: KeyboardEvent): void => {
    if (event.key === 'Tab') {
      // Stop before CodeMirror; leave default so focus advances.
      event.stopPropagation();
    }
  };

  /**
   * Dispose of the resources.
   */
  dispose(): void {
    this._editorHostNode.removeEventListener(
      'keydown',
      this._onEditorKeydown,
      true
    );
    this._editor.model.sharedModel.changed.disconnect(this._validateJSON, this);
    this._editor.dispose();
    super.dispose();
  }
}
