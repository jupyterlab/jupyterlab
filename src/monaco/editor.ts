// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ResizeMessage
} from 'phosphor/lib/ui/widget';

import {
  boxSizing as computeBoxSizing, IBoxSizing
} from 'phosphor/lib/dom/sizing';

import {
  IChangedArgs
} from '../common/interfaces';

import {
  CodeEditor, IEditorFactory
} from '../codeeditor';

import {
  MonacoModel
} from './model';

import {
  ObservableVector
} from '../common/observablevector';

/**
 * Monaco code editor.
 */
export
class MonacoCodeEditor implements CodeEditor.IEditor {
  /**
   * Id of the editor.
   * FIXME: where one should get it?
   */
  uuid: string;

  // FIXME remove when https://github.com/Microsoft/monaco-editor/issues/103 is resolved
  autoSizing: boolean = false;
  minHeight: number = -1;

  /**
   * Construct a Monaco editor.
   */
  constructor(host: HTMLElement, options?: monaco.editor.IEditorConstructionOptions, services?: monaco.editor.IEditorOverrideServices) {
    this._editor = monaco.editor.create(host, options, services);
    this._listeners.push(this.editor.onDidChangeModel(e => this._onDidChangeModel(e)));
    this._listeners.push(this.editor.onDidChangeConfiguration(e => this._onDidChangeConfiguration(e)));
    this._listeners.push(this.editor.onDidChangeCursorPosition(e => this._onDidChangeCursorPosition(e)));
    this._listeners.push(this.editor.onDidChangeCursorSelection(e => this._onDidChangeCursorSelection(e)));

    this._model = new MonacoModel();
    this._model.valueChanged.connect(this._onValueChanged, this);
    this._model.selections.changed.connect(this._onSelectionChanged, this);

    this._model.model = this._editor.getModel();
  }

  /**
   * Whether the editor is disposed.
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
    this._model.dispose();

    while (this._listeners.length !== 0)  {
      this._listeners.pop().dispose();
    }
    this._editor.dispose();
  }

  protected _onDidChangeModel(event: monaco.editor.IModelChangedEvent) {
    this._model.model = this.editor.getModel();
  }

  private _onSelectionChanged(sender: ObservableVector<CodeEditor.ITextSelection>, change: ObservableVector.IChangedArgs<CodeEditor.ITextSelection>): void {
    // TODO 
  }

  protected _onDidChangeConfiguration(event: monaco.editor.IConfigurationChangedEvent) {
    this.autoresize();
  }

  protected _onValueChanged(model: MonacoModel, args: IChangedArgs<string>) {
    this.autoresize();
  }

  protected _onDidChangeCursorPosition(event: monaco.editor.ICursorPositionChangedEvent) {
    const cursorPosition = MonacoModel.toPosition(event.position);
    this.setCursorPosition(cursorPosition);
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
  refresh(): void {
    this.autoresize();
  }

  /**
   * Set the size of the editor in pixels.
   */
  setSize(width: number, height: number): void {
    this.resize(new ResizeMessage(width, height));
  }

  /**
   * Scroll the given cursor position into view.
   */
  scrollIntoView(pos: CodeEditor.IPosition, margin?: number): void {
    this.editor.revealPositionInCenter(MonacoModel.toMonacoPosition(pos));
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
  get model(): MonacoModel | null {
    return this._model;
  }

  get onKeyDown(): CodeEditor.KeydownHandler | null {
    return this._handler;
  }
  set onKeyDown(value: CodeEditor.KeydownHandler) {
    this._handler = value;
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
    return this.editor.getConfiguration().fontInfo.lineHeight;
  }

  get charWidth(): number {
    // TODO css measurement
    return this.editor.getConfiguration().fontInfo.fontSize;
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
   * Get the primary cursor position.
   */
  getCursorPosition(): CodeEditor.IPosition {
    return this.model.getCursorPosition(this.uuid);
  };

  /**
   * Set the primary cursor position.
   */
  setCursorPosition(position: CodeEditor.IPosition): void {
    this.model.setCursorPosition(this.uuid, position);
  };

  /** Editor will be hidden by setting width to 0. On show we need to recalculate again */
  protected autoresize(): void {
    if (this.autoSizing) {
      this.resize();
    }
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
    if (!this.autoSizing) {
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
    return Math.max(defaultHeight, editorHeight);
  }

  protected _isDisposed = false;
  protected _model: MonacoModel;
  protected _listeners: monaco.IDisposable[] = [];
  protected _editor: monaco.editor.IStandaloneCodeEditor;
  protected _handler: CodeEditor.KeydownHandler | null = null;

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
