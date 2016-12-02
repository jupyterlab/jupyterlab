// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import * as CodeMirror
  from 'codemirror';

import {
  IChangedArgs
} from '../common/interfaces';

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
   * The selection style of this editor.
   */
  readonly selectionStyle?: CodeEditor.ISelectionStyle;

  /**
   * Handle keydown events for the editor.
   */
  onKeyDown: CodeEditor.KeydownHandler | null = null;

  /**
   * Construct a CodeMirror editor.
   */
  constructor(host: HTMLElement, options: CodeMirrorEditor.IOptions) {
    host.classList.add(EDITOR_CLASS);
    this.uuid = this.uuid;
    this.selectionStyle = this.selectionStyle;

    this._model = new CodeMirrorModel();

    options.theme = (options.theme || DEFAULT_CODEMIRROR_THEME);
    options.value = this._model.doc;
    this._editor = CodeMirror(host, options);

    this._model.mimeTypeChanged.connect((model, args) => this._onMimeTypeChanged(model, args));
    this._model.selections.changed.connect((selections, args) => this._onSelectionsChanged(selections, args));

    CodeMirror.on(this.editor, 'keydown', (editor, event) => this._onKeyDown(editor, event));
    CodeMirror.on(this.editor, 'cursorActivity', () => this._onCursorActivity());
  }

  /**
   * Tests whether the editor is disposed.
   */
  get isDisposed(): boolean {
    return this._isDisposed;
  }

  /**
   * Dispose of the resources held by the widget.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this._isDisposed = true;
    // FIXME: dispose selections
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
   * Control the rendering of line numbers.
   */
  get lineNumbers(): boolean {
    return this._editor.getOption('lineNumbers');
  }
  set lineNumbers(value: boolean) {
    this._editor.setOption('lineNumbers', value);
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
   * Returns a model for this editor.
   */
  get model(): CodeEditor.IModel {
    return this._model;
  }

  /**
   * The height of a line in the editor in pixels.
   */
  get lineHeight(): number {
    return this._editor.defaultTextHeight();
  }

  /**
   * The widget of a character in the editor in pixels.
   */
  get charWidth(): number {
    return this._editor.defaultCharWidth();
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
  revealSelection(selection: CodeEditor.IRange): void {
    const range = this.toCodeMirrorRange(selection);
    this._editor.scrollIntoView(range);
  }

  /**
   * Get the window coordinates given a cursor position.
   */
  getCoordinate(position: CodeEditor.IPosition): CodeEditor.ICoordinate {
    return this.editor.charCoords(this.toCodeMirrorPosition(position), 'page');
  }

  /**
   * Returns the primary position of the cursor, never `null`.
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
   * Returns the primary selection, never `null`.
   */
  getSelection(): CodeEditor.ITextSelection {
    return this.getSelections()[0];
  }

  /**
   * Set the primary selection. This will remove any secondary cursors.
   */
  setSelection(selection: CodeEditor.IRange): void {
    this.setSelections([selection]);
  }

  /**
   * Gets the selections for all the cursors, never `null` or empty.
   */
  getSelections(): CodeEditor.ITextSelection[] {
    const selections = this._model.doc.listSelections();
    if (selections.length > 0) {
      return this._model.doc.listSelections().map(selection => this.toSelection(selection));
    }
    const cursor = this._model.doc.getCursor();
    const selection = this.toSelection({ anchor: cursor, head: cursor });
    return [selection];
  }

  /**
   * Sets the selections for all the cursors, should not be empty.
   * Cursors will be removed or added, as necessary.
   * Passing an empty array resets a cursor position to the start of a document.
   */
  setSelections(selections: CodeEditor.IRange[]): void {
    const cmSelections = this.toCodeMirrorSelections(selections);
    this._model.doc.setSelections(cmSelections, 0);
  }

  /**
   * Converts selections to code mirror selections.
   */
  protected toCodeMirrorSelections(selections: CodeEditor.IRange[]): CodeMirror.Selection[] {
    if (selections.length > 0) {
      return selections.map(selection => this.toCodeMirrorSelection(selection));
    }
    const position = { line: 0, ch: 0 };
    return [{ anchor: position, head: position }];
  }

  /**
   * Handles a mime type change.
   */
  protected _onMimeTypeChanged(model: CodeMirrorModel, args: IChangedArgs<string>): void {
      const mime = args.newValue;
      loadModeByMIME(this._editor, mime);
  }

  /**
   * Handles a selections change.
   */
  protected _onSelectionsChanged(selections: CodeEditor.ISelections, args: CodeEditor.ISelections.IChangedArgs): void {
    const uuid = args.uuid;
    if (uuid !== this.uuid) {
      this.cleanSelections(uuid);
      this.markSelections(uuid, args.newSelections);
    }
  }

  /**
   * Clean selections for the given uuid.
   */
  protected cleanSelections(uuid: string) {
    const markers = this.selectionMarkers[uuid];
    if (markers) {
      markers.forEach(marker => marker.clear());
    }
    delete this.selectionMarkers[uuid];
  }

  /**
   * Marks selections.
   */
  protected markSelections(uuid: string, selections: CodeEditor.ITextSelection[]) {
    const markers: CodeMirror.TextMarker[] = [];
    for (const selection of selections) {
      const { anchor, head } = this.toCodeMirrorSelection(selection);
      const markerOptions = this.toTextMarkerOptions(selection);
      this._model.doc.markText(anchor, head, markerOptions);
    }
    this.selectionMarkers[uuid] = markers;
  }

  /**
   * Handles a key down event.
   */
  protected _onKeyDown(editor: CodeMirror.Editor, event: KeyboardEvent): void {
    if (this.onKeyDown && this.onKeyDown(this, event)) {
      event.preventDefault();
    }
  }

  /**
   * Handles a cursor activity event.
   */
  protected _onCursorActivity(): void {
    const selections = this.getSelections();
    this.model.selections.setSelections(this.uuid, selections);
  }

  /**
   * Converts a code mirror selectio to an editor selection.
   */
  protected toSelection(selection: CodeMirror.Selection): CodeEditor.ITextSelection {
    return {
      uuid: this.uuid,
      start: this.toPosition(selection.anchor),
      end: this.toPosition(selection.head),
      style: this.selectionStyle
    };
  }

  /**
   * Converts the selection style to a text marker options.
   */
  protected toTextMarkerOptions(style: CodeEditor.ISelectionStyle | undefined): CodeMirror.TextMarkerOptions | undefined {
    if (style) {
      return {
        className: style.className,
        title: style.displayName
      };
    }
    return undefined;
  }

  /**
   * Converts an editor selection to a code mirror selection.
   */
  protected toCodeMirrorSelection(selection: CodeEditor.IRange): CodeMirror.Selection {
    return {
      anchor: this.toCodeMirrorPosition(selection.start),
      head: this.toCodeMirrorPosition(selection.end)
    };
  }

  /**
   * Converts an editor selection to a code mirror selection.
   */
  protected toCodeMirrorRange(range: CodeEditor.IRange): CodeMirror.Range {
    return {
      from: this.toCodeMirrorPosition(range.start),
      to: this.toCodeMirrorPosition(range.end)
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
  private _editor: CodeMirror.Editor;
  private _isDisposed = false;
  protected selectionMarkers: { [key: string]: CodeMirror.TextMarker[] | undefined } = {};

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
    /**
     * The uuid of an editor.
     */
    readonly uuid: string;
    /**
     * A selection style.
     */
    readonly selectionStyle?: CodeEditor.ISelectionStyle;
  }
}
