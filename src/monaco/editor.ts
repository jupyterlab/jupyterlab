// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  boxSizing as computeBoxSizing, IBoxSizing
} from 'phosphor/lib/dom/sizing';

import {
  IChangedArgs
} from '../common/interfaces';

import {
  CodeEditor
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
   */
  readonly uuid: string;

  // TODO: implement synchronization with an editor state or better get rid of it
  readonly selections = new ObservableVector<CodeEditor.ITextSelection>();

  // FIXME remove when https://github.com/Microsoft/monaco-editor/issues/103 is resolved
  autoSizing: boolean;
  minHeight: number;

  onKeyDown: CodeEditor.KeydownHandler | null = null;

  /**
   * Construct a Monaco editor.
   */
  constructor(options: MonacoCodeEditor.IOptions) {
    this.uuid = options.uuid;
    this.autoSizing = (options.editorOptions && options.editorOptions.autoSizing) || false;
    this.minHeight = (options.editorOptions && options.editorOptions.minHeight) || -1;

    this._editor = monaco.editor.create(options.domElement, options.editorOptions, options.editorServices);
    this._listeners.push(this.editor.onDidChangeModel(e => this._onDidChangeModel(e)));
    this._listeners.push(this.editor.onDidChangeConfiguration(e => this._onDidChangeConfiguration(e)));
    this._listeners.push(this.editor.onKeyDown(e => this._onKeyDown(e)));

    this._model = options.monacoModel || new MonacoModel();
    this._model.valueChanged.connect(this._onValueChanged, this);
    this._model.model = this._editor.getModel();
    this._model.owners.pushBack(this);
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

    while (this._listeners.length !== 0) {
      this._listeners.pop() !.dispose();
    }
    this._editor.dispose();
  }

  protected _onDidChangeModel(event: monaco.editor.IModelChangedEvent) {
    this._model.model = this.editor.getModel();
  }

  protected _onDidChangeConfiguration(event: monaco.editor.IConfigurationChangedEvent) {
    this.autoresize();
  }

  protected _onValueChanged(model: MonacoModel, args: IChangedArgs<string>) {
    this.autoresize();
  }

  protected _onKeyDown(event: monaco.IKeyboardEvent) {
    if (this.onKeyDown && this.isOnKeyDownContext())  {
      this.onKeyDown(this, event.browserEvent);
    }
  }

  protected isOnKeyDownContext() {
    return !this.isSuggestWidgetVisible();
  }

  protected isSuggestWidgetVisible(): boolean {
    return this.editor._contextKeyService.getContextKeyValue<boolean>('suggestWidgetVisible');
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
    setTimeout(() => this.autoresize());
  }

  /**
   * Set the size of the editor in pixels.
   */
  setSize(width: number, height: number): void {
    const dimension = width && height ? { width, height } : null;
    this.resize(dimension);
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
  get model(): MonacoModel {
    return this._model;
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
    return MonacoModel.toPosition(this._editor.getPosition());
  };

  /**
   * Set the primary cursor position.
   */
  setCursorPosition(position: CodeEditor.IPosition): void {
    this._editor.setPosition(MonacoModel.toMonacoPosition(position));
  };

  getSelection(): CodeEditor.ITextSelection {
    const selection = this._editor.getSelection();
    return {
      start: this.model.model.getOffsetAt(selection.getStartPosition()),
      end: this.model.model.getOffsetAt(selection.getEndPosition())
    };
  }

  setSelection(selection: CodeEditor.ITextSelection) {
    const startPosition = this.model.model.getPositionAt(selection.start);
    const endPosition = this.model.model.getPositionAt(selection.end);
    this._editor.setSelection({
      startLineNumber: startPosition.lineNumber,
      startColumn: startPosition.column,
      endLineNumber: endPosition.lineNumber,
      endColumn: endPosition.column
    });
  }

  /** Editor will be hidden by setting width to 0. On show we need to recalculate again */
  protected autoresize(): void {
    if (this.autoSizing) {
      this.resize(null);
    }
  }

  protected resize(dimension: monaco.editor.IDimension | null): void {
    const hostNode = this.getHostNode();
    if (hostNode) {
      const layoutSize = this.computeLayoutSize(hostNode, dimension);
      this.editor.layout(layoutSize);
    }
  }

  protected computeLayoutSize(hostNode: HTMLElement, dimension: monaco.editor.IDimension | null): monaco.editor.IDimension {
    if (dimension && dimension.width >= 0 && dimension.height >= 0) {
      return dimension;
    }
    const boxSizing = computeBoxSizing(hostNode);

    const width = (!dimension || dimension.width < 0) ?
      this.getWidth(hostNode, boxSizing) :
      dimension.width;

    const height = (!dimension || dimension.height < 0) ?
      this.getHeight(hostNode, boxSizing) :
      dimension.height;

    return { width, height };
  }

  protected getHostNode(): HTMLElement | undefined {
    const domNode = this._editor.getDomNode();
    return domNode ? domNode.parentElement : undefined;
  }

  protected getWidth(hostNode: HTMLElement, boxSizing: IBoxSizing): number {
    return hostNode.offsetWidth - boxSizing.horizontalSum;
  }

  protected getHeight(hostNode: HTMLElement, boxSizing: IBoxSizing): number {
    if (!this.autoSizing) {
      return hostNode.offsetHeight - boxSizing.verticalSum;
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

}

/**
 * A utility functions for Monaco code editor.
 */
export
namespace MonacoCodeEditor {
  export
  interface IEditorConstructionOptions extends monaco.editor.IEditorConstructionOptions {
    autoSizing?: boolean;
    minHeight?: number;
  }
  export interface IOptions {
    uuid: string;
    domElement: HTMLElement;
    editorOptions?: IEditorConstructionOptions;
    editorServices?: monaco.editor.IEditorOverrideServices;
    monacoModel?: MonacoModel;
  }
}
