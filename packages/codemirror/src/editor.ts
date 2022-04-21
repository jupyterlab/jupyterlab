/* eslint-disable @typescript-eslint/ban-types */
// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
// / <reference types="codemirror"/>
// / <reference types="codemirror/searchcursor"/>

import { showDialog } from '@jupyterlab/apputils';
import { CodeEditor } from '@jupyterlab/codeeditor';
import {
  /*ICollaborator,*/
  IObservableMap,
  IObservableString
} from '@jupyterlab/observables';
import * as models from '@jupyterlab/shared-models';
import {
  ITranslator,
  nullTranslator,
  TranslationBundle
} from '@jupyterlab/translation';
import { ArrayExt } from '@lumino/algorithm';
import { /*JSONExt,*/ UUID } from '@lumino/coreutils';
import { DisposableDelegate, IDisposable } from '@lumino/disposable';
import { Poll } from '@lumino/polling';
import { Signal } from '@lumino/signaling';

import {
  indentMore,
  insertNewlineAndIndent,
  insertTab
} from '@codemirror/commands';
import { getIndentUnit } from '@codemirror/language';
import {
  EditorSelection,
  EditorState,
  Extension,
  StateCommand,
  Transaction
} from '@codemirror/state';
import { Text } from '@codemirror/text';
import { Command, EditorView, KeyBinding, keymap } from '@codemirror/view';
import * as Y from 'yjs';
import { yCollab } from 'y-codemirror.next';
import { Awareness } from 'y-protocols/awareness';
import { Mode } from './mode';
import { Configuration } from './editorconfiguration';
import './codemirror-ipython';
import './codemirror-ipythongfm';
/*import CodeMirror from 'codemirror';
import 'codemirror/addon/comment/comment.js';
import 'codemirror/addon/display/rulers.js';
import 'codemirror/addon/edit/closebrackets.js';
import 'codemirror/addon/edit/matchbrackets.js';
import 'codemirror/addon/fold/brace-fold.js';
import 'codemirror/addon/fold/comment-fold.js';
import 'codemirror/addon/fold/foldcode.js';
import 'codemirror/addon/fold/foldgutter.js';
import 'codemirror/addon/fold/indent-fold.js';
import 'codemirror/addon/fold/markdown-fold.js';
import 'codemirror/addon/fold/xml-fold.js';
import 'codemirror/addon/mode/simple';
import 'codemirror/addon/scroll/scrollpastend.js';
import 'codemirror/addon/search/jump-to-line';
import 'codemirror/addon/search/search';
import 'codemirror/addon/search/searchcursor';
import 'codemirror/addon/selection/active-line';
import 'codemirror/addon/selection/mark-selection';
import 'codemirror/addon/selection/selection-pointer';
import 'codemirror/addon/edit/trailingspace.js';
import 'codemirror/keymap/emacs.js';
import 'codemirror/keymap/sublime.js';
import { CodemirrorBinding } from 'y-codemirror';

// import 'codemirror/keymap/vim.js';  lazy loading of vim mode is available in ../codemirror-extension/index.ts

/**
 * The class name added to CodeMirrorWidget instances.
 */
const EDITOR_CLASS = 'jp-CodeMirrorEditor';

/**
 * The class name added to read only cell editor widgets.
 */
//const READ_ONLY_CLASS = 'jp-mod-readOnly';

/**
 * The class name for the hover box for collaborator cursors.
 */
//const COLLABORATOR_CURSOR_CLASS = 'jp-CollaboratorCursor';

/**
 * The class name for the hover box for collaborator cursors.
 */
//const COLLABORATOR_HOVER_CLASS = 'jp-CollaboratorCursor-hover';

/**
 * The key code for the up arrow key.
 */
const UP_ARROW = 38;

/**
 * The key code for the down arrow key.
 */
const DOWN_ARROW = 40;

/**
 * The time that a collaborator name hover persists.
 */
//const HOVER_TIMEOUT = 1000;

// @todo Remove the duality of having a modeldb and a y-codemirror
// binding as it just introduces a lot of additional complexity without gaining anything.
const USE_YCODEMIRROR_BINDING = true;

interface IYCodeMirrorBinding {
  text: Y.Text;
  // TODO: remove | null when we remove shareModel
  awareness: Awareness | null;
}

/**
 * CodeMirror editor.
 */
export class CodeMirrorEditor implements CodeEditor.IEditor {
  /**
   * Construct a CodeMirror editor.
   */
  constructor(options: CodeMirrorEditor.IOptions) {
    this._editorConfig = new Configuration.EditorConfiguration();
    const host = (this.host = options.host);
    this.translator = options.translator || nullTranslator;
    this._trans = this.translator.load('jupyterlab');

    host.classList.add(EDITOR_CLASS);
    host.classList.add('jp-Editor');
    host.addEventListener('focus', this, true);
    host.addEventListener('blur', this, true);
    host.addEventListener('scroll', this, true);

    this._uuid = options.uuid || UUID.uuid4();

    // Handle selection style.
    const style = options.selectionStyle || {};
    this._selectionStyle = {
      ...CodeEditor.defaultSelectionStyle,
      ...(style as CodeEditor.ISelectionStyle)
    };

    const model = (this._model = options.model);
    const config = options.config || {};
    const fullConfig = (this._config = {
      ...CodeMirrorEditor.defaultConfig,
      ...config
    });

    // TODO: refactor this when we decide to ALWAYS use YJS. Different parts of the
    // editor should be created alltogether.
    this._initializeEditorBinding();

    const editor = (this._editor = Private.createEditor(
      host,
      fullConfig,
      this._yeditorBinding,
      this._editorConfig
    ));

    // every time the model is switched, we need to re-initialize the editor binding
    this.model.sharedModelSwitched.connect(this._initializeEditorBinding, this);

    // Handle initial values for text, mimetype, and selections.
    if (!USE_YCODEMIRROR_BINDING) {
      this.editor.dispatch({
        changes: {
          from: 0,
          to: this.editor.state.doc.length,
          insert: model.value.text
        }
      });
    }
    this._onMimeTypeChanged();
    this._onCursorActivity();
    this._poll = new Poll({
      factory: async () => {
        this._checkSync();
      },
      frequency: { interval: 3000, backoff: false },
      standby: () => {
        // If changed, only stand by when hidden, otherwise always stand by.
        return this._lastChange ? 'when-hidden' : true;
      }
    });

    // Connect to changes.
    if (!USE_YCODEMIRROR_BINDING) {
      model.value.changed.connect(this._onValueChanged, this);
    }
    model.mimeTypeChanged.connect(this._onMimeTypeChanged, this);
    model.selections.changed.connect(this._onSelectionsChanged, this);

    // TODO: CM6 migration
    /*CodeMirror.on(editor, 'keydown', (editor: CodeMirror.Editor, event) => {
      const index = ArrayExt.findFirstIndex(this._keydownHandlers, handler => {
        if (handler(this, event) === true) {
          event.preventDefault();
          return true;
        }
        return false;
      });
      if (index === -1) {
        this.onKeydown(event);
      }
    });

    if (USE_YCODEMIRROR_BINDING) {
      this._yeditorBinding?.on('cursorActivity', () =>
        this._onCursorActivity()
      );
    } else {
      CodeMirror.on(editor, 'cursorActivity', () => this._onCursorActivity());
      CodeMirror.on(editor.getDoc(), 'beforeChange', (instance, change) => {
        this._beforeDocChanged(instance, change);
      });
    }
    CodeMirror.on(editor.getDoc(), 'change', (instance, change) => {
      // Manually refresh after setValue to make sure editor is properly sized.
      if (change.origin === 'setValue' && this.hasFocus()) {
        this.refresh();
      }
      this._lastChange = change;
    });

    // Turn off paste handling in codemirror since sometimes we want to
    // replace it with our own.
    editor.on('paste', (instance: CodeMirror.Editor, event: any) => {
      const handlePaste = this._config['handlePaste'] ?? true;
      if (!handlePaste) {
        event.codemirrorIgnore = true;
      }
    });*/

    // Manually refresh on paste to make sure editor is properly sized.
    editor.dom.addEventListener('paste', () => {
      if (this.hasFocus()) {
        this.refresh();
      }
    });
  }

  /**
   * Initialize the editor binding.
   */
  private _initializeEditorBinding(): void {
    if (!USE_YCODEMIRROR_BINDING) {
      return;
    }
    const sharedModel = this.model.sharedModel as models.IYText;
    this._yeditorBinding = {
      text: sharedModel.ysource,
      awareness: sharedModel.awareness
    };
    // TODO: CM6 migration
    /*this._yeditorBinding?.destroy();
    const opts = sharedModel.undoManager
      ? { yUndoManager: sharedModel.undoManager }
      : {};
    const awareness = sharedModel.awareness;
    this._yeditorBinding = new CodemirrorBinding(
      sharedModel.ysource,
      this.editor,
      awareness,
      opts
    );*/
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
  get editor(): EditorView {
    return this._editor;
  }

  /**
   * Get the codemirror doc wrapped by the widget.
   */
  get doc(): Text {
    return this._editor.state.doc;
  }

  /**
   * Get the number of lines in the editor.
   */
  get lineCount(): number {
    return this.doc.lines;
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
    return this._editor.defaultLineHeight;
  }

  /**
   * The widget of a character in the editor in pixels.
   */
  get charWidth(): number {
    return this._editor.defaultCharacterWidth;
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
    if (this.isDisposed) {
      return;
    }
    this._isDisposed = true;
    this.host.removeEventListener('focus', this, true);
    this.host.removeEventListener('blur', this, true);
    this.host.removeEventListener('scroll', this, true);
    /*if (this._yeditorBinding) {
      this._yeditorBinding.destroy();
    }*/
    this._keydownHandlers.length = 0;
    this._poll.dispose();
    Signal.clearData(this);
    this.editor.destroy();
  }

  /**
   * Get a config option for the editor.
   */
  getOption<K extends keyof CodeMirrorEditor.IConfig>(
    option: K
  ): CodeMirrorEditor.IConfig[K] {
    return this._config[option];
  }

  /**
   * Set a config option for the editor.
   */
  setOption<K extends keyof CodeMirrorEditor.IConfig>(
    option: K,
    value: CodeMirrorEditor.IConfig[K]
  ): void {
    // Don't bother setting the option if it is already the same.
    if (this._config[option] !== value) {
      this._config[option] = value;
      this._editorConfig.reconfigureExtension(this._editor, option, value);
    }
  }

  /**
   * Set config options for the editor.
   *
   * This method is preferred when setting several options. The
   * options are set within an operation, which only performs
   * the costly update at the end, and not after every option
   * is set.
   */
  setOptions(options: Partial<CodeMirrorEditor.IConfig>): void {
    this._config = { ...this._config, ...options };
    this._editorConfig.reconfigureExtensions(this._editor, options);
  }

  injectExtension(ext: Extension): void {
    this._editorConfig.injectExtension(this._editor, ext);
  }

  /**
   * Returns the content for the given line number.
   */
  getLine(line: number): string | undefined {
    // TODO: CM6 remove +1 when CM6 first line number has propagated
    return this.doc.line(line + 1).text;
  }

  /**
   * Find an offset for the given position.
   */
  getOffsetAt(position: CodeEditor.IPosition): number {
    // TODO: CM6 remove +1 when CM6 first line number has propagated
    return this.doc.line(position.line + 1).from + position.column;
  }

  /**
   * Find a position for the given offset.
   */
  getPositionAt(offset: number): CodeEditor.IPosition {
    // TODO: CM6 remove -1 when CM6 first line number has propagated
    const line = this.doc.lineAt(offset);
    return { line: line.number - 1, column: offset - line.from };
  }

  /**
   * Undo one edit (if any undo events are stored).
   */
  undo(): void {
    this.model.sharedModel.undo();
  }

  /**
   * Redo one undone edit.
   */
  redo(): void {
    this.model.sharedModel.redo();
  }

  /**
   * Clear the undo history.
   */
  clearHistory(): void {
    //TODO
    //this._yeditorBinding?.yUndoManager?.clear();
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
    return this._editor.dom.contains(document.activeElement);
    //return this._editor.getWrapperElement().contains(document.activeElement);
  }

  /**
   * Explicitly blur the editor.
   */
  blur(): void {
    this._editor.contentDOM.blur();
    //this._editor.getInputField().blur();
  }

  /**
   * Repaint editor.
   */
  refresh(): void {
    //this._editor.refresh();
    this._needsRefresh = false;
  }

  /**
   * Refresh the editor if it is focused;
   * otherwise postpone refreshing till focusing.
   */
  resizeToFit(): void {
    if (this.hasFocus()) {
      this.refresh();
    } else {
      this._needsRefresh = true;
    }
    this._clearHover();
  }

  // todo: docs, maybe define overlay options as a type?
  addOverlay(mode: string | object, options?: object): void {
    // TODO: CM6 migration
    //this._editor.addOverlay(mode, options);
  }

  removeOverlay(mode: string | object): void {
    // TODO: CM6 migration
    //this._editor.removeOverlay(mode);
  }

  // TODO: CM6 migration
  /*getSearchCursor(
    query: string | RegExp,
    start?: CodeMirror.Position,
    caseFold?: boolean
  ): CodeMirror.SearchCursor {
    return this._editor.getDoc().getSearchCursor(query, start, caseFold);
  }

  getCursor(start?: string): CodeMirror.Position {
    return this._editor.getDoc().getCursor(start);
  }*/

  get state(): EditorState {
    return this._editor.state;
  }

  // TODO: CM6 migration
  /*operation<T>(fn: () => T): T {
    return this._editor.operation(fn);
  }*/

  firstLine(): number {
    // TODO: return 1 when CM6 first line number has propagated
    return 0;
  }

  lastLine(): number {
    return this.doc.lines - 1;
  }

  // TODO: CM6 migration (see scrollTo)
  /*scrollIntoView(
    pos: { from: CodeMirror.Position; to: CodeMirror.Position },
    margin: number
  ): void {
    this._editor.scrollIntoView(pos, margin);
  }

  scrollIntoViewCentered(pos: CodeMirror.Position): void {
    const top = this._editor.charCoords(pos, 'local').top;
    const height = this._editor.getWrapperElement().offsetHeight;
    this.host.scrollIntoView?.({
      behavior: 'auto',
      block: 'center',
      inline: 'center'
    });
    this._editor.scrollTo(null, top - height / 2);
  }*/

  cursorCoords(
    where: boolean,
    mode?: 'window' | 'page' | 'local'
  ): { left: number; top: number; bottom: number } {
    const selection = this.state.selection.main;
    const pos = where ? selection.from : selection.to;
    const rect = this.editor.coordsAtPos(pos);
    return rect as { left: number; top: number; bottom: number };
    //return this._editor.cursorCoords(where, mode);
  }

  getRange(
    from: { line: number; ch: number },
    to: { line: number; ch: number },
    separator?: string
  ): string {
    const from_offset = this.getOffsetAt(this._toPosition(from));
    const to_offset = this.getOffsetAt(this._toPosition(to));
    return this.state.sliceDoc(from_offset, to_offset);
    //return this._editor.getDoc().getRange(from, to, separator);
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
    // TODO: CM6
    /*if (dimension) {
      this._editor.setSize(dimension.width, dimension.height);
    } else {
      this._editor.setSize(null, null);
    }*/
    this._needsRefresh = false;
  }

  /**
   * Reveal the given position in the editor.
   */
  revealPosition(position: CodeEditor.IPosition): void {
    // TODO: CM6
    //const cmPosition = this._toCodeMirrorPosition(position);
    //this._editor.scrollIntoView(cmPosition);
  }

  /**
   * Reveal the given selection in the editor.
   */
  revealSelection(selection: CodeEditor.IRange): void {
    // TODO: CM6
    /*const range = {
      from: this._toCodeMirrorPosition(selection.start),
      to: this._toCodeMirrorPosition(selection.end)
    };
    this._editor.scrollIntoView(range);*/
  }

  /**
   * Get the window coordinates given a cursor position.
   */
  getCoordinateForPosition(
    position: CodeEditor.IPosition
  ): CodeEditor.ICoordinate {
    const offset = this.getOffsetAt(position);
    const rect = this.editor.coordsAtPos(offset);
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
  getPositionForCoordinate(
    coordinate: CodeEditor.ICoordinate
  ): CodeEditor.IPosition | null {
    const offset = this.editor.posAtCoords({
      x: coordinate.left,
      y: coordinate.top
    });
    return this.getPositionAt(offset!) || null;
  }

  /**
   * Returns the primary position of the cursor, never `null`.
   */
  getCursorPosition(): CodeEditor.IPosition {
    const offset = this.state.selection.main.head;
    return this.getPositionAt(offset);
  }

  /**
   * Set the primary position of the cursor.
   *
   * #### Notes
   * This will remove any secondary cursors.
   */
  setCursorPosition(
    position: CodeEditor.IPosition,
    options?: { bias?: number; origin?: string; scroll?: boolean }
  ): void {
    const offset = this.getOffsetAt(position);
    this.editor.dispatch({ selection: { anchor: offset } });
    // If the editor does not have focus, this cursor change
    // will get screened out in _onCursorsChanged(). Make an
    // exception for this method.
    if (!this.editor.hasFocus) {
      this.model.selections.set(this.uuid, this.getSelections());
    }
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
    //const selections = this.doc.listSelections();
    const selections = this.state.selection.ranges; //= [{anchor: number, head: number}]
    if (selections.length > 0) {
      const sel = selections.map(r => ({
        anchor: this._toCodeMirrorPosition(this.getPositionAt(r.from)),
        head: this._toCodeMirrorPosition(this.getPositionAt(r.to))
      }));
      return sel.map(selection => this._toSelection(selection));
      //return selections.map(selection => this._toSelection(selection));
    }
    const cursor = this._toCodeMirrorPosition(
      this.getPositionAt(this.state.selection.main.head)
    );
    //const cursor = this.doc.getCursor();
    const selection = this._toSelection({ anchor: cursor, head: cursor });
    return [selection];
  }

  /**
   * Sets the selections for all the cursors, should not be empty.
   * Cursors will be removed or added, as necessary.
   * Passing an empty array resets a cursor position to the start of a document.
   */
  setSelections(selections: CodeEditor.IRange[]): void {
    const sel = selections.map(r =>
      EditorSelection.range(this.getOffsetAt(r.start), this.getOffsetAt(r.end))
    );
    this.editor.dispatch({ selection: EditorSelection.create(sel) });
  }

  /**
   * Replaces the current selection with the given text.
   *
   * @param text The text to be inserted.
   */
  replaceSelection(text: string): void {
    this.editor.dispatch(this.state.replaceSelection(text));
  }

  /**
   * Get a list of tokens for the current editor text content.
   */
  // TODO: CM6
  /*getTokens(): CodeEditor.IToken[] {
    let tokens: CodeEditor.IToken[] = [];
    for (let i = 0; i < this.lineCount; ++i) {
      const lineTokens = this.editor.getLineTokens(i).map(t => ({
        offset: this.getOffsetAt({ column: t.start, line: i }),
        value: t.string,
        type: t.type || ''
      }));
      tokens = tokens.concat(lineTokens);
    }
    return tokens;
  }*/

  /**
   * Get the token at a given editor position.
   */
  // TODO: CM6
  /*getTokenForPosition(position: CodeEditor.IPosition): CodeEditor.IToken {
    const cursor = this._toCodeMirrorPosition(position);
    const token = this.editor.getTokenAt(cursor);
    return {
      offset: this.getOffsetAt({ column: token.start, line: cursor.line }),
      value: token.string,
      type: token.type ?? undefined
    };
  }*/

  /**
   * Insert a new indented line at the current cursor position.
   */
  newIndentedLine(): void {
    insertNewlineAndIndent({
      state: this.state,
      dispatch: this.editor.dispatch
    });
    //this.execCommand('newlineAndIndent');
  }

  /**
   * Execute a codemirror command on the editor.
   *
   * @param command - The name of the command to execute.
   */
  execCommand(command: Command | StateCommand): void {
    command(this.editor);
  }
  /*execCommand(command: string): void {
    this._editor.execCommand(command);
  }*/

  /**
   * Handle keydown events from the editor.
   */
  protected onKeydown(event: KeyboardEvent): boolean {
    const position = this.getCursorPosition();
    const { line, column } = position;

    if (line === 0 && column === 0 && event.keyCode === UP_ARROW) {
      if (!event.shiftKey) {
        this.edgeRequested.emit('top');
      }
      return false;
    }

    if (line === 0 && event.keyCode === UP_ARROW) {
      if (!event.shiftKey) {
        this.edgeRequested.emit('topLine');
      }
      return false;
    }

    const lastLine = this.lineCount - 1;
    const lastCh = this.getLine(lastLine)!.length;
    if (
      line === lastLine &&
      column === lastCh &&
      event.keyCode === DOWN_ARROW
    ) {
      if (!event.shiftKey) {
        this.edgeRequested.emit('bottom');
      }
      return false;
    }
    return false;
  }

  /**
   * Handles a mime type change.
   */
  private _onMimeTypeChanged(): void {
    const mime = this._model.mimeType;
    const keybindings = this._editor.state.facet<KeyBinding[]>(keymap);
    const isCode = mime !== 'text/plain' && mime !== 'text/x-ipythongfm';
    if (isCode) {
      keybindings.push({
        key: 'Backspace',
        run: CodeMirrorEditor.delSpaceToPrevTabStop
      });
    } else {
      keybindings.splice(
        keybindings.findIndex(el => {
          return el.key === 'Backspace';
        }),
        1
      );
    }
    this._editorConfig.reconfigureExtension(
      this._editor,
      'keymap',
      keybindings
    );

    // TODO: should we provide a hook for when the mode is done being set?
    void Mode.ensure(mime).then(spec => {
      if (spec) {
        this._editorConfig.reconfigureExtension(
          this._editor,
          'language',
          spec.support!
        );
      }
    });
  }

  /**
   * Handles a selections change.
   */
  private _onSelectionsChanged(
    selections: IObservableMap<CodeEditor.ITextSelection[]>,
    args: IObservableMap.IChangedArgs<CodeEditor.ITextSelection[]>
  ): void {
    const uuid = args.key;
    if (uuid !== this.uuid) {
      this._cleanSelections(uuid);
      if (args.type !== 'remove' && args.newValue) {
        this._markSelections(uuid, args.newValue);
      }
    }
  }

  /**
   * Clean selections for the given uuid.
   */
  // TODO: CM6 migration see Mark Text section of the migration guide
  private _cleanSelections(uuid: string) {
    /*const markers = this.selectionMarkers[uuid];
    if (markers) {
      markers.forEach(marker => {
        marker.clear();
      });
    }
    delete this.selectionMarkers[uuid];*/
  }

  /**
   * Marks selections.
   */
  private _markSelections(
    uuid: string,
    selections: CodeEditor.ITextSelection[]
  ) {
    // TODO: CM6 migration, see Mark Text section of the igration guide
    /*const markers: CodeMirror.TextMarker[] = [];

    // If we are marking selections corresponding to an active hover,
    // remove it.
    if (uuid === this._hoverId) {
      this._clearHover();
    }
    // If we can id the selection to a specific collaborator,
    // use that information.
    let collaborator: ICollaborator | undefined;
    if (this._model.modelDB.collaborators) {
      collaborator = this._model.modelDB.collaborators.get(uuid);
    }

    // Style each selection for the uuid.
    selections.forEach(selection => {
      // Only render selections if the start is not equal to the end.
      // In that case, we don't need to render the cursor.
      if (!JSONExt.deepEqual(selection.start, selection.end)) {
        // Selections only appear to render correctly if the anchor
        // is before the head in the document. That is, reverse selections
        // do not appear as intended.
        const forward: boolean =
          selection.start.line < selection.end.line ||
          (selection.start.line === selection.end.line &&
            selection.start.column <= selection.end.column);
        const anchor = this._toCodeMirrorPosition(
          forward ? selection.start : selection.end
        );
        const head = this._toCodeMirrorPosition(
          forward ? selection.end : selection.start
        );
        let markerOptions: CodeMirror.TextMarkerOptions;
        if (collaborator) {
          markerOptions = this._toTextMarkerOptions({
            ...selection.style,
            color: collaborator.color
          });
        } else {
          markerOptions = this._toTextMarkerOptions(selection.style);
        }
        markers.push(this.doc.markText(anchor, head, markerOptions));
      } else if (collaborator) {
        const caret = this._getCaret(collaborator);
        markers.push(
          this.doc.setBookmark(this._toCodeMirrorPosition(selection.end), {
            widget: caret
          })
        );
      }
    });
    this.selectionMarkers[uuid] = markers;*/
  }

  /**
   * Handles a cursor activity event.
   */
  private _onCursorActivity(): void {
    // Only add selections if the editor has focus. This avoids unwanted
    // triggering of cursor activity due to collaborator actions.
    if (this._editor.hasFocus) {
      const selections = this.getSelections();
      this.model.selections.set(this.uuid, selections);
    }
  }

  /**
   * Converts a code mirror selection to an editor selection.
   */
  private _toSelection(selection: {
    anchor: { line: number; ch: number };
    head: { line: number; ch: number };
  }): CodeEditor.ITextSelection {
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
  // TODO: CM6 migration see Mark text section of the migration guide
  /*private _toTextMarkerOptions(
    style: CodeEditor.ISelectionStyle
  ): CodeMirror.TextMarkerOptions {
    const r = parseInt(style.color.slice(1, 3), 16);
    const g = parseInt(style.color.slice(3, 5), 16);
    const b = parseInt(style.color.slice(5, 7), 16);
    const css = `background-color: rgba( ${r}, ${g}, ${b}, 0.15)`;
    return {
      className: style.className,
      title: style.displayName,
      css
    };
  }*/

  /**
   * Convert a code mirror position to an editor position.
   */
  private _toPosition(position: { line: number; ch: number }) {
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
  private _onValueChanged(
    value: IObservableString,
    args: IObservableString.IChangedArgs
  ): void {
    if (this._changeGuard) {
      return;
    }
    this._changeGuard = true;
    switch (args.type) {
      case 'insert': {
        // Replace the range, including a '+input' origin,
        // which indicates that CodeMirror may merge changes
        // for undo/redo purposes.
        this.editor.dispatch({
          changes: { from: args.start, to: args.start, insert: args.value }
        });
        break;
      }
      case 'remove': {
        const from = args.start;
        const to = args.end;
        // Replace the range, including a '+input' origin,
        // which indicates that CodeMirror may merge changes
        // for undo/redo purposes.
        this.editor.dispatch({ changes: { from, to, insert: '' } });
        break;
      }
      case 'set':
        this.editor.dispatch({
          changes: { from: 0, to: this.doc.length, insert: args.value }
        });
        break;
      default:
        break;
    }
    this._changeGuard = false;
  }

  /**
   * Handles document changes.
   */
  // TODO: CM6 migration
  /*private _beforeDocChanged(
    doc: CodeMirror.Doc,
    change: CodeMirror.EditorChange
  ) {
    if (this._changeGuard) {
      return;
    }
    this._changeGuard = true;
    const value = this._model.value;
    const start = doc.indexFromPos(change.from);
    const end = doc.indexFromPos(change.to);
    const inserted = change.text.join('\n');

    if (end !== start) {
      value.remove(start, end);
    }
    if (inserted) {
      value.insert(start, inserted);
    }
    this._changeGuard = false;
  }*/

  /**
   * Handle the DOM events for the editor.
   *
   * @param event - The DOM event sent to the editor.
   *
   * #### Notes
   * This method implements the DOM `EventListener` interface and is
   * called in response to events on the editor's DOM node. It should
   * not be called directly by user code.
   */
  handleEvent(event: Event): void {
    switch (event.type) {
      case 'focus':
        this._evtFocus(event as FocusEvent);
        break;
      case 'blur':
        this._evtBlur(event as FocusEvent);
        break;
      case 'scroll':
        this._evtScroll();
        break;
      default:
        break;
    }
  }

  /**
   * Handle `focus` events for the editor.
   */
  private _evtFocus(event: FocusEvent): void {
    if (this._needsRefresh) {
      this.refresh();
    }
    this.host.classList.add('jp-mod-focused');

    // Update the selections on editor gaining focus because
    // the onCursorActivity function filters usual cursor events
    // based on the editor's focus.
    this._onCursorActivity();
  }

  /**
   * Handle `blur` events for the editor.
   */
  private _evtBlur(event: FocusEvent): void {
    this.host.classList.remove('jp-mod-focused');
  }

  /**
   * Handle `scroll` events for the editor.
   */
  private _evtScroll(): void {
    // Remove any active hover.
    this._clearHover();
  }

  /**
   * Clear the hover for a caret, due to things like
   * scrolling, resizing, deactivation, etc, where
   * the position is no longer valid.
   */
  private _clearHover(): void {
    if (this._caretHover) {
      window.clearTimeout(this._hoverTimeout);
      document.body.removeChild(this._caretHover);
      this._caretHover = null;
    }
  }

  /**
   * Construct a caret element representing the position
   * of a collaborator's cursor.
   */
  // TODO: CM6 migration, see Marked Text section of migration guide
  /*private _getCaret(collaborator: ICollaborator): HTMLElement {
    // FIXME-TRANS: Is this localizable?
    const name = collaborator ? collaborator.displayName : 'Anonymous';
    const color = collaborator
      ? collaborator.color
      : this._selectionStyle.color;
    const caret: HTMLElement = document.createElement('span');
    caret.className = COLLABORATOR_CURSOR_CLASS;
    caret.style.borderBottomColor = color;
    caret.onmouseenter = () => {
      this._clearHover();
      this._hoverId = collaborator.sessionId;
      const rect = caret.getBoundingClientRect();
      // Construct and place the hover box.
      const hover = document.createElement('div');
      hover.className = COLLABORATOR_HOVER_CLASS;
      hover.style.left = String(rect.left) + 'px';
      hover.style.top = String(rect.bottom) + 'px';
      hover.textContent = name;
      hover.style.backgroundColor = color;

      // If the user mouses over the hover, take over the timer.
      hover.onmouseenter = () => {
        window.clearTimeout(this._hoverTimeout);
      };
      hover.onmouseleave = () => {
        this._hoverTimeout = window.setTimeout(() => {
          this._clearHover();
        }, HOVER_TIMEOUT);
      };
      this._caretHover = hover;
      document.body.appendChild(hover);
    };
    caret.onmouseleave = () => {
      this._hoverTimeout = window.setTimeout(() => {
        this._clearHover();
      }, HOVER_TIMEOUT);
    };
    return caret;
  }*/

  /**
   * Check for an out of sync editor.
   */
  private _checkSync(): void {
    const change = this._lastChange;
    if (!change) {
      return;
    }
    this._lastChange = null;
    const doc = this.doc;
    if (doc.toString() === this._model.value.text) {
      return;
    }

    void showDialog({
      title: this._trans.__('Code Editor out of Sync'),
      body: this._trans.__(
        'Please open your browser JavaScript console for bug report instructions'
      )
    });
    console.warn(
      'If you are able and willing to publicly share the text or code in your editor, you can help us debug the "Code Editor out of Sync" message by pasting the following to the public issue at https://github.com/jupyterlab/jupyterlab/issues/2951. Please note that the data below includes the text/code in your editor.'
    );
    console.warn(
      JSON.stringify({
        model: this._model.value.text,
        view: doc.toString(),
        selections: this.getSelections(),
        cursor: this.getCursorPosition(),
        lineSep: this.state.facet(EditorState.lineSeparator),
        //mode: editor.getOption('mode'),
        change
      })
    );
  }

  protected translator: ITranslator;
  private _trans: TranslationBundle;
  private _model: CodeEditor.IModel;
  private _editor: EditorView;
  /*protected selectionMarkers: {
    [key: string]: CodeMirror.TextMarker[] | undefined;
  } = {};*/
  private _caretHover: HTMLElement | null;
  private _config: CodeMirrorEditor.IConfig;
  private _hoverTimeout: number;
  //private _hoverId: string;
  private _keydownHandlers = new Array<CodeEditor.KeydownHandler>();
  private _changeGuard = false;
  private _selectionStyle: CodeEditor.ISelectionStyle;
  private _uuid = '';
  private _needsRefresh = false;
  private _isDisposed = false;
  private _lastChange: Transaction | null = null;
  private _poll: Poll;
  private _yeditorBinding: IYCodeMirrorBinding | null;
  private _editorConfig: Configuration.EditorConfiguration;
}

/**
 * The namespace for `CodeMirrorEditor` statics.
 */
export namespace CodeMirrorEditor {
  export interface IConfig extends Configuration.IConfig {}
  /**
   * The options used to initialize a code mirror editor.
   */
  export interface IOptions extends CodeEditor.IOptions {
    /**
     * The configuration options for the editor.
     */
    config?: Partial<IConfig>;
  }

  /**
   * The options used to set several options at once with reconfigure.
   */
  export interface IConfigOptions<K extends keyof IConfig> {
    K: IConfig[K];
  }

  /**
   * The default configuration options for an editor.
   */
  export const defaultConfig: Required<IConfig> = {
    ...CodeEditor.defaultConfig,
    mode: 'null',
    theme: 'jupyter',
    smartIndent: true,
    electricChars: true,
    keyMap: 'default',
    extraKeys: null,
    gutters: [],
    fixedGutter: true,
    showCursorWhenSelecting: false,
    coverGutterNextToScrollbar: false,
    dragDrop: true,
    lineSeparator: null,
    scrollbarStyle: 'native',
    lineWiseCopyCut: true,
    scrollPastEnd: false,
    styleActiveLine: false,
    styleSelectedText: true,
    selectionPointer: false,
    rulers: [],
    foldGutter: false,
    handlePaste: true
  };

  /**
   * Add a command to CodeMirror.
   *
   * @param name - The name of the command to add.
   *
   * @param command - The command function.
   */
  // TODO: There is no longer a central registry of named commands in CM6,
  // the question is should we expose Commands and StateCommands, or recreate
  // the central registry internally
  /*export function addCommand(
    name: string,
    command: (cm: CodeMirror.Editor) => void
  ): void {
    (CodeMirror.commands as any)[name] = command;
  }*/

  /**
   * Indent or insert a tab as appropriate.
   */
  export function indentMoreOrInsertTab(target: {
    state: EditorState;
    dispatch: (transaction: Transaction) => void;
  }): boolean {
    const arg = { state: target.state, dispatch: target.dispatch };
    const from = target.state.selection.main.from;
    const to = target.state.selection.main.to;
    if (from != to) {
      return indentMore(arg);
    }
    const line = target.state.doc.lineAt(from);
    const before = target.state.doc.slice(line.from, from).toString();
    if (/^\s*$/.test(before)) {
      return indentMore(arg);
    } else {
      return insertTab(arg);
    }
  }

  /**
   * Delete spaces to the previous tab stop in a codemirror editor.
   */
  export function delSpaceToPrevTabStop(target: EditorView): boolean {
    const indentUnit = getIndentUnit(target.state);
    const ranges = target.state.selection.ranges; // handle multicursor
    for (let i = ranges.length - 1; i >= 0; i--) {
      // iterate reverse so any deletions don't overlap
      const head = ranges[i].head;
      const anchor = ranges[i].anchor;
      if (head != anchor) {
        target.dispatch({ changes: { from: anchor, to: head, insert: '' } });
      } else {
        const line = target.state.doc.lineAt(head);
        const text = line.text.substring(0, head - line.from);
        if (text.match(/^\ +$/) !== null) {
          // delete tabs
          const prevTabStop =
            (Math.ceil((head - line.from) / indentUnit) - 1) * indentUnit;
          const from = line.from + prevTabStop;
          target.dispatch({ changes: { from: from, to: head, insert: '' } });
        } else {
          // delete non-tabs
          target.dispatch({ changes: { from: head - 1, to: head } });
        }
      }
    }
    return true;
  }
}

/**
 * The namespace for module private data.
 */
namespace Private {
  export function createEditor(
    host: HTMLElement,
    config: CodeMirrorEditor.IConfig,
    ybinding: IYCodeMirrorBinding | null,
    editorConfig: Configuration.EditorConfiguration
  ): EditorView {
    let extensions = editorConfig.getInitialExtensions(config);
    if (ybinding) {
      extensions.push(yCollab(ybinding.text, ybinding.awareness));
    }

    const doc = ybinding?.text.toString();
    const view = new EditorView({
      state: EditorState.create({
        doc: doc,
        extensions: extensions
      }),
      parent: host
    });

    return view;
  }

  /**
   * Indent or insert a tab as appropriate.
   */
  /*export function indentMoreOrinsertTab(cm: CodeMirror.Editor): void {
    const doc = cm.getDoc();
    const from = doc.getCursor('from');
    const to = doc.getCursor('to');
    const sel = !posEq(from, to);
    if (sel) {
      CodeMirror.commands['indentMore'](cm);
      return;
    }
    // Check for start of line.
    const line = doc.getLine(from.line);
    const before = line.slice(0, from.ch);
    if (/^\s*$/.test(before)) {
      CodeMirror.commands['indentMore'](cm);
    } else {
      if (cm.getOption('indentWithTabs')) {
        CodeMirror.commands['insertTab'](cm);
      } else {
        CodeMirror.commands['insertSoftTab'](cm);
      }
    }
  }*/

  /**
   * Delete spaces to the previous tab stop in a codemirror editor.
   */
  /*export function delSpaceToPrevTabStop(cm: CodeMirror.Editor): void {
    const doc = cm.getDoc();
    // default tabsize is 2, according to codemirror docs: https://codemirror.net/doc/manual.html#config
    const tabSize = cm.getOption('indentUnit') ?? 2;
    const ranges = doc.listSelections(); // handle multicursor
    for (let i = ranges.length - 1; i >= 0; i--) {
      // iterate reverse so any deletions don't overlap
      const head = ranges[i].head;
      const anchor = ranges[i].anchor;
      const isSelection = !posEq(head, anchor);
      if (isSelection) {
        doc.replaceRange('', anchor, head);
      } else {
        const line = doc.getLine(head.line).substring(0, head.ch);
        if (line.match(/^\ +$/) !== null) {
          // delete tabs
          const prevTabStop = (Math.ceil(head.ch / tabSize) - 1) * tabSize;
          const from = CodeMirror.Pos(head.line, prevTabStop);
          doc.replaceRange('', from, head);
        } else {
          // delete non-tabs
          const from = cm.findPosH(head, -1, 'char', false);
          doc.replaceRange('', from, head);
        }
      }
    }
  }*/

  /**
   * Test whether two CodeMirror positions are equal.
   */
  /*export function posEq(
    a: CodeMirror.Position,
    b: CodeMirror.Position
  ): boolean {
    return a.line === b.line && a.ch === b.ch;
  }*/

  /**
   * Get the list of active gutters
   *
   * @param config Editor configuration
   */
  // TODO: CM6 migration
  /*function getActiveGutters(config: CodeMirrorEditor.IConfig): string[] {
    // The order of the classes will be the gutters order
    const classToSwitch: { [val: string]: keyof CodeMirrorEditor.IConfig } = {
      'CodeMirror-linenumbers': 'lineNumbers',
      'CodeMirror-foldgutter': 'codeFolding'
    };
    return Object.keys(classToSwitch).filter(
      gutter => config[classToSwitch[gutter]]
    );
  }*/

  /**
   * Set a config option for the editor.
   */
  // TODO: CM6 migration, set the new option/config system based on Facets
  export function setOption<K extends keyof CodeMirrorEditor.IConfig>(
    editor: EditorView,
    option: K,
    value: CodeMirrorEditor.IConfig[K],
    config: CodeMirrorEditor.IConfig
  ): void {
    /*
    const el = editor.getWrapperElement();
    switch (option) {
      case 'cursorBlinkRate':
        (editor.setOption as any)(option, value);
        break;
      case 'lineWrap': {
        const lineWrapping = value === 'off' ? false : true;
        const lines = el.querySelector('.CodeMirror-lines') as HTMLDivElement;
        const maxWidth =
          value === 'bounded' ? `${config.wordWrapColumn}ch` : null;
        const width =
          value === 'wordWrapColumn' ? `${config.wordWrapColumn}ch` : null;
        lines.style.setProperty('max-width', maxWidth);
        lines.style.setProperty('width', width);
        editor.setOption('lineWrapping', lineWrapping);
        break;
      }
      case 'wordWrapColumn': {
        const { lineWrap } = config;
        if (lineWrap === 'wordWrapColumn' || lineWrap === 'bounded') {
          const lines = el.querySelector('.CodeMirror-lines') as HTMLDivElement;
          const prop = lineWrap === 'wordWrapColumn' ? 'width' : 'maxWidth';
          lines.style[prop] = `${value}ch`;
        }
        break;
      }
      case 'tabSize':
        editor.setOption(
          'indentUnit',
          value as CodeMirror.EditorConfiguration['tabSize']
        );
        break;
      case 'insertSpaces':
        editor.setOption('indentWithTabs', !value);
        break;
      case 'autoClosingBrackets':
        editor.setOption('autoCloseBrackets', value as any);
        break;
      case 'rulers': {
        const rulers = value as Array<number>;
        (editor.setOption as any)(
          'rulers',
          rulers.map(column => {
            return {
              column,
              className: 'jp-CodeMirror-ruler'
            };
          })
        );
        break;
      }
      case 'readOnly':
        el.classList.toggle(READ_ONLY_CLASS, value as boolean);
        (editor.setOption as any)(option, value);
        break;
      case 'fontFamily':
        el.style.fontFamily = value as string;
        break;
      case 'fontSize':
        el.style.setProperty('font-size', value ? value + 'px' : null);
        break;
      case 'lineHeight':
        el.style.lineHeight = (value ? value.toString() : null) as any;
        break;
      case 'gutters':
        (editor.setOption as any)(option, getActiveGutters(config));
        break;
      case 'lineNumbers':
        (editor.setOption as any)(option, value);
        editor.setOption('gutters', getActiveGutters(config));
        break;
      case 'codeFolding':
        (editor.setOption as any)('foldGutter', value);
        editor.setOption('gutters', getActiveGutters(config));
        break;
      case 'showTrailingSpace':
        (editor.setOption as any)(option, value);
        break;
      default:
        (editor.setOption as any)(option, value);
        break;
    }*/
  }
}

// TODO: no more central registry of named commands in CM6,
// let's remove that for now
/**
 * Add a CodeMirror command to delete until previous non blanking space
 * character or first multiple of tabsize tabstop.
 */
/*CodeMirrorEditor.addCommand(
  'delSpaceToPrevTabStop',
  Private.delSpaceToPrevTabStop
);*/

/**
 * Add a CodeMirror command to indent or insert a tab as appropriate.
 */
/*CodeMirrorEditor.addCommand(
  'indentMoreOrinsertTab',
  Private.indentMoreOrinsertTab
);*/
