// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { MimeData } from '@lumino/coreutils';
import { Drag } from '@lumino/dragdrop';
import { Message } from '@lumino/messaging';
import { Widget } from '@lumino/widgets';
import { CodeEditor } from './';

/**
 * The class name added to an editor widget that has a primary selection.
 */
const HAS_SELECTION_CLASS = 'jp-mod-has-primary-selection';

/**
 * The class name added to an editor widget that has a cursor/selection
 * within the whitespace at the beginning of a line
 */
const HAS_IN_LEADING_WHITESPACE_CLASS = 'jp-mod-in-leading-whitespace';

/**
 * A class used to indicate a drop target.
 */
const DROP_TARGET_CLASS = 'jp-mod-dropTarget';

/**
 * RegExp to test for leading whitespace
 */
const leadingWhitespaceRe = /^\s+$/;

/**
 * A widget which hosts a code editor.
 */
export class CodeEditorWrapper extends Widget {
  /**
   * Construct a new code editor widget.
   */
  constructor(options: CodeEditorWrapper.IOptions) {
    super();
    const { factory, model, editorOptions } = options;
    const editor = (this.editor = factory({
      host: this.node,
      model,
      ...editorOptions
    }));
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
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this.editor.dispose();
    super.dispose();
  }

  /**
   * Handle the DOM events for the widget.
   *
   * @param event - The DOM event sent to the widget.
   *
   * #### Notes
   * This method implements the DOM `EventListener` interface and is
   * called in response to events on the notebook panel's node. It should
   * not be called directly by user code.
   */
  handleEvent(event: Event): void {
    switch (event.type) {
      case 'lm-dragenter':
        this._evtDragEnter(event as Drag.Event);
        break;
      case 'lm-dragleave':
        this._evtDragLeave(event as Drag.Event);
        break;
      case 'lm-dragover':
        this._evtDragOver(event as Drag.Event);
        break;
      case 'lm-drop':
        this._evtDrop(event as Drag.Event);
        break;
      default:
        break;
    }
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
    const node = this.node;
    node.addEventListener('lm-dragenter', this);
    node.addEventListener('lm-dragleave', this);
    node.addEventListener('lm-dragover', this);
    node.addEventListener('lm-drop', this);
  }

  /**
   * Handle `before-detach` messages for the widget.
   */
  protected onBeforeDetach(msg: Message): void {
    const node = this.node;
    node.removeEventListener('lm-dragenter', this);
    node.removeEventListener('lm-dragleave', this);
    node.removeEventListener('lm-dragover', this);
    node.removeEventListener('lm-drop', this);
  }

  /**
   * Handle a change in model selections.
   */
  private _onSelectionsChanged(): void {
    const { start, end } = this.editor.getSelection();

    if (start.column !== end.column || start.line !== end.line) {
      // a selection was made
      this.addClass(HAS_SELECTION_CLASS);
      this.removeClass(HAS_IN_LEADING_WHITESPACE_CLASS);
    } else {
      // the cursor was placed
      this.removeClass(HAS_SELECTION_CLASS);

      if (
        this.editor
          .getLine(end.line)!
          .slice(0, end.column)
          .match(leadingWhitespaceRe)
      ) {
        this.addClass(HAS_IN_LEADING_WHITESPACE_CLASS);
      } else {
        this.removeClass(HAS_IN_LEADING_WHITESPACE_CLASS);
      }
    }
  }

  /**
   * Handle the `'lm-dragenter'` event for the widget.
   */
  private _evtDragEnter(event: Drag.Event): void {
    if (this.editor.getOption('readOnly') === true) {
      return;
    }
    const data = Private.findTextData(event.mimeData);
    if (data === undefined) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    this.addClass('jp-mod-dropTarget');
  }

  /**
   * Handle the `'lm-dragleave'` event for the widget.
   */
  private _evtDragLeave(event: Drag.Event): void {
    this.removeClass(DROP_TARGET_CLASS);
    if (this.editor.getOption('readOnly') === true) {
      return;
    }
    const data = Private.findTextData(event.mimeData);
    if (data === undefined) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
  }

  /**
   * Handle the `'lm-dragover'` event for the widget.
   */
  private _evtDragOver(event: Drag.Event): void {
    this.removeClass(DROP_TARGET_CLASS);
    if (this.editor.getOption('readOnly') === true) {
      return;
    }
    const data = Private.findTextData(event.mimeData);
    if (data === undefined) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    event.dropAction = 'copy';
    this.addClass(DROP_TARGET_CLASS);
  }

  /**
   * Handle the `'lm-drop'` event for the widget.
   */
  private _evtDrop(event: Drag.Event): void {
    if (this.editor.getOption('readOnly') === true) {
      return;
    }
    const data = Private.findTextData(event.mimeData);
    if (data === undefined) {
      return;
    }
    const coordinate: CodeEditor.ICoordinate = {
      top: event.y,
      bottom: event.y,
      left: event.x,
      right: event.x
    };
    const position = this.editor.getPositionForCoordinate(coordinate);
    if (position === null) {
      return;
    }
    this.removeClass(DROP_TARGET_CLASS);
    event.preventDefault();
    event.stopPropagation();
    if (event.proposedAction === 'none') {
      event.dropAction = 'none';
      return;
    }
    const offset = this.editor.getOffsetAt(position);
    this.model.sharedModel.updateSource(offset, offset, data);
  }
}

/**
 * The namespace for the `CodeEditorWrapper` statics.
 */
export namespace CodeEditorWrapper {
  /**
   * The options used to initialize a code editor widget.
   */
  export interface IOptions {
    /**
     * A code editor factory.
     *
     * #### Notes
     * The widget needs a factory and a the editor options
     * because it needs to provide its own node as the host.
     */
    factory: CodeEditor.Factory;

    /**
     * The content model for the wrapper.
     */
    model: CodeEditor.IModel;

    /**
     * Code editor options
     */
    editorOptions?: Omit<CodeEditor.IOptions, 'host' | 'model'>;
  }
}

/**
 * A namespace for private functionality.
 */
namespace Private {
  /**
   * Given a MimeData instance, extract the first text data, if any.
   */
  export function findTextData(mime: MimeData): string | undefined {
    const types = mime.types();
    const textType = types.find(t => t.indexOf('text') === 0);
    if (textType === undefined) {
      return undefined;
    }
    return mime.getData(textType) as string;
  }
}
