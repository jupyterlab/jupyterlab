// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import * as CodeMirror
  from 'codemirror';

import {
  utils
} from '@jupyterlab/services';

import {
  findIndex
} from 'phosphor/lib/algorithm/searching';

import {
  IDisposable, DisposableDelegate
} from 'phosphor/lib/core/disposable';

import {
  clearSignalData, defineSignal, ISignal
} from 'phosphor/lib/core/signaling';

import {
  Vector
} from 'phosphor/lib/collections/vector';

import {
  IChangedArgs
} from '../common/interfaces';

import {
  IObservableString, ObservableString
} from '../common/observablestring';

import {
  loadModeByMIME
} from './';

import {
  CodeEditor
} from '../codeeditor';


/**
 * The class name added to CodeMirrorWidget instances.
 */
const EDITOR_CLASS = 'jp-CodeMirrorWidget';

/**
 * The class name added to read only cell editor widgets.
 */
const READ_ONLY_CLASS = 'jp-mod-readOnly';

/**
 * The name of the default CodeMirror theme
 */
export
const DEFAULT_CODEMIRROR_THEME: string = 'jupyter';

/**
 * The key code for the up arrow key.
 */
const UP_ARROW = 38;

/**
 * The key code for the down arrow key.
 */
const DOWN_ARROW = 40;

/**
 * The key code for the tab key.
 */
const TAB = 9;


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
   * A signal emitted when a text completion is requested.
   */
  readonly completionRequested: ISignal<this, CodeEditor.IPosition>;

  /**
   * A signal emitted when either the top or bottom edge is requested.
   */
  readonly edgeRequested: ISignal<this, CodeEditor.EdgeLocation>;

  /**
   * Construct a CodeMirror editor.
   */
  constructor(options: CodeEditor.IOptions, config: CodeMirror.EditorConfiguration) {
    let host = this._host = options.host;
    host.classList.add(EDITOR_CLASS);

    this.uuid = options.uuid || utils.uuid();
    this.selectionStyle = options.selectionStyle;

    Private.updateConfig(options, config);

    let model = this._model = options.model;
    let editor = this._editor = CodeMirror(host, config);
    let doc = editor.getDoc();

    // Handle initial values for text, mimetype, and selections.
    doc.setValue(model.value.text);
    this._onMimeTypeChanged();
    this._onCursorActivity();

    // Connect to changes.
    model.value.changed.connect(this._onValueChanged, this);
    model.mimeTypeChanged.connect(() => this._onMimeTypeChanged(), this);
    model.selections.changed.connect(this._onSelectionsChanged, this);

    CodeMirror.on(editor, 'keydown', (editor, event) => {
      let index = findIndex(this._keydownHandlers, handler => {
        if (handler(this, event) === true) {
          event.preventDefault();
          return true;
        }
      });
      if (index === -1) {
        this.onKeydown(event);
      }
    });
    CodeMirror.on(editor, 'cursorActivity', () => this._onCursorActivity());
    CodeMirror.on(editor.getDoc(), 'change', (instance, change) => {
      this._onDocChanged(instance, change);
    });
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
    this._model = null;
    this._editor = null;
    this._keydownHandlers.clear();
    clearSignalData(this);
  }

  /**
   * Get the editor wrapped by the widget.
   */
  get editor(): CodeMirror.Editor {
    return this._editor;
  }

  /**
   * Get the codemirror doc wrapped by the widget.
   */
  get doc(): CodeMirror.Doc {
    return this._editor.getDoc();
  }

  /**
   * Get the number of lines in the editor.
   */
  get lineCount(): number {
    return this.doc.lineCount();
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
    return this._editor.getOption('readOnly') !== false;
  }
  set readOnly(readOnly: boolean) {
    this._editor.setOption('readOnly', readOnly);
    if (readOnly) {
      this._host.classList.add(READ_ONLY_CLASS);
    } else {
      this._host.classList.remove(READ_ONLY_CLASS);
    }
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
   * Returns the content for the given line number.
   */
  getLine(line: number): string | undefined {
    return this.doc.getLine(line);
  }

  /**
   * Find an offset for the given position.
   */
  getOffsetAt(position: CodeEditor.IPosition): number {
    return this.doc.indexFromPos({
      ch: position.column,
      line: position.line
    });
  }

  /**
   * Find a position fot the given offset.
   */
  getPositionAt(offset: number): CodeEditor.IPosition {
    const { ch, line } = this.doc.posFromIndex(offset);
    return { line, column: ch };
  }

  /**
   * Undo one edit (if any undo events are stored).
   */
  undo(): void {
    this.doc.undo();
  }

  /**
   * Redo one undone edit.
   */
  redo(): void {
    this.doc.redo();
  }

  /**
   * Clear the undo history.
   */
  clearHistory(): void {
    this.doc.clearHistory();
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
   * Add a keydown handler to the editor.
   *
   * @param handler - A keydown handler.
   *
   * @returns A disposable that can be used to remove the handler.
   */
  addKeydownHandler(handler: CodeEditor.KeydownHandler): IDisposable {
    this._keydownHandlers.pushBack(handler);
    return new DisposableDelegate(() => {
      this._keydownHandlers.remove(handler);
    });
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
    const cursor = this.doc.getCursor();
    return this.toPosition(cursor);
  }

  /**
   * Set the primary position of the cursor. This will remove any secondary cursors.
   */
  setCursorPosition(position: CodeEditor.IPosition): void {
    const cursor = this.toCodeMirrorPosition(position);
    this.doc.setCursor(cursor);
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
    const selections = this.doc.listSelections();
    if (selections.length > 0) {
      return selections.map(selection => this.toSelection(selection));
    }
    const cursor = this.doc.getCursor();
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
    this.doc.setSelections(cmSelections, 0);
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
   * Handle keydown events from the editor.
   */
  protected onKeydown(event: KeyboardEvent): boolean {
    let position = this.getCursorPosition();
    let { line, column } = position;

    if (event.keyCode === TAB) {
      // If the tab is modified, ignore it.
      if (event.ctrlKey || event.shiftKey || event.altKey || event.metaKey) {
        return false;
      }
      this.onTabEvent(event, position);
      return false;
    }

    if (line === 0 && column === 0 && event.keyCode === UP_ARROW) {
      if (!event.shiftKey) {
        this.edgeRequested.emit('top');
      }
      return false;
    }

    let lastLine = this.lineCount - 1;
    let lastCh = this.getLine(lastLine).length;
    if (line === lastLine && column === lastCh
        && event.keyCode === DOWN_ARROW) {
      if (!event.shiftKey) {
        this.edgeRequested.emit('bottom');
      }
      return false;
    }
    return false;
  }

  /**
   * Handle a tab key press.
   */
  protected onTabEvent(event: KeyboardEvent, position: CodeEditor.IPosition): void {
    // If there is a text selection, no completion requests should be emitted.
    const selection = this.getSelection();
    if (selection.start === selection.end) {
      return;
    }

    let currentLine = this.getLine(position.line);

    // A completion request signal should only be emitted if the current
    // character or a preceding character is not whitespace.
    //
    // Otherwise, the default tab action of creating a tab character should be
    // allowed to propagate.
    if (!currentLine.substring(0, position.column).match(/\S/)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    this.completionRequested.emit(position);
  }

  /**
   * Handles a mime type change.
   */
  protected _onMimeTypeChanged(): void {
    const mime = this._model.mimeType;
    loadModeByMIME(this._editor, mime);
    let isCode = (mime !== 'text/plain') && (mime !== 'text/x-ipythongfm');
    this.editor.setOption('matchBrackets', isCode);
    this.editor.setOption('autoCloseBrackets', isCode);
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
      this.doc.markText(anchor, head, markerOptions);
    }
    this.selectionMarkers[uuid] = markers;
  }

  /**
   * Handles a cursor activity event.
   */
  protected _onCursorActivity(): void {
    const selections = this.getSelections();
    this.model.selections.setSelections(this.uuid, selections);
  }

  /**
   * Converts a code mirror selection to an editor selection.
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

  /**
   * Handle model value changes.
   */
  private _onValueChanged(value: IObservableString, args: ObservableString.IChangedArgs): void {
    if (this._changeGuard) {
      return;
    }
    this._changeGuard = true;
    let doc = this.doc;
    switch (args.type) {
    case 'insert':
      let pos = doc.posFromIndex(args.start);
      doc.replaceRange(args.value, pos, pos);
      break;
    case 'remove':
      let from = doc.posFromIndex(args.start);
      let to = doc.posFromIndex(args.end);
      doc.replaceRange('', from, to);
      break;
    case 'set':
      doc.setValue(args.value);
      break;
    default:
      break;
    }
    this._changeGuard = false;
  }

  /**
   * Handles document changes.
   */
  private _onDocChanged(doc: CodeMirror.Doc, change: CodeMirror.EditorChange) {
    if (this._changeGuard) {
      return;
    }
    this._changeGuard = true;

    let value = this._model.value;
    let start = doc.indexFromPos(change.from);
    let inserted = change.text.join('\n');
    let removed = change.removed.join('\n');

    if (removed) {
      value.remove(start, start + removed.length);
    }
    if (inserted) {
      value.insert(start, inserted);
    }

    this._changeGuard = false;
  }

  private _model: CodeEditor.IModel;
  private _editor: CodeMirror.Editor;
  private _isDisposed = false;
  protected selectionMarkers: { [key: string]: CodeMirror.TextMarker[] | undefined } = {};
  private _keydownHandlers = new Vector<CodeEditor.KeydownHandler>();
  private _changeGuard = false;
  private _host: HTMLElement;
}


// Define the signals for the `CodeMirrorEditor` class.
defineSignal(CodeMirrorEditor.prototype, 'completionRequested');
defineSignal(CodeMirrorEditor.prototype, 'edgeRequested');


/**
 * The namespace for module private data.
 */
namespace Private {
  /**
   * Handle extra codemirror config from codeeditor options.
   */
  export
  function updateConfig(options: CodeEditor.IOptions, config: CodeMirror.EditorConfiguration): void {
    if (options.readOnly !== undefined) {
      config.readOnly = options.readOnly;
    }
    if (options.lineNumbers !== undefined) {
      config.lineNumbers = options.lineNumbers;
    }
    if (options.wordWrap !== undefined) {
      config.lineWrapping = options.wordWrap;
    }
    config.theme = (config.theme || DEFAULT_CODEMIRROR_THEME);
    config.indentUnit = config.indentUnit || 4;
  }
}
