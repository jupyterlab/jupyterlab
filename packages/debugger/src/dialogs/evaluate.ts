import { Dialog } from '@jupyterlab/apputils';

import { CodeCell, CodeCellModel } from '@jupyterlab/cells';

import { IRenderMimeRegistry } from '@jupyterlab/rendermime';

import { Message } from '@lumino/messaging';

import { Widget } from '@lumino/widgets';

export class EvaluateDialog extends Dialog<string> {
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
export class EvaluateDialogBody
  extends Widget
  implements Dialog.IBodyWidget<string> {
  /**
   * CodePromptDialog constructor
   *
   * @param options Constructor options
   */
  constructor(options: EvaluateDialogBody.IOptions) {
    const { rendermime, mimeType, ...opts } = options;
    super(opts);

    const model = new CodeCellModel({});
    model.mimeType = mimeType;
    this._prompt = new CodeCell({
      rendermime,
      model
    }).initializeState();

    this.node.appendChild(this._prompt.node);
  }

  /**
   * Get the text specified by the user
   */
  getValue(): string {
    return this._prompt.model.value.text;
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

/**
 * A namespace for CodePromptDialogBody statics
 */
export namespace EvaluateDialogBody {
  /**
   * The options used to initialize a CodePromptDialogBody object.
   */
  export interface IOptions {
    /**
     * The mime renderer for the cell widget.
     */
    rendermime: IRenderMimeRegistry;

    /**
     * The mime type for the cell widget content.
     */
    mimeType: string;
  }
}
