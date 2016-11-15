// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import * as CodeMirror
  from 'codemirror';

import {
  loadModeByMIME
} from './';

import {
  Message
} from 'phosphor/lib/core/messaging';

import {
  ResizeMessage, Widget
} from 'phosphor/lib/ui/widget';

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
class CodeMirrorEditor extends Widget implements CodeEditor.IEditor {

  /**
   * Construct a CodeMirror editor.
   */
  constructor(options: CodeMirror.EditorConfiguration = {}) {
    super();
    this.addClass(EDITOR_CLASS);
    let codeMirrorModel = this._model =  new CodeMirrorModel();
    options.theme = (options.theme || DEFAULT_CODEMIRROR_THEME);
    options.value = codeMirrorModel.doc;
    this._editor = CodeMirror(this.node, options);
    codeMirrorModel.mimeTypeChanged.connect((sender, args) => {
      let mime = args.newValue;
      loadModeByMIME(this._editor, mime);
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
    clearTimeout(this._resizing);
    this._editor = null;
    super.dispose();
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

  get onKeyDown(): CodeEditor.KeydownHandler {
    return this._handler;
  }
  set onKeyDown(value: CodeEditor.KeydownHandler) {
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

  private _evtKeydown(event: KeyboardEvent): void {
    let handler = this._handler;
    if (handler) {
      handler(this, event);
    }
  }

  /**
   * Handle `focus` events for the widget.
   */
  private _evtFocus(event: FocusEvent): void {
    if (this._needsRefresh) {
      this._editor.refresh();
      this._needsRefresh = false;
    }
  }

  handleEvent(event: Event): void {
    switch (event.type) {
    case 'keydown':
      this._evtKeydown(event as KeyboardEvent);
      break;
    case 'focus':
      this._evtFocus(event as FocusEvent);
      break;
    default:
      break;
    }
  }

  /**
   * A message handler invoked on an `'after-attach'` message.
   */
  protected onAfterAttach(msg: Message): void {
    super.onAfterAttach(msg);
    this.node.addEventListener('keydown', this);
    this.node.addEventListener('focus', this, true);
    if (!this.isVisible) {
      this._needsRefresh = true;
      return;
    }
    this._editor.refresh();
    this._needsRefresh = false;
  }

  /**
   * A message handler invoked on an `'after-show'` message.
   */
  protected onAfterShow(msg: Message): void {
    if (this._needsRefresh) {
      this._editor.refresh();
      this._needsRefresh = false;
    }
  }

  /**
   * A message handler invoked on an `'resize'` message.
   */
  protected onResize(msg: ResizeMessage): void {
    if (msg.width < 0 || msg.height < 0) {
      if (this._resizing === -1) {
        this._resizing = setTimeout(() => {
          this._editor.setSize(null, null);
          this._resizing = -1;
        }, 500);
      }
    } else {
      this._editor.setSize(msg.width, msg.height);
    }
    this._needsRefresh = true;
  }

  /**
   * Handle `before_detach` messages for the widget.
   */
  protected onBeforeDetach(msg: Message): void {
    this.node.removeEventListener('keydown', this);
    this.node.removeEventListener('focus', this, true);
  }

  private _model: CodeEditor.IModel = null;
  private _handler: CodeEditor.KeydownHandler = null;
  private _editor: CodeMirror.Editor = null;
  private _needsRefresh = true;
  private _resizing = -1;

}

export
class CodeMirrorEditorFactory implements IEditorFactory {

  /**
   * Create a new editor for inline code.
   */
  newInline(option: CodeEditor.IOptions): CodeEditor.IEditor {
    let editor = new CodeMirrorEditor({
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
  newDocument(options: CodeEditor.IOptions): CodeEditor.IEditor {
    let editor = new CodeMirrorEditor({
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
