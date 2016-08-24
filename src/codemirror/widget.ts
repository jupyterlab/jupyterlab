// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import * as CodeMirror
from 'codemirror';

import 'codemirror/mode/meta';

import {
  loadModeByFileName, loadModeByMIME
} from '../codemirror';

import {
    ISignal, defineSignal
} from 'phosphor/lib/core/signaling';

import {
  Message
} from 'phosphor/lib/core/messaging';

import {
  ResizeMessage, Widget
} from 'phosphor/lib/ui/widget';

import {
  EditorWidget, IEditorView, IEditorModel, IEditorConfiguration, IPosition
} from '../editorwidget/widget';

export * from '../editorwidget/widget';

/**
 * The class name added to CodeMirrorWidget instances.
 */
const EDITOR_CLASS = 'jp-CodeMirrorWidget';

/** 
 * The name of the default CodeMirror theme.
 */
export
const DEFAULT_CODEMIRROR_THEME = 'jupyter';

/**
 * A widget which hosts a CodeMirror editor.
 */
export
class CodeMirrorEditorWidget extends Widget implements EditorWidget, IEditorModel, IEditorConfiguration {

  /**
   * Construct a CodeMirror editor widget.
   */
  constructor(options: CodeMirror.EditorConfiguration = {}) {
    super();
    this.addClass(EDITOR_CLASS);
    options.theme = (options.theme || DEFAULT_CODEMIRROR_THEME);
    this._editor = CodeMirror(this.node, options);

    const doc = this.editor.getDoc();
    CodeMirror.on(doc, 'change', (instance, change) => {
      this.onDocChange(instance, change);
    });
  }

  /**
   * A signal emitted when an editor is closed.
   */
  closed: ISignal<IEditorView, void>

  /**
   * A signal emitted when a uri of this model changed.
   */
  uriChanged: ISignal<IEditorModel, void>;

  /**
   * A signal emitted when a content of this model changed.
   */
  contentChanged: ISignal<IEditorModel, void>;

  /**
   * A signal emitted when this configuration changed.
   */
  configurationChanged: ISignal<IEditorConfiguration, void>;

  /**
   * Dispose of the resources held by the widget.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    super.dispose();

    this._editor = null;
  }

  /**
   * Get the editor wrapped by the widget.
   *
   * #### Notes
   * This is a ready-only property.
   */
  get editor(): CodeMirror.Editor {
    return this._editor;
  }

  /**
   * Returns a configuration for this editor.
   */
  getConfiguration(): IEditorConfiguration {
    return this;
  }
  
  /**
   * Control the rendering of line numbers.
   */
  get lineNumbers(): boolean {
    return this.editor.getOption('lineNumbers');
  }

  set lineNumbers(value: boolean) {
    this.editor.setOption('lineNumbers', value);
    this.configurationChanged.emit(void 0);
  }

  /**
   * The font size.
   */
  get fontSize(): number {
    return this.editor.defaultTextHeight(); 
  }

  set fontSize(fontSize:number) {
    throw new Error('TODO: Not implemented yet')
  }

  /**
   * Should the editor be read only.
   */
  get readOnly(): boolean {
    return this.editor.getOption('readOnly') === 'nocursor';
  }

  set readOnly(readOnly:boolean) {
    let option = readOnly ? 'nocursor' : false;
    this.editor.setOption('readOnly', option);
    this.configurationChanged.emit(void 0);
  }
  
  /**
   * The line height.
   */
  get lineHeight(): number {
    return this.editor.defaultTextHeight();
  }

  set lineHeight(lineHeight:number) {
    throw new Error('TODO: Not implemented yet')
  }

  /**
   * Returns a model for this editor.
   */
  getModel(): IEditorModel {
    return this;
  }

  /**
   * A path associated with this editor model.
   */
  get uri(): string {
    return this._uri;
  }

  set uri(uri:string) {
    this._uri = uri;
    loadModeByFileName(this.editor, this._uri);
    this.uriChanged.emit(void 0);
  }

  /**
   * Get the text stored in this model.
   */
  getValue(): string {
    return this.editor.getDoc().getValue();
  }

  /**
   * Replace the entire text contained in this model.
   */
  setValue(value: string) {
    this.editor.getDoc().setValue(value);
  }

  /**
   * Change the mode for an editor based on the given mime type.
   */
  setMimeType(mimeType: string): void {
    loadModeByMIME(this.editor, mimeType);
  }

  /**
   * Get the number of lines in the model.
   */
  getLineCount(): number {
    return this.editor.getDoc().lineCount();
  }

  /**
   * Returns a last line number.
   */
  getLastLine(): number {
    return this.editor.getDoc().lastLine();
  }

  /**
   * Returns a content for the given line number.
   */
  getLineContent(line:number): string {
    return this.editor.getDoc().getLineHandle(line).text;
  }

  /**
   * Find an offset fot the given position.
   */
  getOffsetAt(position: IPosition): number {
    const codeMirrorPosition = this.toCodeMirrorPosition(position);
    return this.editor.getDoc().indexFromPos(codeMirrorPosition);
  }

  /**
   * Find a position fot the given offset.
   */
  getPositionAt(offset: number): IPosition {
    const position = this.editor.getDoc().posFromIndex(offset);
    return this.toPosition(position);
  }

  /**
   * A cursor position for this editor.
   */
  get position(): IPosition {
    const cursor = this.editor.getDoc().getCursor();
    return {
        line: cursor.line,
        column: cursor.ch
    };
  }

  set position(position: IPosition) {
    this.editor.getDoc().setCursor({
        line: position.line,
        ch: position.column
    });
  }

  /**
   * Test whether the editor has keyboard focus.
   */
  hasFocus(): boolean {
    return this.editor.hasFocus();
  }

  /**
   * Brings browser focus to this editor text.
   */
  focus(): void {
    this.editor.focus();
  }

  /**
   * Handle change events from the document.
   */
  protected onDocChange(doc: CodeMirror.Doc, change: CodeMirror.EditorChange) {
    if (change.origin !== 'setValue') {
      this.contentChanged.emit(void 0);
    }
  }

  /**
   * Return a left offset for the given position.
   */
  getLeftOffset(position: IPosition): number {
    const codeMirroPosition = this.toCodeMirrorPosition(position);
    const coords = this.editor.charCoords(codeMirroPosition, 'page');
    return coords.left;
  }
  
  /**
   * Return a top offset fot the given position.
   */
  getTopOffset(position: IPosition): number {
    const codeMirroPosition = this.toCodeMirrorPosition(position);
    const coords = this.editor.charCoords(codeMirroPosition, 'page');
    return coords.top;
  }

  /**
   * Convert a code mirror position to an editor position.
   */
  protected toPosition(position: CodeMirror.Position) {
    return {
      line: position.line,
      column: position.ch
    }
  }

  /**
   * Convert an editor position to a code mirror position.
   */
  protected toCodeMirrorPosition(position: IPosition) {
    return {
      line: position.line,
      ch: position.column
    }
  }

  /**
   * A message handler invoked on an `'after-attach'` message.
   */
  protected onAfterAttach(msg: Message): void {
    if (!this.isVisible) {
      this._needsRefresh = true;
      return;
    }
    this.editor.refresh();
    this._needsRefresh = false;
  }

  /**
   * A message handler invoked on an `'after-show'` message.
   */
  protected onAfterShow(msg: Message): void {
    if (this._needsRefresh) {
      this.editor.refresh();
      this._needsRefresh = false;
    }
  }

  /**
   * A message handler invoked on an `'resize'` message.
   */
  protected onResize(msg: ResizeMessage): void {
    if (msg.width < 0 || msg.height < 0) {
      this.editor.refresh();
    } else {
      this.editor.setSize(msg.width, msg.height);
    }
    this._needsRefresh = false;
  }

  /**
   * Handle `'activate-request'` messages.
   */
  protected onActivateRequest(msg: Message): void {
    this.editor.focus();
  }

  /**
   * Handle `'close-request'` messages.
   */
  protected onCloseRequest(msg: Message) {
    this.closed.emit(void 0);
    super.onCloseRequest(msg);
  }

  private _editor: CodeMirror.Editor = null;
  private _needsRefresh = true;
  private _uri:string
}

// Define the signals for the `CodeMirrorEditorWidget` class.
defineSignal(CodeMirrorEditorWidget.prototype, 'closed');
defineSignal(CodeMirrorEditorWidget.prototype, 'uriChanged');
defineSignal(CodeMirrorEditorWidget.prototype, 'contentChanged');
defineSignal(CodeMirrorEditorWidget.prototype, 'configurationChanged');
