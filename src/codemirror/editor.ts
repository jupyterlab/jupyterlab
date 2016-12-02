// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import * as CodeMirror
  from 'codemirror';

import {
  loadModeByMIME
} from './';

import {
  CodeEditor
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
   * The uuid of this editor; 
   */
  readonly uuid: string;

  /**
   * Construct a CodeMirror editor.
   */
  constructor(host: HTMLElement, options: CodeMirrorEditor.IOptions) {
    host.classList.add(EDITOR_CLASS);
    this.uuid = this.uuid;
    this._model = new CodeMirrorModel();
    options.theme = (options.theme || DEFAULT_CODEMIRROR_THEME);
    options.value = this._model.doc;
    this._editor = CodeMirror(host, options);
    this._model.mimeTypeChanged.connect((sender, args) => {
      let mime = args.newValue;
      loadModeByMIME(this._editor, mime);
    });
    CodeMirror.on(this.editor, 'keydown', (instance, evt) => {
      if (this._handler && this._handler(this, evt)) {
        evt.preventDefault();
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
  setSize(dimension: CodeEditor.IDimension | null): void {
    if (dimension) {
      this._editor.setSize(dimension.width, dimension.height);
    } else {
      this._editor.setSize(null, null);
    }
  }

  /**
   * Reveal the given position in the editor.
   */
  revealPosition(position: CodeEditor.IPosition): void {
    const cmPosition = this.toCodeMirrorPosition(position);
    this._editor.scrollIntoView(cmPosition);
  }

  /**
   * Reveal the given selection in the editor.
   */
  revealSelection(selection: CodeEditor.ITextSelection): void {
    const range = this.toCodeMirrorRange(selection);
    this._editor.scrollIntoView(range);
  }

  /**
   * Get the window coordinates given a cursor position.
   */
  getCoords(position: CodeEditor.IPosition): CodeEditor.ICoords {
    // FIXME: more css measurements required
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
   * Returns the primary position of the cursor.
   */
  getCursorPosition(): CodeEditor.IPosition {
    const cursor = this._model.doc.getCursor();
    return this.toPosition(cursor);
  }

  /**
   * Set the primary position of the cursor. This will remove any secondary cursors.
   */
  setCursorPosition(position: CodeEditor.IPosition): void {
    const cursor = this.toCodeMirrorPosition(position);
    this._model.doc.setCursor(cursor);
  }

  /**
   * Returns the primary selection.
   */
  getSelection(): CodeEditor.ITextSelection {
    const selection = this._model.doc.listSelections()[0];
    return this.toSelection(selection);
  }

  /**
   * Set the primary selection. This will remove any secondary cursors.
   */
  setSelection(selection: CodeEditor.ITextSelection): void {
    const cmSelection = this.toCodeMirrorSelection(selection);
    this._model.doc.setSelection(cmSelection.anchor, cmSelection.head);
  }

  /**
   * Gets the selections for all the cursors.
   */
  getSelections(): CodeEditor.ITextSelection[] {
    return this._model.doc.listSelections().map(selection => this.toSelection(selection));
  }

  /**
   * Sets the selections for all the cursors.
   * Cursors will be removed or added, as necessary.
   */
  setSelections(selections: CodeEditor.ITextSelection[]): void {
    const cmSelections = selections.map(selection => this.toCodeMirrorSelection(selection));
    this._model.doc.setSelections(cmSelections, 0);
  }

  /**
   * Converts a code mirror selectio to an editor selection.
   */
  protected toSelection(selection: CodeMirror.Selection) {
    return {
      uuid: this.uuid,
      start: this.toPosition(selection.anchor),
      end: this.toPosition(selection.head)
    };
  }

  /**
   * Converts an editor selection to a code mirror selection.
   */
  protected toCodeMirrorSelection(selection: CodeEditor.ITextSelection): CodeMirror.Selection {
    return {
      anchor: this.toCodeMirrorPosition(selection.start),
      head: this.toCodeMirrorPosition(selection.end)
    };
  }

  /**
   * Converts an editor selection to a code mirror selection.
   */
  protected toCodeMirrorRange(selection: CodeEditor.ITextSelection): CodeMirror.Range {
    return {
      from: this.toCodeMirrorPosition(selection.start),
      to: this.toCodeMirrorPosition(selection.end)
    };
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

  private _model: CodeMirrorModel;
  private _handler: CodeEditor.KeydownHandler | null = null;
  private _editor: CodeMirror.Editor;
  private _isDisposed = false;

}

/**
 * A namespace for `CodeMirrorEditor`.
 */
export
namespace CodeMirrorEditor {
  /**
   * An initialization options for a code mirror editor.
   */
  export
  interface IOptions extends CodeMirror.EditorConfiguration {
    readonly uuid: string;
  }
}
