/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { Dialog } from '@jupyterlab/apputils';

import { Cell, CodeCell, CodeCellModel } from '@jupyterlab/cells';

import { IRenderMimeRegistry } from '@jupyterlab/rendermime';

import { Message } from '@lumino/messaging';

import { Widget } from '@lumino/widgets';

/**
 * A namespace for DebuggerEvaluateDialog statics.
 */
export namespace DebuggerEvaluateDialog {
  /**
   * Instantiation options for the evaluate dialog.
   */
  export interface IOptions {
    /**
     * The top level text for the dialog. Defaults to an empty string.
     */
    title: string;

    /**
     * Cell content factory.
     */
    contentFactory: Cell.IContentFactory;

    /**
     * The mime renderer for the cell widget.
     */
    rendermime: IRenderMimeRegistry;

    /**
     * The mime type for the cell widget content.
     */
    mimeType?: string;

    /**
     * Label for ok button.
     */
    okLabel?: string;

    /**
     * Label for cancel button.
     */
    cancelLabel?: string;
  }

  /**
   * Create and show a dialog to prompt user for code.
   *
   * @param options - The dialog setup options.
   *
   * @returns A promise that resolves with whether the dialog was accepted
   */
  export function getCode(options: IOptions): Promise<Dialog.IResult<string>> {
    const dialog = new EvaluateDialog({
      ...options,
      body: new EvaluateDialogBody(options),
      buttons: [
        Dialog.cancelButton({ label: options.cancelLabel }),
        Dialog.okButton({ label: options.okLabel })
      ]
    });
    return dialog.launch();
  }
}

/**
 * A dialog to prompt users for code to evaluate.
 */
class EvaluateDialog extends Dialog<string> {
  /**
   * Handle the DOM events for the Evaluate dialog.
   *
   * @param event The DOM event sent to the dialog widget
   */
  handleEvent(event: Event): void {
    if (event.type === 'keydown') {
      const keyboardEvent = event as KeyboardEvent;
      const { code, shiftKey } = keyboardEvent;
      if (shiftKey && code === 'Enter') {
        return this.resolve();
      }
      if (code === 'Enter') {
        return;
      }
    }
    super.handleEvent(event);
  }
}

/**
 * Widget body with a code cell prompt in a dialog
 */
class EvaluateDialogBody extends Widget implements Dialog.IBodyWidget<string> {
  /**
   * CodePromptDialog constructor
   *
   * @param options Constructor options
   */
  constructor(options: DebuggerEvaluateDialog.IOptions) {
    super();

    const { contentFactory, rendermime, mimeType } = options;

    const model = new CodeCellModel();
    model.mimeType = mimeType ?? '';
    this._prompt = new CodeCell({
      contentFactory,
      rendermime,
      model,
      placeholder: false
    }).initializeState();

    // explicitly remove the prompt in front of the input area
    this._prompt.inputArea!.promptNode.remove();

    this.node.appendChild(this._prompt.node);
  }

  /**
   * Get the text specified by the user
   */
  getValue(): string {
    return this._prompt.model.sharedModel.getSource();
  }

  /**
   *  A message handler invoked on an `'after-attach'` message.
   */
  protected onAfterAttach(msg: Message): void {
    super.onAfterAttach(msg);
    this._prompt.activate();
  }

  private _prompt: CodeCell;
}
