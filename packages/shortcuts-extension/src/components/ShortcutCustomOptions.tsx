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

    const body = new CustomOptionsDialogBody(
      shortcut,
      translator,
      editorFactory,
      () => this._checkValidation(),
      options.readOnly
    );

    super({
      title: trans.__('Custom Shortcut Options'),
      body,
      buttons: [
        Dialog.cancelButton({ label: trans.__('Cancel') }),
        Dialog.okButton({ label: trans.__('Apply') })
      ]
    });
  }

  /**
   * Overwrite the keyboard event to prevent the dialog from submitting when
   * pressing Enter in the JSON editor.
   */
  protected _evtKeydown(event: KeyboardEvent): void {
    // no-op
  }
}

/**
 * Body widget for the custom options dialog.
 */
class CustomOptionsDialogBody
  extends Widget
  implements Dialog.IBodyWidget<ICustomOptions>
{
  private _selectorInput: HTMLInputElement;
  private _editorWidget: JSONEditorWidget;

  constructor(
    shortcut: IShortcutTarget,
    translator: ITranslator,
    editorFactory: CodeEditor.Factory,
    checkValidation: () => void,
    readOnly: boolean
  ) {
    super();
    const trans = translator.load('jupyterlab');

    this.addClass('jp-Shortcuts-CustomOptionsDialogBody');

    // Create main container
    const container = document.createElement('div');
    container.className = 'jp-Shortcuts-CustomOptionDialog-container';

    // Selector section
    const selectorLabel = document.createElement('label');
    selectorLabel.textContent = trans.__('Selector:');
    selectorLabel.className = 'jp-Dialog-label';

    this._selectorInput = document.createElement('input');
    this._selectorInput.type = 'text';
    this._selectorInput.disabled = readOnly ?? false;
    this._selectorInput.value = shortcut.selector;
    this._selectorInput.className = 'jp-mod-styled';

    container.appendChild(selectorLabel);
    container.appendChild(this._selectorInput);

    // Args section
    const argsLabel = document.createElement('label');
    argsLabel.textContent = trans.__('Arguments:');
    argsLabel.className = 'jp-Dialog-label';
    container.appendChild(argsLabel);

    if (readOnly) {
      const argsPre = document.createElement('pre');
      argsPre.textContent = JSON.stringify(shortcut.args ?? {}, undefined, 2);
      container.appendChild(argsPre);
    } else {
      // Create dedicated JSON editor widget
      this._editorWidget = new JSONEditorWidget(
        shortcut.args ?? {},
        editorFactory,
        checkValidation
      );
      container.appendChild(this._editorWidget.node);
    }

    this.node.appendChild(container);
  }

  /**
   * Get the value from the dialog body.
   */
  getValue(): ICustomOptions {
    const argsText = this._editorWidget.getJSON();
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
      selector: this._selectorInput.value,
      args
    };
  }

  /**
   * Dispose resources.
   */
  dispose(): void {
    this._editorWidget.dispose();
    super.dispose();
  }
}

/**
 * A dedicated widget for JSON editing with validation.
 */
class JSONEditorWidget extends Widget {
  private _editor: CodeEditor.IEditor;
  private _checkValidation: () => void;

  constructor(
    initialArgs: Record<string, unknown>,
    editorFactory: CodeEditor.Factory,
    checkValidation: () => void
  ) {
    super();
    this.addClass('jp-JSONEditor');
    this._checkValidation = checkValidation;
    const editorHostNode = document.createElement('div');
    editorHostNode.className = 'jp-JSONEditor-host';

    const model = new CodeEditor.Model({ mimeType: 'application/json' });
    const content = JSON.stringify(initialArgs, null, 2);
    model.sharedModel.setSource(content);

    this._editor = editorFactory({
      host: editorHostNode,
      model,
      config: {
        readOnly: false
      }
    });

    this.node.appendChild(editorHostNode);

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

  /**
   * Dispose of the resources.
   */
  dispose(): void {
    this._editor.model.sharedModel.changed.disconnect(this._validateJSON, this);
    this._editor.dispose();
    super.dispose();
  }
}
