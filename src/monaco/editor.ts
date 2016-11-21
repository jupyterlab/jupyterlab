// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

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
  boxSizing as computeBoxSizing, IBoxSizing
} from 'phosphor/lib/dom/sizing';

import {
  CodeEditor, IEditorFactory
} from '../codeeditor';

import {
  MonacoModel
} from './model';

/**
 * Monaco code editor.
 */
export
class MonacoCodeEditor implements CodeEditor.IEditor {

  /**
   * Construct a Monaco editor.
   */
  constructor(host: HTMLElement, options: monaco.editor.IEditorConstructionOptions = {}) {
    let monacoModel = this._model =  new MonacoModel();
    options.model = monacoModel.model;
    let monacoEditor = this._editor = monaco.editor.create(host, options);
    monacoEditor.onDidChangeModel(e => this._onDidChangeModel(e));
    monacoEditor.onDidChangeModelMode(e => this._onDidChangeModelMode(e));
    monacoEditor.onDidChangeCursorPosition(e => this._onDidChangeCursorPosition(e));
    monacoEditor.onDidChangeCursorSelection(e => this._onDidChangeCursorSelection(e));
  }

  protected _onDidChangeModel(event: monaco.editor.IModelChangedEvent) {
    // TODO
  }

  protected _onDidChangeModelMode(event: monaco.editor.IModelModeChangedEvent) {
    // TODO
  }

  protected _onDidChangeCursorPosition(event: monaco.editor.ICursorPositionChangedEvent) {
    // TODO
  }

  protected _onDidChangeCursorSelection(event: monaco.editor.ICursorSelectionChangedEvent) {
    // TODO
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
    const cursor = this._editor.getPosition();
    return this.toPosition(cursor);
  }
  setPosition(position: CodeEditor.IPosition) {
    const monacoPosition = this.toMonacoPosition(position);
    this._editor.setPosition(monacoPosition);
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
    return this._editor.isFocused();
  }

  /**
   * Repaint editor.
   */
  refresh(afterShow?: boolean): void {
    if (afterShow) {
      this.autoresize();
    }
    this._editor.render();
  }

  /**
   * Set the size of the editor in pixels.
   */
  setSize(width: number, height: number): void {
    this.onResize(new ResizeMessage(width, height));
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
    return this._editor.getModel().getValue();
  }

  /**
   * Replace the entire text contained in this model.
   */
  setValue(value: string) {
    return this._editor.getModel().setValue(value);
  }

  /**
   * Get the number of lines in the model.
   */
  getLineCount(): number {
    return this._editor.getModel().getLineCount();
  }

  /**
   * Returns a last line number.
   */
  getLastLine(): number {
    return this._editor.getModel().getLineCount();
  }

  /**
   * Returns a content for the given line number.
   */
  getLineContent(line: number): string {
    return this._editor.getModel().getLineContent(line + 1);
  }

  /**
   * Find an offset fot the given position.
   */
  getOffsetAt(position: CodeEditor.IPosition): number {
    const monacoPosition = this.toMonacoPosition(position);
    return this._editor.getModel().getOffsetAt(monacoPosition);
  }

  /**
   * Find a position fot the given offset.
   */
  getPositionAt(offset: number): CodeEditor.IPosition {
    const position = this._editor.getModel().getPositionAt(offset);
    return this.toPosition(position);
  }

  /**
   * Control the rendering of line numbers.
   */
  get lineNumbers(): boolean {
    return this.editor.getConfiguration().viewInfo.renderLineNumbers;
  }
  set lineNumbers(value: boolean) {
    this.editor.updateOptions({
        lineNumbers: value ? 'on' : 'off'
    });
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
    return this._editor.getConfiguration().wrappingInfo.isViewportWrapping;
  }
  set wordWrap(value: boolean) {
    this.editor.updateOptions({
        wordWrap: value
    });
  }

  /**
   * Should the editor be read only.
   */
  get readOnly(): boolean {
    return this._editor.getConfiguration().readOnly;
  }

  set readOnly(readOnly: boolean) {
    this.editor.updateOptions({
        readOnly: readOnly
    });
    this.editor.setSelection({
        startColumn: 0,
        startLineNumber: 0,
        endColumn: 0,
        endLineNumber: 0
    });
  }

  /**
   * Convert a Monaco position to a CodeEditor position.
   */
  protected toPosition(position: monaco.IPosition): CodeEditor.IPosition {
    return {
        line: position.lineNumber - 1,
        column: position.column - 1
    };
  }

  /**
   * Convert a CodeEditor position to a Monaco position.
   */
  protected toMonacoPosition(position: CodeEditor.IPosition): monaco.IPosition {
    return {
        lineNumber: position.line + 1,
        column: position.column + 1
    };
  }

  /** Editor will be hidden by setting width to 0. On show we need to recalculate again */
  // protected onAfterShow(msg: Message): void {
  //     this.autoresize();
  // }

  protected autoresize(): void {
      if (this._autoSizing) {
          this.resize();
      }
  }

  protected onResize(msg: ResizeMessage): void {
      this.resize(msg);
  }

  protected resize(dimension?: monaco.editor.IDimension): void {
      if (this._editor.getDomNode()) {
          const layoutSize = this.computeLayoutSize(dimension);
          this.editor.layout(layoutSize);
      }
  }

  protected computeLayoutSize(dimension?: monaco.editor.IDimension): monaco.editor.IDimension {
      if (dimension && dimension.width >= 0 && dimension.height >= 0) {
          return dimension;
      }

      const boxSizing = computeBoxSizing(this._editor.getDomNode());

      const width = (!dimension || dimension.width < 0) ?
          this.getWidth(boxSizing) :
          dimension.width;

      const height = (!dimension || dimension.height < 0) ?
          this.getHeight(boxSizing) :
          dimension.height;

      return { width, height };
  }

  protected getWidth(boxSizing: IBoxSizing): number {
      return this._editor.getDomNode().offsetWidth - boxSizing.horizontalSum;
  }

  protected getHeight(boxSizing: IBoxSizing): number {
      if (!this._autoSizing) {
          return this._editor.getDomNode().offsetHeight - boxSizing.verticalSum;
      }
      const configuration = this.editor.getConfiguration();

      const lineHeight = configuration.lineHeight;
      const lineCount = this.editor.getModel().getLineCount();
      const contentHeight = lineHeight * lineCount;

      const horizontalScrollbarHeight = configuration.layoutInfo.horizontalScrollbarHeight;

      const editorHeight = contentHeight + horizontalScrollbarHeight;
      if (this.minHeight < 0) {
          return editorHeight;
      }
      const defaultHeight = lineHeight * this.minHeight + horizontalScrollbarHeight;
      return Math.max(defaultHeight, editorHeight)
  }

  private _model: MonacoModel = null;
  private _handler: CodeEditor.KeydownHandler = null;
  private _editor: monaco.editor.IStandaloneCodeEditor = null;
  private _isDisposed = false;

  // FIXME remove when https://github.com/Microsoft/monaco-editor/issues/103 is resolved
  private _autoSizing: boolean = false;
  minHeight: number = -1;

}

export
class MonacoCodeEditorFactory implements IEditorFactory {

  /**
   * Create a new editor for inline code.
   */
  newInlineEditor(host: HTMLElement, option: CodeEditor.IOptions): CodeEditor.IEditor {
    let editor = new MonacoCodeEditor(host, {
      // extraKeys: {
      //   'Tab': 'indentMore',
      //   'Shift-Enter': () => { /* no-op */ }
      // },
      // indentUnit: 4,
      // lineNumbers: true,
      wordWrap: true,
    });
    // TODO configure inline editor
    return editor;
  }

  /**
   * Create a new editor for a full document.
   */
  newDocumentEditor(host: HTMLElement, options: CodeEditor.IOptions): CodeEditor.IEditor {
    let editor = new MonacoCodeEditor(host, {
      // extraKeys: {
      //   'Tab': 'indentMore',
      //   'Shift-Enter': () => { /* no-op */ }
      // },
      // indentUnit: 4,
      // lineNumbers: true,
      wordWrap: true,
    });
    return editor;
  }

}
