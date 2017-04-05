// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import * as CodeMirror
  from 'codemirror';

import {
  ArrayExt
} from '@phosphor/algorithm';

import {
  IDisposable, DisposableDelegate
} from '@phosphor/disposable';

import {
  Signal
} from '@phosphor/signaling';

import {
  CodeEditor
} from '@jupyterlab/codeeditor';

import {
  uuid
} from '@jupyterlab/coreutils';

import {
  IObservableString, ObservableString
} from '@jupyterlab/coreutils';

import {
  IObservableMap, ObservableMap
} from '@jupyterlab/coreutils';

import {
  loadModeByMIME
} from './mode';

import 'codemirror/addon/edit/matchbrackets.js';
import 'codemirror/addon/edit/closebrackets.js';
import 'codemirror/addon/comment/comment.js';
import 'codemirror/keymap/vim.js';


/**
 * The class name added to CodeMirrorWidget instances.
 */
const EDITOR_CLASS = 'jp-CodeMirrorWidget';

/**
 * The class name added to read only cell editor widgets.
 */
const READ_ONLY_CLASS = 'jp-mod-readOnly';

/**
 * The key code for the up arrow key.
 */
const UP_ARROW = 38;

/**
 * The key code for the down arrow key.
 */
const DOWN_ARROW = 40;


/**
 * CodeMirror editor.
 */
export
class CodeMirrorEditor implements CodeEditor.IEditor {
  /**
   * Construct a CodeMirror editor.
   */
  constructor(options: CodeEditor.IOptions, config: CodeMirror.EditorConfiguration={}) {
    let host = this.host = options.host;
    host.classList.add(EDITOR_CLASS);

    this._uuid = options.uuid || uuid();
    this._selectionStyle = options.selectionStyle || {};

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
    model.mimeTypeChanged.connect(this._onMimeTypeChanged, this);
    model.selections.changed.connect(this._onSelectionsChanged, this);

    CodeMirror.on(editor, 'keydown', (editor, event) => {
      let index = ArrayExt.findFirstIndex(this._keydownHandlers, handler => {
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
   * A signal emitted when either the top or bottom edge is requested.
   */
  readonly edgeRequested = new Signal<this, CodeEditor.EdgeLocation>(this);

  /**
   * The DOM node that hosts the editor.
   */
  readonly host: HTMLElement;

  /**
   * The uuid of this editor;
   */
  get uuid(): string {
    return this._uuid;
  }
  set uuid(value: string) {
    this._uuid = value;
  }

  /**
   * The selection style of this editor.
   */
  get selectionStyle(): CodeEditor.ISelectionStyle {
    return this._selectionStyle;
  }
  set selectionStyle(value: CodeEditor.ISelectionStyle) {
    this._selectionStyle = value;
  }

  /**
   * Get the codemirror editor wrapped by the editor.
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
    return this._editor.getOption('lineWrapping');
  }
  set wordWrap(value: boolean) {
    this._editor.setOption('lineWrapping', value);
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
      this.host.classList.add(READ_ONLY_CLASS);
    } else {
      this.host.classList.remove(READ_ONLY_CLASS);
      this.blur();
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
   * Tests whether the editor is disposed.
   */
  get isDisposed(): boolean {
    return this._editor === null;
  }

  /**
   * Dispose of the resources held by the widget.
   */
  dispose(): void {
    if (this._editor === null) {
      return;
    }
    this._editor = null;
    this._model = null;
    this._keydownHandlers.length = 0;
    Signal.clearData(this);
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
   * Explicitly blur the editor.
   */
  blur(): void {
    this._editor.getInputField().blur();
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
    this._keydownHandlers.push(handler);
    return new DisposableDelegate(() => {
      ArrayExt.removeAllWhere(this._keydownHandlers, val => val === handler);
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
    const cmPosition = this._toCodeMirrorPosition(position);
    this._editor.scrollIntoView(cmPosition);
  }

  /**
   * Reveal the given selection in the editor.
   */
  revealSelection(selection: CodeEditor.IRange): void {
    const range = this._toCodeMirrorRange(selection);
    this._editor.scrollIntoView(range);
  }

  /**
   * Get the window coordinates given a cursor position.
   */
  getCoordinateForPosition(position: CodeEditor.IPosition): CodeEditor.ICoordinate {
    const pos = this._toCodeMirrorPosition(position);
    const rect = this.editor.charCoords(pos, 'page');
    return rect as CodeEditor.ICoordinate;
  }

  /**
   * Get the cursor position given window coordinates.
   *
   * @param coordinate - The desired coordinate.
   *
   * @returns The position of the coordinates, or null if not
   *   contained in the editor.
   */
  getPositionForCoordinate(coordinate: CodeEditor.ICoordinate): CodeEditor.IPosition | null {
    return this._toPosition(this.editor.coordsChar(coordinate)) || null;
  }

  /**
   * Returns the primary position of the cursor, never `null`.
   */
  getCursorPosition(): CodeEditor.IPosition {
    const cursor = this.doc.getCursor();
    return this._toPosition(cursor);
  }

  /**
   * Set the primary position of the cursor.
   *
   * #### Notes
   * This will remove any secondary cursors.
   */
  setCursorPosition(position: CodeEditor.IPosition): void {
    const cursor = this._toCodeMirrorPosition(position);
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
      return selections.map(selection => this._toSelection(selection));
    }
    const cursor = this.doc.getCursor();
    const selection = this._toSelection({ anchor: cursor, head: cursor });
    return [selection];
  }

  /**
   * Sets the selections for all the cursors, should not be empty.
   * Cursors will be removed or added, as necessary.
   * Passing an empty array resets a cursor position to the start of a document.
   */
  setSelections(selections: CodeEditor.IRange[]): void {
    const cmSelections = this._toCodeMirrorSelections(selections);
    this.doc.setSelections(cmSelections, 0);
  }

  /**
   * Handle keydown events from the editor.
   */
  protected onKeydown(event: KeyboardEvent): boolean {
    let position = this.getCursorPosition();
    let { line, column } = position;

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
   * Converts selections to code mirror selections.
   */
  private _toCodeMirrorSelections(selections: CodeEditor.IRange[]): CodeMirror.Selection[] {
    if (selections.length > 0) {
      return selections.map(selection => this._toCodeMirrorSelection(selection));
    }
    const position = { line: 0, ch: 0 };
    return [{ anchor: position, head: position }];
  }

  /**
   * Handles a mime type change.
   */
  private _onMimeTypeChanged(): void {
    const mime = this._model.mimeType;
    let editor = this._editor;
    loadModeByMIME(editor, mime);
    let isCode = (mime !== 'text/plain') && (mime !== 'text/x-ipythongfm');
    editor.setOption('matchBrackets', isCode);
    editor.setOption('autoCloseBrackets', isCode);
    let extraKeys = editor.getOption('extraKeys') || {};
    if (isCode) {
      extraKeys['Backspace'] = 'delSpaceToPrevTabStop';
    } else {
      delete extraKeys['Backspace'];
    }
    editor.setOption('extraKeys', extraKeys);
  }

  /**
   * Handles a selections change.
   */
  private _onSelectionsChanged(selections: IObservableMap<CodeEditor.ITextSelection[]>, args: ObservableMap.IChangedArgs<CodeEditor.ITextSelection[]>): void {
    const uuid = args.key;
    if (uuid !== this.uuid) {
      this._cleanSelections(uuid);
      this._markSelections(uuid, args.newValue);
    }
  }

  /**
   * Clean selections for the given uuid.
   */
  private _cleanSelections(uuid: string) {
    const markers = this.selectionMarkers[uuid];
    if (markers) {
      markers.forEach(marker => { marker.clear(); });
    }
    delete this.selectionMarkers[uuid];
  }

  /**
   * Marks selections.
   */
  private _markSelections(uuid: string, selections: CodeEditor.ITextSelection[]) {
    const markers: CodeMirror.TextMarker[] = [];
    selections.forEach(selection => {
      const { anchor, head } = this._toCodeMirrorSelection(selection);
      const markerOptions = this._toTextMarkerOptions(selection);
      this.doc.markText(anchor, head, markerOptions);
    });
    this.selectionMarkers[uuid] = markers;
  }

  /**
   * Handles a cursor activity event.
   */
  private _onCursorActivity(): void {
    const selections = this.getSelections();
    this.model.selections.set(this.uuid, selections);
  }

  /**
   * Converts a code mirror selection to an editor selection.
   */
  private _toSelection(selection: CodeMirror.Selection): CodeEditor.ITextSelection {
    return {
      uuid: this.uuid,
      start: this._toPosition(selection.anchor),
      end: this._toPosition(selection.head),
      style: this.selectionStyle
    };
  }

  /**
   * Converts the selection style to a text marker options.
   */
  private _toTextMarkerOptions(style: CodeEditor.ISelectionStyle | undefined): CodeMirror.TextMarkerOptions | undefined {
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
  private _toCodeMirrorSelection(selection: CodeEditor.IRange): CodeMirror.Selection {
    return {
      anchor: this._toCodeMirrorPosition(selection.start),
      head: this._toCodeMirrorPosition(selection.end)
    };
  }

  /**
   * Converts an editor selection to a code mirror selection.
   */
  private _toCodeMirrorRange(range: CodeEditor.IRange): CodeMirror.Range {
    return {
      from: this._toCodeMirrorPosition(range.start),
      to: this._toCodeMirrorPosition(range.end)
    };
  }

  /**
   * Convert a code mirror position to an editor position.
   */
  private _toPosition(position: CodeMirror.Position) {
    return {
      line: position.line,
      column: position.ch
    };
  }

  /**
   * Convert an editor position to a code mirror position.
   */
  private _toCodeMirrorPosition(position: CodeEditor.IPosition) {
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
    this.doc.setValue(this._model.value.text);
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
    this._model.value.text = this.doc.getValue();
    this._changeGuard = false;
  }

  private _model: CodeEditor.IModel;
  private _editor: CodeMirror.Editor;
  protected selectionMarkers: { [key: string]: CodeMirror.TextMarker[] | undefined } = {};
  private _keydownHandlers = new Array<CodeEditor.KeydownHandler>();
  private _changeGuard = false;
  private _selectionStyle: CodeEditor.ISelectionStyle;
  private _uuid = '';
}


/**
 * The namespace for `CodeMirrorEditor` statics.
 */
export
namespace CodeMirrorEditor {
  /**
   * The name of the default CodeMirror theme
   */
  export
  const DEFAULT_THEME: string = 'jupyter';
}


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
    } else {
      config.readOnly = false;
    }
    if (options.lineNumbers !== undefined) {
      config.lineNumbers = options.lineNumbers;
    } else {
      config.lineNumbers = false;
    }
    if (options.wordWrap !== undefined) {
      config.lineWrapping = options.wordWrap;
    } else {
      config.lineWrapping = true;
    }
    config.theme = (config.theme || CodeMirrorEditor.DEFAULT_THEME);
    config.indentUnit = config.indentUnit || 4;
  }

  /**
   * Delete spaces to the previous tab stob in a codemirror editor.
   */
  export
  function delSpaceToPrevTabStop(cm: CodeMirror.Editor): void {
    let doc = cm.getDoc();
    let from = doc.getCursor('from');
    let to = doc.getCursor('to');
    let sel = !posEq(from, to);
    if (sel) {
      let ranges = doc.listSelections();
      for (let i = ranges.length - 1; i >= 0; i--) {
        let head = ranges[i].head;
        let anchor = ranges[i].anchor;
        doc.replaceRange('', CodeMirror.Pos(head.line, head.ch), CodeMirror.Pos(anchor.line, anchor.ch));
      }
      return;
    }
    let cur = doc.getCursor();
    let tabsize = cm.getOption('tabSize');
    let chToPrevTabStop = cur.ch - (Math.ceil(cur.ch / tabsize) - 1) * tabsize;
    from = {ch: cur.ch - chToPrevTabStop, line: cur.line};
    let select = doc.getRange(from, cur);
    if (select.match(/^\ +$/) !== null) {
      doc.replaceRange('', from, cur);
    } else {
      CodeMirror.commands['delCharBefore'](cm);
    }
  };

  /**
   * Test whether two CodeMirror positions are equal.
   */
  export
  function posEq(a: CodeMirror.Position, b: CodeMirror.Position): boolean {
    return a.line === b.line && a.ch === b.ch;
  };
}


/**
 * Add a CodeMirror command to delete until previous non blanking space
 * character or first multiple of 4 tabstop.
 */
CodeMirror.commands['delSpaceToPrevTabStop'] = Private.delSpaceToPrevTabStop;

