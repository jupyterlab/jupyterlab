/* eslint-disable @typescript-eslint/ban-types */
// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
// / <reference types="codemirror"/>
// / <reference types="codemirror/searchcursor"/>

import { CodeEditor } from '@jupyterlab/codeeditor';
import { ICollaborator, IObservableMap } from '@jupyterlab/observables';
import { IYText } from '@jupyter-notebook/ydoc';
import {
  ITranslator,
  nullTranslator,
  TranslationBundle
} from '@jupyterlab/translation';
import { ArrayExt } from '@lumino/algorithm';
import { UUID } from '@lumino/coreutils';
import { DisposableDelegate, IDisposable } from '@lumino/disposable';
import { Signal } from '@lumino/signaling';

import {
  indentMore,
  insertNewlineAndIndent,
  insertTab
} from '@codemirror/commands';
import { ensureSyntaxTree } from '@codemirror/language';
import {
  EditorSelection,
  EditorState,
  Extension,
  Prec,
  Range,
  StateCommand,
  StateEffect,
  StateEffectType,
  StateField,
  Text,
  Transaction
} from '@codemirror/state';
import {
  Command,
  Decoration,
  DecorationSet,
  EditorView,
  ViewUpdate,
  WidgetType
} from '@codemirror/view';
import { SyntaxNodeRef } from '@lezer/common';
import { yCollab } from 'y-codemirror.next';
import { Awareness } from 'y-protocols/awareness';
import * as Y from 'yjs';
import './codemirror-ipython';
import './codemirror-ipythongfm';
import { Configuration } from './editorconfiguration';
import { Mode } from './mode';

/**
 * The class name added to CodeMirrorWidget instances.
 */
const EDITOR_CLASS = 'jp-CodeMirrorEditor';

/**
 * The class name added to read only cell editor widgets.
 */
const READ_ONLY_CLASS = 'jp-mod-readOnly';

/**
 * The class name for the hover box for collaborator cursors.
 */
const COLLABORATOR_CURSOR_CLASS = 'jp-CollaboratorCursor';

/**
 * The class name for the hover box for collaborator cursors.
 */
const COLLABORATOR_HOVER_CLASS = 'jp-CollaboratorCursor-hover';

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
const HOVER_TIMEOUT = 1000;

interface IYCodeMirrorBinding {
  text: Y.Text;
  awareness: Awareness | null;
  undoManager: Y.UndoManager | null;
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

    // State and effects for handling the selection marks
    this._addMark = StateEffect.define<Private.ICollabSelectionText>();
    this._removeMark = StateEffect.define<Private.ICollabDecorationSet>();

    this._markField = StateField.define<DecorationSet>({
      create: () => {
        return Decoration.none;
      },
      update: (marks, transaction) => {
        marks = marks.map(transaction.changes);
        for (let ef of transaction.effects) {
          if (ef.is(this._addMark)) {
            let e = ef as StateEffect<Private.ICollabSelectionText>;
            const decorations = this._buildMarkDecoration(
              e.value.uuid,
              e.value.selections
            );
            marks = marks.update({ add: decorations });
            this._selectionMarkers[e.value.uuid] = decorations;
          } else if (ef.is(this._removeMark)) {
            let e = ef as StateEffect<Private.ICollabDecorationSet>;
            for (let rd of ef.value.decorations) {
              marks = marks.update({
                filter: (from, to, value) => {
                  return !(
                    from === rd.from &&
                    to === rd.to &&
                    value === rd.value
                  );
                }
              });
            }
            delete this._selectionMarkers[e.value.uuid];
          }
        }
        return marks;
      },
      provide: f => EditorView.decorations.from(f)
    });

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

    this._initializeEditorBinding();

    // Extension for handling DOM events
    const domEventHandlers = EditorView.domEventHandlers({
      keydown: (event: KeyboardEvent, view: EditorView) => {
        const index = ArrayExt.findFirstIndex(
          this._keydownHandlers,
          handler => {
            if (handler(this, event) === true) {
              event.preventDefault();
              return true;
            }
            return false;
          }
        );
        if (index === -1) {
          return this.onKeydown(event);
        }
        return false;
      }
    });

    const updateListener = EditorView.updateListener.of(
      (update: ViewUpdate) => {
        this._onDocChanged(update);
      }
    );

    // The list of internal strings is available at https://codemirror.net/examples/translate/
    const translation = EditorState.phrases.of({
      // @codemirror/view
      'Control character': this._trans.__('Control character'),
      // @codemirror/commands
      'Selection deleted': this._trans.__('Selection deleted'),
      // @codemirror/language
      'Folded lines': this._trans.__('Folded lines'),
      'Unfolded lines': this._trans.__('Unfolded lines'),
      to: this._trans.__('to'),
      'folded code': this._trans.__('folded code'),
      unfold: this._trans.__('unfold'),
      'Fold line': this._trans.__('Fold line'),
      'Unfold line': this._trans.__('Unfold line'),
      // @codemirror/search
      'Go to line': this._trans.__('Go to line'),
      go: this._trans.__('go'),
      Find: this._trans.__('Find'),
      Replace: this._trans.__('Replace'),
      next: this._trans.__('next'),
      previous: this._trans.__('previous'),
      all: this._trans.__('all'),
      'match case': this._trans.__('match case'),
      replace: this._trans.__('replace'),
      'replace all': this._trans.__('replace all'),
      close: this._trans.__('close'),
      'current match': this._trans.__('current match'),
      'replaced $ matches': this._trans.__('replaced $ matches'),
      'replaced match on line $': this._trans.__('replaced match on line $'),
      'on line': this._trans.__('on line'),
      // @codemirror/autocomplete
      Completions: this._trans.__('Completions'),
      // @codemirror/lint
      Diagnostics: this._trans.__('Diagnostics'),
      'No diagnostics': this._trans.__('No diagnostics')
    });

    this._editor = Private.createEditor(
      host,
      fullConfig,
      this._yeditorBinding,
      this._editorConfig,
      [
        this._markField,
        Prec.high(domEventHandlers),
        updateListener,
        translation
      ]
    );

    this._onMimeTypeChanged();
    this._onCursorActivity();

    model.mimeTypeChanged.connect(this._onMimeTypeChanged, this);
    model.selections.changed.connect(this._onSelectionsChanged, this);
  }

  /**
   * Initialize the editor binding.
   */
  private _initializeEditorBinding(): void {
    const sharedModel = this.model.sharedModel as IYText;
    this._yeditorBinding = {
      text: sharedModel.ysource,
      awareness: sharedModel.awareness,
      undoManager: sharedModel.undoManager
    };
  }

  save: () => void;

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
    this._keydownHandlers.length = 0;
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
    line = line + 1;
    return line <= this.doc.lines ? this.doc.line(line).text : undefined;
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
    this._yeditorBinding?.undoManager?.clear();
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
    return this._editor.hasFocus;
  }

  /**
   * Explicitly blur the editor.
   */
  blur(): void {
    this._editor.contentDOM.blur();
  }

  /**
   * Refresh the editor if it is focused;
   * otherwise postpone refreshing till focusing.
   */
  resizeToFit(): void {
    this._clearHover();
  }

  get state(): EditorState {
    return this._editor.state;
  }

  firstLine(): number {
    // TODO: return 1 when CM6 first line number has propagated
    return 0;
  }

  lastLine(): number {
    return this.doc.lines - 1;
  }

  cursorCoords(
    where: boolean,
    mode?: 'window' | 'page' | 'local'
  ): { left: number; top: number; bottom: number } {
    const selection = this.state.selection.main;
    const pos = where ? selection.from : selection.to;
    const rect = this.editor.coordsAtPos(pos);
    return rect as { left: number; top: number; bottom: number };
  }

  getRange(
    from: { line: number; ch: number },
    to: { line: number; ch: number },
    separator?: string
  ): string {
    const fromOffset = this.getOffsetAt(this._toPosition(from));
    const toOffset = this.getOffsetAt(this._toPosition(to));
    return this.state.sliceDoc(fromOffset, toOffset);
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
   * Reveal the given position in the editor.
   */
  revealPosition(position: CodeEditor.IPosition): void {
    const offset = this.getOffsetAt(position);
    this._editor.dispatch({
      effects: EditorView.scrollIntoView(offset)
    });
  }

  /**
   * Reveal the given selection in the editor.
   */
  revealSelection(selection: CodeEditor.IRange): void {
    const start = this.getOffsetAt(selection.start);
    const end = this.getOffsetAt(selection.end);
    this._editor.dispatch({
      effects: EditorView.scrollIntoView(EditorSelection.range(start, end))
    });
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
    this.editor.dispatch({
      selection: { anchor: offset },
      scrollIntoView: true
    });
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
    const selections = this.state.selection.ranges; //= [{anchor: number, head: number}]
    if (selections.length > 0) {
      const sel = selections.map(r => ({
        anchor: this._toCodeMirrorPosition(this.getPositionAt(r.from)),
        head: this._toCodeMirrorPosition(this.getPositionAt(r.to))
      }));
      return sel.map(selection => this._toSelection(selection));
    }
    const cursor = this._toCodeMirrorPosition(
      this.getPositionAt(this.state.selection.main.head)
    );
    const selection = this._toSelection({ anchor: cursor, head: cursor });
    return [selection];
  }

  /**
   * Sets the selections for all the cursors, should not be empty.
   * Cursors will be removed or added, as necessary.
   * Passing an empty array resets a cursor position to the start of a document.
   */
  setSelections(selections: CodeEditor.IRange[]): void {
    const sel = selections.length
      ? selections.map(r =>
          EditorSelection.range(
            this.getOffsetAt(r.start),
            this.getOffsetAt(r.end)
          )
        )
      : [EditorSelection.range(0, 0)];
    this.editor.dispatch({ selection: EditorSelection.create(sel) });
  }

  /**
   * Replaces the current selection with the given text.
   *
   * @param text The text to be inserted.
   */
  replaceSelection(text: string): void {
    this.state.replaceSelection(text);
  }

  /**
   * Get a list of tokens for the current editor text content.
   */
  getTokens(): CodeEditor.IToken[] {
    const tokens: CodeEditor.IToken[] = [];
    const tree = ensureSyntaxTree(this.state, this.doc.length);
    if (tree) {
      tree.iterate({
        enter: (node: SyntaxNodeRef) => {
          tokens.push({
            value: this.state.sliceDoc(node.from, node.to),
            offset: node.from,
            type: node.name
          });
          return true;
        }
      });
    }
    return tokens;
  }

  /**
   * Get the token at a given editor position.
   */
  getTokenAt(offset: number): CodeEditor.IToken {
    const tree = ensureSyntaxTree(this.state, offset);
    if (tree) {
      const node = tree.resolveInner(offset);
      return {
        value: this.state.sliceDoc(node.from, node.to),
        offset: node.from,
        type: node.name
      };
    } else {
      return {
        value: '',
        offset: offset
      };
    }
  }

  /**
   * Get the token a the cursor position.
   */
  getTokenAtCursor(): CodeEditor.IToken {
    return this.getTokenAt(this.state.selection.main.head);
  }

  /**
   * Insert a new indented line at the current cursor position.
   */
  newIndentedLine(): void {
    insertNewlineAndIndent({
      state: this.state,
      dispatch: this.editor.dispatch
    });
  }

  /**
   * Execute a codemirror command on the editor.
   *
   * @param command - The name of the command to execute.
   */
  execCommand(command: Command | StateCommand): void {
    command(this.editor);
  }

  /**
   * Handle keydown events from the editor.
   */
  protected onKeydown(event: KeyboardEvent): boolean {
    const position = this.state.selection.main.head;

    if (position === 0 && event.keyCode === UP_ARROW) {
      if (!event.shiftKey) {
        this.edgeRequested.emit('top');
      }
      return false;
    }

    const line = this.doc.lineAt(position).number;
    if (line === 1 && event.keyCode === UP_ARROW) {
      if (!event.shiftKey) {
        this.edgeRequested.emit('topLine');
      }
      return false;
    }

    const length = this.doc.length;
    if (position === length && event.keyCode === DOWN_ARROW) {
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
  private _cleanSelections(uuid: string) {
    this.editor.dispatch({
      effects: this._removeMark.of({
        uuid: uuid,
        decorations: this._selectionMarkers[uuid]
      })
    });
  }

  private _buildMarkDecoration(
    uuid: string,
    selections: Private.ISelectionText[]
  ) {
    const decorations: Range<Decoration>[] = [];

    // If we are marking selections corresponding to an active hover,
    // remove it.
    if (uuid === this._hoverId) {
      this._clearHover();
    }
    // If we can id the selection to a specific collaborator,
    // use that information.
    let collaborator: ICollaborator | undefined;

    // Style each selection for the uuid.
    selections.forEach(selection => {
      const from = selection.from;
      const to = selection.to;
      // Only render selections if the start is not equal to the end.
      // In that case, we don't need to render the cursor.
      if (from !== to) {
        const style = collaborator
          ? { ...selection.style, color: collaborator.color }
          : selection.style;
        const decoration = Decoration.mark({
          attributes: this._toMarkSpec(style)
        });
        decorations.push(
          from > to ? decoration.range(to, from) : decoration.range(to, from)
        );
      } else if (collaborator) {
        const caret = Decoration.widget({
          widget: this._getCaret(collaborator)
        });
        decorations.push(caret.range(from));
      }
    });

    return decorations;
  }

  /**
   * Converts the selection style to a text marker options.
   */
  private _toMarkSpec(style: CodeEditor.ISelectionStyle) {
    const r = parseInt(style.color.slice(1, 3), 16);
    const g = parseInt(style.color.slice(3, 5), 16);
    const b = parseInt(style.color.slice(5, 7), 16);
    const css = `background-color: rgba( ${r}, ${g}, ${b}, 0.15)`;
    return {
      className: style.className,
      title: style.displayName,
      css
    };
  }

  /**
   * Construct a caret element representing the position
   * of a collaborator's cursor.
   */
  private _getCaret(collaborator: ICollaborator): Private.CaretWidget {
    return new Private.CaretWidget(collaborator, {
      setHoverId: (sessionId: string) => {
        this._clearHover();
        this._hoverId = sessionId;
      },
      setHoverTimeout: () => {
        this._hoverTimeout = window.setTimeout(() => {
          this._clearHover();
        }, HOVER_TIMEOUT);
      },
      clearHoverTimeout: () => {
        window.clearTimeout(this._hoverTimeout);
      }
    });
  }

  /**
   * Marks selections.
   */
  private _markSelections(
    uuid: string,
    selections: CodeEditor.ITextSelection[]
  ) {
    const sel = selections.map(selection => ({
      from: this.getOffsetAt(selection.start),
      to: this.getOffsetAt(selection.end),
      style: selection.style
    }));
    this.editor.dispatch({
      effects: this._addMark.of({ uuid: uuid, selections: sel })
    });
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
   * Handles document changes.
   */
  private _onDocChanged(update: ViewUpdate) {
    if (update.transactions.length && update.transactions[0].selection) {
      this._onCursorActivity();
    }
  }

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

  protected translator: ITranslator;
  private _trans: TranslationBundle;
  private _model: CodeEditor.IModel;
  private _editor: EditorView;
  private _selectionMarkers: {
    [key: string]: Range<Decoration>[];
  } = {};
  private _caretHover: HTMLElement | null;
  private _config: CodeMirrorEditor.IConfig;
  private _hoverTimeout: number;
  private _hoverId: string;
  private _keydownHandlers = new Array<CodeEditor.KeydownHandler>();
  private _selectionStyle: CodeEditor.ISelectionStyle;
  private _uuid = '';
  private _isDisposed = false;
  private _yeditorBinding: IYCodeMirrorBinding | null;
  private _editorConfig: Configuration.EditorConfiguration;
  private _addMark: StateEffectType<Private.ICollabSelectionText>;
  private _removeMark: StateEffectType<Private.ICollabDecorationSet>;
  private _markField: StateField<DecorationSet>;
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
    handlePaste: true
  };

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
}

/**
 * The namespace for module private data.
 */
namespace Private {
  export function createEditor(
    host: HTMLElement,
    config: CodeMirrorEditor.IConfig,
    ybinding: IYCodeMirrorBinding | null,
    editorConfig: Configuration.EditorConfiguration,
    additionalExtensions: Extension[]
  ): EditorView {
    const extensions = editorConfig.getInitialExtensions(config);
    if (ybinding) {
      extensions.push(
        yCollab(ybinding.text, ybinding.awareness, {
          undoManager: ybinding.undoManager ?? false
        })
      );
    }
    extensions.push(...additionalExtensions);
    const doc = ybinding?.text.toString();
    const view = new EditorView({
      state: EditorState.create({
        doc,
        extensions
      }),
      parent: host
    });

    if (config.readOnly) {
      view.dom.classList.add(READ_ONLY_CLASS);
    }

    return view;
  }

  export interface ISelectionText {
    from: number;
    to: number;
    style: CodeEditor.ISelectionStyle;
  }

  export interface ICollabSelectionText {
    uuid: string;
    selections: ISelectionText[];
  }

  export interface ICollabDecorationSet {
    uuid: string;
    decorations: Range<Decoration>[];
  }

  export interface ICaretWidgetCallbacks {
    setHoverId: (sessionId: string) => void;
    setHoverTimeout: () => void;
    clearHoverTimeout: () => void;
  }

  export class CaretWidget extends WidgetType {
    constructor(
      readonly collaborator: ICollaborator,
      readonly callbacks: ICaretWidgetCallbacks
    ) {
      super();
    }

    eq(other: CaretWidget) {
      return this.collaborator.sessionId == other.collaborator.sessionId;
    }

    toDOM() {
      const caret: HTMLElement = document.createElement('span');
      caret.className = COLLABORATOR_CURSOR_CLASS;
      caret.style.borderBottomColor = this.collaborator.color;

      // TODO: check if this should be replaced with
      // a global event handler
      caret.onmouseenter = () => {
        this.callbacks.setHoverId(this.collaborator.sessionId);
        const rect = caret.getBoundingClientRect();
        // Construct and place the hover box.
        const hover = document.createElement('div');
        hover.className = COLLABORATOR_HOVER_CLASS;
        hover.style.left = `${rect.left}px`;
        hover.style.top = `${rect.bottom}px`;
        hover.textContent = this.collaborator.displayName;
        hover.style.backgroundColor = this.collaborator.color;

        // If the user mouses over the hover, take over the timer.
        hover.onmouseenter = () => {
          this.callbacks.clearHoverTimeout();
        };
        hover.onmouseleave = () => {
          this.callbacks.setHoverTimeout();
        };
      };

      caret.onmouseleave = () => {
        this.callbacks.setHoverTimeout();
      };

      return caret;
    }

    ignoreEvent() {
      return false;
    }
  }
}
