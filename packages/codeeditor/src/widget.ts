// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Message
} from '@phosphor/messaging';

import {
  Widget
} from '@phosphor/widgets';

import {
  CodeEditor
} from './';


/**
 * The class name added to an editor widget that has a primary selection.
 */
const HAS_SELECTION_CLASS = 'jp-mod-has-primary-selection';


/**
 * A widget which hosts a code editor.
 */
export
class CodeEditorWrapper extends Widget {
  /**
   * Construct a new code editor widget.
   */
  constructor(options: CodeEditorWrapper.IOptions) {
    super();
    const editor = this.editor = options.factory({
      host: this.node,
      model: options.model,
      uuid: options.uuid,
      config: options.config,
      selectionStyle: options.selectionStyle
    });
    editor.model.selections.changed.connect(this._onSelectionsChanged, this);
  }

  /**
   * Get the editor wrapped by the widget.
   */
  readonly editor: CodeEditor.IEditor;

  /**
   * Get the model used by the widget.
   */
  get model(): CodeEditor.IModel {
    return this.editor.model;
  }

  /**
   * Dispose of the resources held by the widget.
   */
  dispose() {
    if (this.isDisposed) {
      return;
    }
    super.dispose();
    this.editor.dispose();
  }

  /**
   * Handle `'activate-request'` messages.
   */
  protected onActivateRequest(msg: Message): void {
    this.editor.focus();
  }

  /**
   * A message handler invoked on an `'after-attach'` message.
   */
  protected onAfterAttach(msg: Message): void {
    super.onAfterAttach(msg);
    if (this.isVisible) {
      this.editor.refresh();
    }
  }

  /**
   * A message handler invoked on an `'after-show'` message.
   */
  protected onAfterShow(msg: Message): void {
    this.editor.refresh();
  }

  /**
   * A message handler invoked on a `'resize'` message.
   */
  protected onResize(msg: Widget.ResizeMessage): void {
    if (msg.width >= 0 && msg.height >= 0) {
      this.editor.setSize(msg);
    } else {
      this.editor.resizeToFit();
    }
  }

  /**
   * Handle a change in model selections.
   */
  private _onSelectionsChanged(): void {
    const { start, end } = this.editor.getSelection();

    if (start.column !== end.column || start.line !== end.line) {
      this.addClass(HAS_SELECTION_CLASS);
    } else {
      this.removeClass(HAS_SELECTION_CLASS);
    }
  }
}


/**
 * The namespace for the `CodeEditorWrapper` statics.
 */
export
namespace CodeEditorWrapper {
  /**
   * The options used to initialize a code editor widget.
   */
  export
  interface IOptions {
    /**
     * A code editor factory.
     *
     * #### Notes
     * The widget needs a factory and a model instead of a `CodeEditor.IEditor`
     * object because it needs to provide its own node as the host.
     */
    factory: CodeEditor.Factory;

    /**
     * The model used to initialize the code editor.
     */
    model: CodeEditor.IModel;

    /**
     * The desired uuid for the editor.
     */
    uuid?: string;

    /**
     * The configuration options for the editor.
     */
    config?: Partial<CodeEditor.IConfig>;

   /**
    * The default selection style for the editor.
    */
    selectionStyle?: CodeEditor.ISelectionStyle;
  }
}
