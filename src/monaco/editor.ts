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

/**
 * Monaco code editor.
 */
export
class MonacoCodeEditor implements CodeEditor.IEditor {

  /**
   * Id of the editor.
   */
  readonly uuid: string;

  /**
   * The selection style of this editor.
   */
  readonly selectionStyle?: CodeEditor.ISelectionStyle;

  /**
   * Whether an editor should be auto resized on a content change.
   *
   * #### Fixme
   * remove when https://github.com/Microsoft/monaco-editor/issues/103 is resolved
   */
  autoSizing?: boolean;

  /**
   * A minimal height of an editor.
   * 
   * #### Fixme
   * remove when https://github.com/Microsoft/monaco-editor/issues/103 is resolved
   */
  minHeight?: number;

  /**
   * Handle keydown events for the editor.
   */
  onKeyDown: CodeEditor.KeydownHandler | null = null;

  /**
   * Construct a Monaco editor.
   */
  constructor(options: MonacoCodeEditor.IOptions) {
    this.uuid = options.uuid;
    this.selectionStyle = options.selectionStyle;

    this.autoSizing = (options.editorOptions && options.editorOptions.autoSizing) || false;
    this.minHeight = (options.editorOptions && options.editorOptions.minHeight) || -1;

    this._editor = monaco.editor.create(options.domElement, options.editorOptions, options.editorServices);
    this._listeners.push(this.editor.onDidChangeModel(e => this._onDidChangeModel(e)));
    this._listeners.push(this.editor.onDidChangeConfiguration(e => this._onDidChangeConfiguration(e)));
    this._listeners.push(this.editor.onKeyDown(e => this._onKeyDown(e)));

    this._model = options.monacoModel || new MonacoModel();
    this._model.valueChanged.connect(this._onValueChanged, this);
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

    while (this._listeners.length !== 0) {
      this._listeners.pop() !.dispose();
    }
    this._editor.dispose();
  }

  /**
   * Handles an editor model change event.
   */
  protected _onDidChangeModel(event: monaco.editor.IModelChangedEvent) {
    this._model.model = this.editor.getModel();
  }

  /**
   * Handles an editor configuration change event.
   */
  protected _onDidChangeConfiguration(event: monaco.editor.IConfigurationChangedEvent) {
    this.autoresize();
  }

  /**
   * Handles a value change event.
   */
  protected _onValueChanged(model: MonacoModel, args: IChangedArgs<string>) {
    this.autoresize();
  }

  /**
   * Handles a key down event.
   */
  protected _onKeyDown(event: monaco.IKeyboardEvent) {
    if (this.onKeyDown && this.isOnKeyDownContext())  {
      if (this.onKeyDown(this, event.browserEvent)) {
        event.preventDefault();
      }
    }
  }

  /**
   * Whether key down event can be propagated to `this.onKeyDown` handler.
   * 
   * #### Returns
   * - if a suggest widget visible then returns `true`
   * - otherwise `false`  
   */
  protected isOnKeyDownContext() {
    return !this.isSuggestWidgetVisible();
  }

  /**
   * Whether a suggest widget is visible.
   */
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
  setSize(dimension: CodeEditor.IDimension | null): void {
    this.resize(dimension);
  }

  /**
   * Reveal the given position in the editor.
   */
  revealPosition(pos: CodeEditor.IPosition): void {
    this.editor.revealPositionInCenter(MonacoModel.toMonacoPosition(pos));
  }

  /**
   * Reveal the given selection in the editor.
   */
  revealSelection(selection: CodeEditor.IRange): void {
    const range = this.toMonacoSelection(selection);
    this.editor.revealRangeInCenter(range);
  }

  /**
   * Get the window coordinates given a cursor position.
   */
  getCoordinate(position: CodeEditor.IPosition): CodeEditor.ICoordinate {
    const monacoPosition = MonacoModel.toMonacoPosition(position);
    const { left, top, height } = this._editor.getScrolledVisiblePosition(monacoPosition);
    const right = left;
    const bottom = top - height;
    return { left, right, top, bottom };
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

  /**
   * The height of a line in the editor in pixels.
   */
  get lineHeight(): number {
    return this.editor.getConfiguration().fontInfo.lineHeight;
  }

  /**
   * The widget of a character in the editor in pixels.
   */
  get charWidth(): number {
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
    this.hideContentWidgets();
  }

  /**
   * Hides all content widgets, e.g. the suggest widget.
   */
  protected hideContentWidgets(): void {
    this.editor.setSelection({
      startColumn: 0,
      startLineNumber: 0,
      endColumn: 0,
      endLineNumber: 0
    });
  }

  /**
   * Returns the primary position of the cursor, never `null`.
   */
  getCursorPosition(): CodeEditor.IPosition {
    return MonacoModel.toPosition(this._editor.getPosition());
  };

  /**
   * Set the primary position of the cursor. This will remove any secondary cursors.
   */
  setCursorPosition(position: CodeEditor.IPosition): void {
    this._editor.setPosition(MonacoModel.toMonacoPosition(position));
  };

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
    const selections = this._editor.getSelections();
    if (selections.length > 0) {
      return selections.map(selection => this.toSelection(selection));
    }
    const position = this.getCursorPosition();
    const monacoSelection = this.toMonacoSelection({
      start: position,
      end: position
    });
    const selection = this.toSelection(monacoSelection);
    return [selection];
  }

  /**
   * Sets the selections for all the cursors, should not be empty.
   * Cursors will be removed or added, as necessary.
   * Passing an empty array resets a cursor position to the start of a document.
   */
  setSelections(selections: CodeEditor.IRange[]): void {
    const ranges = this.toMonacoSelections(selections);
    this._editor.setSelections(ranges);
  }

  /**
   * Converts a monaco selection to an editor selection.
   */
  protected toSelection(selection: monaco.ISelection): CodeEditor.ITextSelection {
    return {
      uuid: this.uuid,
      start: {
        line: selection.selectionStartLineNumber - 1,
        column: selection.selectionStartColumn - 1
      },
      end: {
        line: selection.positionLineNumber - 1,
        column: selection.positionColumn - 1
      },
      style: this.selectionStyle
    };
  }

  /**
   * Converts selections to monaco selections.
   */
  protected toMonacoSelections(selections: CodeEditor.IRange[]): monaco.Selection[] {
    if (selections.length > 0) {
      return selections.map(selection => this.toMonacoSelection(selection));
    }
    return [new monaco.Selection(0, 0, 0, 0)];
  }

  /**
   * Converts a selection to a monaco selection.
   */
  protected toMonacoSelection(range: CodeEditor.IRange): monaco.Selection {
    const start = MonacoModel.toMonacoPosition(range.start);
    const end = MonacoModel.toMonacoPosition(range.end);
    return new monaco.Selection(start.lineNumber, start.column, end.lineNumber, end.column);
  }

  /**
   * Auto resizes the editor acording to the content. 
   */
  protected autoresize(): void {
    if (this.autoSizing) {
      this.resize(null);
    }
  }

  /**
   * Resizes the editor to the given dimension or to the content if the given dimension is `null`.
   */
  protected resize(dimension: monaco.editor.IDimension | null): void {
    const hostNode = this.getHostNode();
    if (hostNode) {
      const layoutSize = this.computeLayoutSize(hostNode, dimension);
      this.editor.layout(layoutSize);
    }
  }

  /**
   * Computes a layout site for the given dimensions.
   */
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

  /**
   * Returns a dom node containing this editor.
   */
  protected getHostNode(): HTMLElement | undefined {
    const domNode = this._editor.getDomNode();
    return domNode ? domNode.parentElement : undefined;
  }

  /**
   * Computes a width based on the given box sizing.
   */
  protected getWidth(hostNode: HTMLElement, boxSizing: IBoxSizing): number {
    return hostNode.offsetWidth - boxSizing.horizontalSum;
  }

  /**
   * Computes a height based on the given box sizing.
   * 
   * #### Notes
   * if auto sizing is enabled then computes a height based on the content size.
   */
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
 * A namespace for `MonacoCodeEditor`.
 */
export
namespace MonacoCodeEditor {
  /**
   * An extension to default monaco editor options.
   */
  export
  interface IEditorConstructionOptions extends monaco.editor.IEditorConstructionOptions {
    /**
     * Whether an editor should be auto resized on a content change.
     *
     * #### Fixme
     * remove when https://github.com/Microsoft/monaco-editor/issues/103 is resolved
     */
    autoSizing?: boolean;
    /**
     * A minimal height of an editor.
     * 
     * #### Fixme
     * remove when https://github.com/Microsoft/monaco-editor/issues/103 is resolved
     */
    minHeight?: number;
  }
  /**
   * An initialization options for a monaco code editor.
   */
  export
  interface IOptions {
    /**
     * The uuid of an editor.
     */
    uuid: string;
    /**
     * A selection style.
     */
    readonly selectionStyle?: CodeEditor.ISelectionStyle;
    /**
     * A dom element that is used as a container for a Monaco editor.
     */
    domElement: HTMLElement;
    /**
     * Monaco editor options.
     */
    editorOptions?: IEditorConstructionOptions;
    /**
     * Monaco editor services.
     */
    editorServices?: monaco.editor.IEditorOverrideServices;
    /**
     * A Monaco based editor model.
     */
    monacoModel?: MonacoModel;
  }
}
