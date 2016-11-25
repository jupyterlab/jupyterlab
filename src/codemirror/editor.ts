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
  ObservableVector
} from '../common/observablevector';

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

  readonly uuid: string;
  // FIXME: implement sync with an editor state or better get rid of it
  readonly selections = new ObservableVector<CodeEditor.ITextSelection>();

  // FIXME: triggers on editor key down event
  onKeyDown: CodeEditor.KeydownHandler | null = null;

  /**
   * Construct a CodeMirror editor.
   */
  constructor(host: HTMLElement, options: CodeMirror.EditorConfiguration = {}) {
    host.classList.add(EDITOR_CLASS);
    this._model =  new CodeMirrorModel();
    options.theme = (options.theme || DEFAULT_CODEMIRROR_THEME);
    options.value = this._model.doc;
    this._editor = CodeMirror(host, options);
    this._model.mimeTypeChanged.connect((sender, args) => {
      let mime = args.newValue;
      loadModeByMIME(this._editor, mime);
    });
    this._model.owners.pushBack(this);
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

  get isDisposed() {
    return this._isDisposed;
  }

  /**
   * Dispose of the resources held by the widget.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this._isDisposed = true;
    this._editor = null;
  }

  /**
   * A cursor position for this editor.
   */
  getCursorPosition(): CodeEditor.IPosition {
    const cursor = this._editor.getDoc().getCursor();
    return {
        line: cursor.line,
        column: cursor.ch
    };
  }

  setCursorPosition(position: CodeEditor.IPosition) {
    this._editor.getDoc().setCursor({
        line: position.line,
        ch: position.column
    });
  }

  getSelection(): CodeEditor.ITextSelection | null {
    const selections = this._editor.getDoc().listSelections();
    if (selections.length === 0) {
      return null;
    }
    const selection = selections[0];
    return {
      start: this.model.getOffsetAt(this.toPosition(selection.anchor)),
      end: this.model.getOffsetAt(this.toPosition(selection.head))
    };
  }

  setSelection(selection: CodeEditor.ITextSelection | null) {
    if (selection) {
      const anchor = this.toCodeMirrorPosition(this.model.getPositionAt(selection.start));
      const head = this.toCodeMirrorPosition(this.model.getPositionAt(selection.end));
      this._editor.getDoc().setSelection(anchor, head);
    } else {
      const position = { ch: 0, line: 0 };
      this._editor.getDoc().setSelection(position, position);
    }
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

  protected _isDisposed = false;
  protected _model: CodeMirrorModel;
  protected _editor: CodeMirror.Editor;

}

export
class CodeMirrorEditorFactory implements IEditorFactory {

  /**
   * Create a new editor for inline code.
   */
  newInlineEditor(host: HTMLElement, options: CodeEditor.IOptions): CodeEditor.IEditor {
    let editor = new CodeMirrorEditor(host, {
      extraKeys: {
        'Tab': 'indentMore',
        'Shift-Enter': () => { /* no-op */ }
      },
      indentUnit: 4,
      theme: DEFAULT_CODEMIRROR_THEME,
      lineNumbers: options.lineNumbers || true,
      lineWrapping: options.wordWrap || true,
      readOnly: options.readOnly
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
      lineNumbers: options.lineNumbers || true,
      lineWrapping: options.wordWrap || true,
      readOnly: options.readOnly
    });
    return editor;
  }

}
