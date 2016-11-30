// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import * as CodeMirror
  from 'codemirror';

import {
  loadModeByMIME
} from './';

import {
  CodeEditor, IEditorFactory
} from '../codeeditor';

import {
  CodeMirrorModel
} from './model';

/**
 * The class name added to CodeMirrorWidget instances.
 */
const EDITOR_CLASS = 'jp-CodeMirrorWidget';

/**
 * The name of the default CodeMirror theme
 */
export
const DEFAULT_CODEMIRROR_THEME = 'jupyter';

/**
 * CodeMirror editor.
 */
export
class CodeMirrorEditor implements CodeEditor.IEditor {

  /**
   * Construct a CodeMirror editor.
   */
  constructor(host: HTMLElement, options: CodeMirror.EditorConfiguration = {}) {
    host.classList.add(EDITOR_CLASS);
    let codeMirrorModel = this._model = new CodeMirrorModel();
    options.theme = (options.theme || DEFAULT_CODEMIRROR_THEME);
    options.value = codeMirrorModel.doc;
    this._editor = CodeMirror(host, options);
    codeMirrorModel.mimeTypeChanged.connect((sender, args) => {
      let mime = args.newValue;
      loadModeByMIME(this._editor, mime);
    });
    CodeMirror.on(this.editor, 'keydown', (instance, evt) => {
      if (this._handler) {
        this._handler(this, evt);
      }
    });
  }

  /**
   * Get the editor wrapped by the widget.
   *
   * #### Notes
   * This is a ready-only property.
   */
  get editor() {
    return this._editor;
  }

  /**
   * Dispose of the resources held by the widget.
   */
  dispose(): void {
    this._editor = null;
    this._isDisposed = true;
  }

  get isDisposed(): boolean {
    return this._isDisposed;
  }

  /**
   * A cursor position for this editor.
   */
  getPosition(): CodeEditor.IPosition {
    const cursor = this._editor.getDoc().getCursor();
    return {
        line: cursor.line,
        column: cursor.ch
    };
  }

  setPosition(position: CodeEditor.IPosition) {
    this._editor.getDoc().setCursor({
        line: position.line,
        ch: position.column
    });
  }

  /**
   * Brings browser focus to this editor text.
   */
  focus(): void {
    this._editor.focus();
  }

  /**
   * Test whether the editor has keyboard focus.
   */
  hasFocus(): boolean {
    return this._editor.hasFocus();
  }

  /**
   * Repaint editor.
   */
  refresh(): void {
    this._editor.refresh();
  }

  /**
   * Set the size of the editor in pixels.
   */
  setSize(width: number, height: number): void {
    // override css here
  }

  /**
   * Scroll the given cursor position into view.
   */
  scrollIntoView(pos: CodeEditor.IPosition, margin?: number): void {
    // set node scroll position here.
  }

  /**
   * Get the window coordinates given a cursor position.
   */
  getCoords(position: CodeEditor.IPosition): CodeEditor.ICoords {
    // more css measurements required
    return void 0;
  }

  /**
   * Returns a model for this editor.
   */
  get model(): CodeEditor.IModel {
    return this._model;
  }

  get onKeyDown(): CodeEditor.KeydownHandler | null {
    return this._handler;
  }
  set onKeyDown(value: CodeEditor.KeydownHandler | null) {
    this._handler = value;
  }

  /**
   * Get the text stored in this model.
   */
  getValue(): string {
    return this._editor.getDoc().getValue();
  }

  /**
   * Replace the entire text contained in this model.
   */
  setValue(value: string) {
    this._editor.getDoc().setValue(value);
  }

  /**
   * Get the number of lines in the model.
   */
  getLineCount(): number {
    return this._editor.getDoc().lineCount();
  }

  /**
   * Returns a last line number.
   */
  getLastLine(): number {
    return this._editor.getDoc().lastLine();
  }

  /**
   * Returns a content for the given line number.
   */
  getLineContent(line: number): string {
    return this._editor.getDoc().getLineHandle(line).text;
  }

  /**
   * Find an offset fot the given position.
   */
  getOffsetAt(position: CodeEditor.IPosition): number {
    const codeMirrorPosition = this.toCodeMirrorPosition(position);
    return this._editor.getDoc().indexFromPos(codeMirrorPosition);
  }

  /**
   * Find a position fot the given offset.
   */
  getPositionAt(offset: number): CodeEditor.IPosition {
    const position = this._editor.getDoc().posFromIndex(offset);
    return this.toPosition(position);
  }

  /**
   * Control the rendering of line numbers.
   */
  get lineNumbers(): boolean {
    return this._editor.getOption('lineNumbers');
  }

  set lineNumbers(value: boolean) {
    this._editor.setOption('lineNumbers', value);
  }

  get lineHeight(): number {
    // TODO css measurement
    return -1;
  }

  get charWidth(): number {
    // TODO css measurement
    return -1;
  }

  /**
   * Set to false for horizontal scrolling. Defaults to true.
   */
  get wordWrap(): boolean {
    return this._editor.getOption('wordWrap');
  }

  set wordWrap(value: boolean) {
    this._editor.setOption('wordWrap', value);
  }

  /**
   * Should the editor be read only.
   */
  get readOnly(): boolean {
    return this._editor.getOption('readOnly') === 'nocursor';
  }

  set readOnly(readOnly: boolean) {
    let option = readOnly ? 'nocursor' : false;
    this._editor.setOption('readOnly', option);
  }

  /**
   * Convert a code mirror position to an editor position.
   */
  protected toPosition(position: CodeMirror.Position) {
    return {
      line: position.line,
      column: position.ch
    };
  }

  /**
   * Convert an editor position to a code mirror position.
   */
  protected toCodeMirrorPosition(position: CodeEditor.IPosition) {
    return {
      line: position.line,
      ch: position.column
    };
  }

  private _model: CodeEditor.IModel = null;
  private _handler: CodeEditor.KeydownHandler | null = null;
  private _editor: CodeMirror.Editor = null;
  private _isDisposed = false;

}

export
class CodeMirrorEditorFactory implements IEditorFactory {

  /**
   * Create a new editor for inline code.
   */
  newInlineEditor(host: HTMLElement, option: CodeEditor.IOptions): CodeEditor.IEditor {
    let editor = new CodeMirrorEditor(host, {
      extraKeys: {
        'Tab': 'indentMore',
        'Shift-Enter': () => { /* no-op */ }
      },
      indentUnit: 4,
      theme: DEFAULT_CODEMIRROR_THEME,
      lineNumbers: true,
      lineWrapping: true,
    });
    // TODO configure inline editor
    return editor;
  }

  /**
   * Create a new editor for a full document.
   */
  newDocumentEditor(host: HTMLElement, options: CodeEditor.IOptions): CodeEditor.IEditor {
    let editor = new CodeMirrorEditor(host, {
      extraKeys: {
        'Tab': 'indentMore',
        'Shift-Enter': () => { /* no-op */ }
      },
      indentUnit: 4,
      theme: DEFAULT_CODEMIRROR_THEME,
      lineNumbers: true,
      lineWrapping: true,
    });
    return editor;
  }

}
