// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { MimeData } from '@phosphor/coreutils';

import { IDragEvent } from '@phosphor/dragdrop';

import { Message } from '@phosphor/messaging';

import { Widget } from '@phosphor/widgets';

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
    const editor = (this.editor = options.factory({
      host: this.node,
      model: options.model,
      uuid: options.uuid,
      config: options.config,
      selectionStyle: options.selectionStyle
    }));
    editor.model.selections.changed.connect(
      this._onSelectionsChanged,
      this
    );
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
      case 'p-dragenter':
        this._evtDragEnter(event as IDragEvent);
        break;
      case 'p-dragleave':
        this._evtDragLeave(event as IDragEvent);
        break;
      case 'p-dragover':
        this._evtDragOver(event as IDragEvent);
        break;
      case 'p-drop':
        this._evtDrop(event as IDragEvent);
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
    let node = this.node;
    node.addEventListener('p-dragenter', this);
    node.addEventListener('p-dragleave', this);
    node.addEventListener('p-dragover', this);
    node.addEventListener('p-drop', this);
    if (this.isVisible) {
      this.update();
    }
  }

  /**
   * Handle `before-detach` messages for the widget.
   */
  protected onBeforeDetach(msg: Message): void {
    let node = this.node;
    node.removeEventListener('p-dragenter', this);
    node.removeEventListener('p-dragleave', this);
    node.removeEventListener('p-dragover', this);
    node.removeEventListener('p-drop', this);
  }

  /**
   * A message handler invoked on an `'after-show'` message.
   */
  protected onAfterShow(msg: Message): void {
    this.update();
  }

  /**
   * A message handler invoked on a `'resize'` message.
   */
  protected onResize(msg: Widget.ResizeMessage): void {
    if (msg.width >= 0 && msg.height >= 0) {
      this.editor.setSize(msg);
    } else if (this.isVisible) {
      this.editor.resizeToFit();
    }
  }

  /**
   * A message handler invoked on an `'update-request'` message.
   */
  protected onUpdateRequest(msg: Message): void {
    this.editor.refresh();
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
          .getLine(end.line)
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
   * Handle the `'p-dragenter'` event for the widget.
   */
  private _evtDragEnter(event: IDragEvent): void {
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
   * Handle the `'p-dragleave'` event for the widget.
   */
  private _evtDragLeave(event: IDragEvent): void {
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
   * Handle the `'p-dragover'` event for the widget.
   */
  private _evtDragOver(event: IDragEvent): void {
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
   * Handle the `'p-drop'` event for the widget.
   */
  private _evtDrop(event: IDragEvent): void {
    if (this.editor.getOption('readOnly') === true) {
      return;
    }
    const data = Private.findTextData(event.mimeData);
    if (data === undefined) {
      return;
    }
    this.removeClass(DROP_TARGET_CLASS);
    event.preventDefault();
    event.stopPropagation();
    if (event.proposedAction === 'none') {
      event.dropAction = 'none';
      return;
    }
    const coordinate = {
      top: event.y,
      bottom: event.y,
      left: event.x,
      right: event.x,
      x: event.x,
      y: event.y,
      width: 0,
      height: 0
    };
    const position = this.editor.getPositionForCoordinate(coordinate);
    const offset = this.editor.getOffsetAt(position);
    this.model.value.insert(offset, data);
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
