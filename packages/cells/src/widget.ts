/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import { Extension } from '@codemirror/state';

import { EditorView } from '@codemirror/view';

import { ElementExt } from '@lumino/domutils';

import { AttachmentsResolver } from '@jupyterlab/attachments';

import { DOMUtils, ISessionContext } from '@jupyterlab/apputils';

import { ActivityMonitor, IChangedArgs, URLExt } from '@jupyterlab/coreutils';

import { CodeEditor, CodeEditorWrapper } from '@jupyterlab/codeeditor';

import { DirListing } from '@jupyterlab/filebrowser';

import * as nbformat from '@jupyterlab/nbformat';

import {
  IOutputPrompt,
  IStdin,
  OutputArea,
  OutputPrompt,
  SimplifiedOutputArea,
  Stdin
} from '@jupyterlab/outputarea';

import {
  imageRendererFactory,
  IRenderMime,
  IRenderMimeRegistry,
  MimeModel
} from '@jupyterlab/rendermime';

import { Kernel, KernelMessage } from '@jupyterlab/services';

import { IMapChange } from '@jupyter/ydoc';

import { TableOfContentsUtils } from '@jupyterlab/toc';

import { ITranslator, nullTranslator } from '@jupyterlab/translation';

import { addIcon, collapseIcon, expandIcon } from '@jupyterlab/ui-components';

import { JSONObject, PromiseDelegate, UUID } from '@lumino/coreutils';

import { some } from '@lumino/algorithm';

import { Drag } from '@lumino/dragdrop';

import { Message, MessageLoop } from '@lumino/messaging';

import { Debouncer } from '@lumino/polling';

import { ISignal, Signal } from '@lumino/signaling';

import { Panel, PanelLayout, Widget } from '@lumino/widgets';

import { InputCollapser, OutputCollapser } from './collapser';

import {
  CellFooter,
  CellHeader,
  ICellFooter,
  ICellHeader
} from './headerfooter';

import { IInputPrompt, InputArea, InputPrompt } from './inputarea';

import {
  CellModel,
  IAttachmentsCellModel,
  ICellModel,
  ICodeCellModel,
  IMarkdownCellModel,
  IRawCellModel
} from './model';

import { InputPlaceholder, OutputPlaceholder } from './placeholder';

import { ResizeHandle } from './resizeHandle';

/**
 * The CSS class added to cell widgets.
 */
const CELL_CLASS = 'jp-Cell';

/**
 * The CSS class added to the cell header.
 */
const CELL_HEADER_CLASS = 'jp-Cell-header';

/**
 * The CSS class added to the cell footer.
 */
const CELL_FOOTER_CLASS = 'jp-Cell-footer';

/**
 * The CSS class added to the cell input wrapper.
 */
const CELL_INPUT_WRAPPER_CLASS = 'jp-Cell-inputWrapper';

/**
 * The CSS class added to the cell output wrapper.
 */
const CELL_OUTPUT_WRAPPER_CLASS = 'jp-Cell-outputWrapper';

/**
 * The CSS class added to the cell input area.
 */
const CELL_INPUT_AREA_CLASS = 'jp-Cell-inputArea';

/**
 * The CSS class added to the cell output area.
 */
const CELL_OUTPUT_AREA_CLASS = 'jp-Cell-outputArea';

/**
 * The CSS class added to the cell input collapser.
 */
const CELL_INPUT_COLLAPSER_CLASS = 'jp-Cell-inputCollapser';

/**
 * The CSS class added to the cell output collapser.
 */
const CELL_OUTPUT_COLLAPSER_CLASS = 'jp-Cell-outputCollapser';

/**
 * The class name added to the cell when dirty.
 */
const DIRTY_CLASS = 'jp-mod-dirty';

/**
 * The class name added to code cells.
 */
const CODE_CELL_CLASS = 'jp-CodeCell';

/**
 * The class name added to markdown cells.
 */
const MARKDOWN_CELL_CLASS = 'jp-MarkdownCell';

/**
 * The class name added to rendered markdown output widgets.
 */
const MARKDOWN_OUTPUT_CLASS = 'jp-MarkdownOutput';

const MARKDOWN_HEADING_COLLAPSED = 'jp-MarkdownHeadingCollapsed';

const HEADING_COLLAPSER_CLASS = 'jp-collapseHeadingButton';

const SHOW_HIDDEN_CELLS_CLASS = 'jp-showHiddenCellsButton';

/**
 * The class name added to raw cells.
 */
const RAW_CELL_CLASS = 'jp-RawCell';

/**
 * The class name added to a rendered input area.
 */
const RENDERED_CLASS = 'jp-mod-rendered';

const NO_OUTPUTS_CLASS = 'jp-mod-noOutputs';

/**
 * The text applied to an empty markdown cell.
 */
const DEFAULT_MARKDOWN_TEXT = 'Type Markdown and LaTeX: $ α^2 $';

/**
 * The timeout to wait for change activity to have ceased before rendering.
 */
const RENDER_TIMEOUT = 1000;

/**
 * The mime type for a rich contents drag object.
 */
const CONTENTS_MIME_RICH = 'application/x-jupyter-icontentsrich';

/** ****************************************************************************
 * Cell
 ******************************************************************************/

/**
 * A base cell widget.
 */
export class Cell<T extends ICellModel = ICellModel> extends Widget {
  /**
   * Construct a new base cell widget.
   */
  constructor(options: Cell.IOptions<T>) {
    super();
    this.addClass(CELL_CLASS);
    const model = (this._model = options.model);

    this.contentFactory = options.contentFactory;
    this.layout = options.layout ?? new PanelLayout();
    // Set up translator for aria labels
    this.translator = options.translator ?? nullTranslator;

    // For cells disable searching with CodeMirror search panel.
    this._editorConfig = { searchWithCM: false, ...options.editorConfig };
    this._editorExtensions = options.editorExtensions ?? [];
    this._editorExtensions.push(this._scrollHandlerExtension);
    this._placeholder = true;
    this._inViewport = null;
    this.placeholder = options.placeholder ?? true;

    model.metadataChanged.connect(this.onMetadataChanged, this);
  }

  /**
   * Initialize view state from model.
   *
   * #### Notes
   * Should be called after construction. For convenience, returns this, so it
   * can be chained in the construction, like `new Foo().initializeState();`
   */
  initializeState(): this {
    this.loadCollapseState();
    this.loadEditableState();
    return this;
  }

  /**
   * The content factory used by the widget.
   */
  readonly contentFactory: Cell.IContentFactory;

  /**
   * Signal to indicate that widget has changed visibly (in size, in type, etc)
   */
  get displayChanged(): ISignal<this, void> {
    return this._displayChanged;
  }

  /**
   * Whether the cell is in viewport or not.
   *
   * #### Notes
   * This property is managed by the windowed container which holds the cell.
   * When a cell is not in a windowed container, it always returns `false`,
   * but this may change in the future major version.
   */
  get inViewport(): boolean {
    return this._inViewport ?? false;
  }
  set inViewport(v: boolean) {
    if (this._inViewport !== v) {
      this._inViewport = v;
      this._inViewportChanged.emit(this._inViewport);
    }
  }

  /**
   * Will emit true just after the node is attached to the DOM
   * Will emit false just before the node is detached of the DOM
   */
  get inViewportChanged(): ISignal<Cell, boolean> {
    return this._inViewportChanged;
  }

  /**
   * Whether the cell is a placeholder not yet fully rendered or not.
   */
  protected get placeholder(): boolean {
    return this._placeholder;
  }
  protected set placeholder(v: boolean) {
    if (this._placeholder !== v && v === false) {
      this.initializeDOM();
      this._placeholder = v;
      this._ready.resolve();
    }
  }

  /**
   * Get the prompt node used by the cell.
   */
  get promptNode(): HTMLElement | null {
    if (this.placeholder) {
      return null;
    }

    if (!this._inputHidden) {
      return this._input!.promptNode;
    } else {
      return (this._inputPlaceholder!.node as HTMLElement)
        .firstElementChild as HTMLElement;
    }
  }

  /**
   * Get the CodeEditorWrapper used by the cell.
   */
  get editorWidget(): CodeEditorWrapper | null {
    return this._input?.editorWidget ?? null;
  }

  /**
   * Get the CodeEditor used by the cell.
   */
  get editor(): CodeEditor.IEditor | null {
    return this._input?.editor ?? null;
  }

  /**
   * Editor configuration
   */
  get editorConfig(): Record<string, any> {
    return this._editorConfig;
  }

  /**
   * Cell headings
   */
  get headings(): Cell.IHeading[] {
    return new Array<Cell.IHeading>();
  }

  /**
   * Get the model used by the cell.
   */
  get model(): T {
    return this._model;
  }

  /**
   * Get the input area for the cell.
   */
  get inputArea(): InputArea | null {
    return this._input;
  }

  /**
   * The read only state of the cell.
   */
  get readOnly(): boolean {
    return this._readOnly;
  }
  set readOnly(value: boolean) {
    if (value === this._readOnly) {
      return;
    }
    this._readOnly = value;
    if (this.syncEditable) {
      this.saveEditableState();
    }
    this.update();
  }

  /**
   * Whether the cell is a placeholder that defer rendering
   *
   * #### Notes
   * You can wait for the promise `Cell.ready` to wait for the
   * cell to be rendered.
   */
  isPlaceholder(): boolean {
    return this.placeholder;
  }

  /**
   * Save view editable state to model
   */
  saveEditableState(): void {
    const { sharedModel } = this.model;
    const current = sharedModel.getMetadata('editable') as unknown as boolean;

    if (
      (this.readOnly && current === false) ||
      (!this.readOnly && current === undefined)
    ) {
      return;
    }
    if (this.readOnly) {
      sharedModel.setMetadata('editable', false);
    } else {
      sharedModel.deleteMetadata('editable');
    }
  }

  /**
   * Load view editable state from model.
   */
  loadEditableState(): void {
    this.readOnly =
      (this.model.sharedModel.getMetadata('editable') as unknown as boolean) ===
      false;
  }

  /**
   * A promise that resolves when the widget renders for the first time.
   */
  get ready(): Promise<void> {
    return this._ready.promise;
  }

  /**
   * Set the prompt for the widget.
   * @deprecated - set the `executionState` on the model instead.
   */
  setPrompt(value: string): void {
    return this._setPrompt(value);
  }

  /**
   * Set the prompt for the widget.
   *
   * Note: this method is protected because it is needed in the CodeCell subclass,
   * but it cannot be defined there because input is private to Cell class.
   */
  protected _setPrompt(value: string): void {
    this.prompt = value;
    this._input?.setPrompt(value);
  }

  /**
   * The view state of input being hidden.
   */
  get inputHidden(): boolean {
    return this._inputHidden;
  }
  set inputHidden(value: boolean) {
    if (this._inputHidden === value) {
      return;
    }
    if (!this.placeholder) {
      const layout = this._inputWrapper!.layout as PanelLayout;
      if (value) {
        this._input!.parent = null;
        if (this._inputPlaceholder) {
          this._inputPlaceholder.text = this.model.sharedModel
            .getSource()
            .split('\n')?.[0];
        }
        layout.addWidget(this._inputPlaceholder!);
      } else {
        this._inputPlaceholder!.parent = null;
        layout.addWidget(this._input!);
      }
    }
    this._inputHidden = value;
    if (this.syncCollapse) {
      this.saveCollapseState();
    }
    this.handleInputHidden(value);
  }

  /**
   * Save view collapse state to model
   */
  saveCollapseState(): void {
    const jupyter = { ...(this.model.getMetadata('jupyter') as any) };

    if (
      (this.inputHidden && jupyter.source_hidden === true) ||
      (!this.inputHidden && jupyter.source_hidden === undefined)
    ) {
      return;
    }

    if (this.inputHidden) {
      jupyter.source_hidden = true;
    } else {
      delete jupyter.source_hidden;
    }
    if (Object.keys(jupyter).length === 0) {
      this.model.deleteMetadata('jupyter');
    } else {
      this.model.setMetadata('jupyter', jupyter);
    }
  }

  /**
   * Revert view collapse state from model.
   */
  loadCollapseState(): void {
    const jupyter = (this.model.getMetadata('jupyter') as any) ?? {};
    this.inputHidden = !!jupyter.source_hidden;
  }

  /**
   * Handle the input being hidden.
   *
   * #### Notes
   * This is called by the `inputHidden` setter so that subclasses
   * can perform actions upon the input being hidden without accessing
   * private state.
   */
  protected handleInputHidden(value: boolean): void {
    return;
  }

  /**
   * Whether to sync the collapse state to the cell model.
   */
  get syncCollapse(): boolean {
    return this._syncCollapse;
  }
  set syncCollapse(value: boolean) {
    if (this._syncCollapse === value) {
      return;
    }
    this._syncCollapse = value;
    if (value) {
      this.loadCollapseState();
    }
  }

  /**
   * Whether to sync the editable state to the cell model.
   */
  get syncEditable(): boolean {
    return this._syncEditable;
  }
  set syncEditable(value: boolean) {
    if (this._syncEditable === value) {
      return;
    }
    this._syncEditable = value;
    if (value) {
      this.loadEditableState();
    }
  }

  /**
   * Clone the cell, using the same model.
   */
  clone(): Cell<T> {
    const constructor = this.constructor as typeof Cell;
    return new constructor({
      model: this.model,
      contentFactory: this.contentFactory,
      placeholder: false,
      translator: this.translator
    });
  }

  /**
   * Dispose of the resources held by the widget.
   */
  dispose(): void {
    // Do nothing if already disposed.
    if (this.isDisposed) {
      return;
    }
    this._resizeDebouncer.dispose();
    this._input = null!;
    this._model = null!;
    this._inputWrapper = null!;
    this._inputPlaceholder = null!;
    super.dispose();
  }

  /**
   * Update the editor configuration with the partial provided dictionary.
   *
   * @param v Partial editor configuration
   */
  updateEditorConfig(v: Record<string, any>): void {
    this._editorConfig = { ...this._editorConfig, ...v };
    if (this.editor) {
      this.editor.setBaseOptions(this._editorConfig);
    }
  }

  /**
   * Signal emitted when cell requests scrolling to its element.
   */
  get scrollRequested(): ISignal<Cell, Cell.IScrollRequest> {
    return this._scrollRequested;
  }

  /**
   * Create children widgets.
   */
  protected initializeDOM(): void {
    if (!this.placeholder) {
      return;
    }

    const contentFactory = this.contentFactory;
    const model = this._model;

    // Header
    const header = contentFactory.createCellHeader();
    header.addClass(CELL_HEADER_CLASS);
    (this.layout as PanelLayout).addWidget(header);

    // Input
    const inputWrapper = (this._inputWrapper = new Panel());
    inputWrapper.addClass(CELL_INPUT_WRAPPER_CLASS);
    const inputCollapser = new InputCollapser();
    inputCollapser.addClass(CELL_INPUT_COLLAPSER_CLASS);
    const input = (this._input = new InputArea({
      model,
      contentFactory,
      editorOptions: this.getEditorOptions()
    }));
    input.addClass(CELL_INPUT_AREA_CLASS);
    inputWrapper.addWidget(inputCollapser);
    inputWrapper.addWidget(input);
    (this.layout as PanelLayout).addWidget(inputWrapper);

    this._inputPlaceholder = new InputPlaceholder({
      callback: () => {
        this.inputHidden = !this.inputHidden;
      },
      text: input.model.sharedModel.getSource().split('\n')[0],
      translator: this.translator
    });

    input.model.contentChanged.connect((sender, args) => {
      if (this._inputPlaceholder && this.inputHidden) {
        this._inputPlaceholder.text = sender.sharedModel
          .getSource()
          .split('\n')?.[0];
      }
    });

    if (this.inputHidden) {
      input.parent = null;
      (inputWrapper.layout as PanelLayout).addWidget(this._inputPlaceholder!);
    }

    // Footer
    const footer = this.contentFactory.createCellFooter();
    footer.addClass(CELL_FOOTER_CLASS);
    (this.layout as PanelLayout).addWidget(footer);
  }

  /**
   * Get the editor options at initialization.
   *
   * @returns Editor options
   */
  protected getEditorOptions(): InputArea.IOptions['editorOptions'] {
    return { config: this.editorConfig, extensions: this._editorExtensions };
  }

  /**
   * Handle `before-attach` messages.
   */
  protected onBeforeAttach(msg: Message): void {
    if (this.placeholder) {
      this.placeholder = false;
    }
  }

  /**
   * Handle `after-attach` messages.
   */
  protected onAfterAttach(msg: Message): void {
    this.update();
  }

  /**
   * Handle `'activate-request'` messages.
   */
  protected onActivateRequest(msg: Message): void {
    this.editor?.focus();
  }

  /**
   * Handle `resize` messages.
   */
  protected onResize(msg: Widget.ResizeMessage): void {
    void this._resizeDebouncer.invoke();
  }

  /**
   * Handle `update-request` messages.
   */
  protected onUpdateRequest(msg: Message): void {
    if (!this._model) {
      return;
    }
    // Handle read only state.
    if (this.editor?.getOption('readOnly') !== this._readOnly) {
      this.editor?.setOption('readOnly', this._readOnly);
    }
  }

  protected onContentChanged() {
    if (this.inputHidden && this._inputPlaceholder) {
      this._inputPlaceholder.text = this.model.sharedModel
        .getSource()
        .split('\n')?.[0];
    }
  }

  /**
   * Handle changes in the metadata.
   */
  protected onMetadataChanged(model: CellModel, args: IMapChange): void {
    switch (args.key) {
      case 'jupyter':
        if (this.syncCollapse) {
          this.loadCollapseState();
        }
        break;
      case 'editable':
        if (this.syncEditable) {
          this.loadEditableState();
        }
        break;
      default:
        break;
    }
  }

  protected prompt = '';
  protected translator: ITranslator;
  protected _displayChanged = new Signal<this, void>(this);
  protected _scrollRequested = new Signal<Cell, Cell.IScrollRequest>(this);
  protected _inViewport: boolean | null;

  /**
   * Editor extension emitting `scrollRequested` signal on scroll.
   *
   * Scrolling within editor will be prevented when a cell is out out viewport.
   * Windowed containers including cells should listen to the scroll request
   * signal and invoke the `scrollWithinCell()` callback after scrolling the cell
   * back into the view (and after updating the `inViewport` property).
   */
  private _scrollHandlerExtension = EditorView.scrollHandler.of(
    (view, range, options) => {
      // When cell is in the viewport we can scroll within the editor immediately.
      // When cell is out of viewport, the windowed container needs to first
      // scroll the cell into the viewport (otherwise CodeMirror is unable to
      // calculate the correct scroll delta) before invoking scrolling in editor.
      const inWindowedContainer = this._inViewport !== null;
      const preventDefault = inWindowedContainer && !this._inViewport;
      this._scrollRequested.emit({
        defaultPrevented: preventDefault,
        scrollWithinCell: () => {
          view.dispatch({
            effects: EditorView.scrollIntoView(range, options)
          });
        }
      });
      return preventDefault;
    }
  );

  private _editorConfig: Record<string, any> = {};
  private _editorExtensions: Extension[] = [];
  private _input: InputArea | null;
  private _inputHidden = false;
  private _inputWrapper: Widget | null;
  private _inputPlaceholder: InputPlaceholder | null;
  private _inViewportChanged: Signal<Cell, boolean> = new Signal<Cell, boolean>(
    this
  );
  private _model: T;
  private _placeholder: boolean;
  private _readOnly = false;
  private _ready = new PromiseDelegate<void>();
  private _resizeDebouncer = new Debouncer(() => {
    this._displayChanged.emit();
  }, 0);
  private _syncCollapse = false;
  private _syncEditable = false;
}

/**
 * The namespace for the `Cell` class statics.
 */
export namespace Cell {
  /**
   * An options object for initializing a cell widget.
   */
  export interface IOptions<T extends ICellModel> {
    /**
     * The model used by the cell.
     */
    model: T;

    /**
     * The factory object for customizable cell children.
     */
    contentFactory: IContentFactory;

    /**
     * The configuration options for the text editor widget.
     */
    editorConfig?: Record<string, any>;

    /**
     * Editor extensions to be added.
     */
    editorExtensions?: Extension[];

    /**
     * Cell widget layout.
     */
    layout?: PanelLayout;

    /**
     * The maximum number of output items to display in cell output.
     */
    maxNumberOutputs?: number;

    /**
     * Show placeholder text for standard input
     */
    showInputPlaceholder?: boolean;

    /**
     * Whether to split stdin line history by kernel session or keep globally accessible.
     */
    inputHistoryScope?: 'global' | 'session';

    /**
     * Whether this cell is a placeholder for future rendering.
     */
    placeholder?: boolean;

    /**
     * The application language translator.
     */
    translator?: ITranslator;
  }

  /**
   * Cell heading
   */
  export interface IHeading {
    /**
     * Heading text.
     */
    text: string;

    /**
     * HTML heading level.
     */
    level: number;

    /**
     * Index of the output containing the heading
     */
    outputIndex?: number;

    /**
     * Type of heading
     */
    type: HeadingType;
  }

  /**
   * Type of headings
   */
  export enum HeadingType {
    /**
     * Heading from HTML output
     */
    HTML,
    /**
     * Heading from Markdown cell or Markdown output
     */
    Markdown
  }

  /**
   * The factory object for customizable cell children.
   *
   * This is used to allow users of cells to customize child content.
   *
   * This inherits from `OutputArea.IContentFactory` to avoid needless nesting and
   * provide a single factory object for all notebook/cell/outputarea related
   * widgets.
   */
  export interface IContentFactory
    extends OutputArea.IContentFactory,
      InputArea.IContentFactory {
    /**
     * Create a new cell header for the parent widget.
     */
    createCellHeader(): ICellHeader;

    /**
     * Create a new cell header for the parent widget.
     */
    createCellFooter(): ICellFooter;
  }

  /**
   * The default implementation of an `IContentFactory`.
   *
   * This includes a CodeMirror editor factory to make it easy to use out of the box.
   */
  export class ContentFactory implements IContentFactory {
    /**
     * Create a content factory for a cell.
     */
    constructor(options: ContentFactory.IOptions) {
      this._editorFactory = options.editorFactory;
    }

    /**
     * The readonly editor factory that create code editors
     */
    get editorFactory(): CodeEditor.Factory {
      return this._editorFactory;
    }

    /**
     * Create a new cell header for the parent widget.
     */
    createCellHeader(): ICellHeader {
      return new CellHeader();
    }

    /**
     * Create a new cell footer for the parent widget.
     */
    createCellFooter(): ICellFooter {
      return new CellFooter();
    }

    /**
     * Create an input prompt.
     */
    createInputPrompt(): IInputPrompt {
      return new InputPrompt();
    }

    /**
     * Create the output prompt for the widget.
     */
    createOutputPrompt(): IOutputPrompt {
      return new OutputPrompt();
    }

    /**
     * Create an stdin widget.
     */
    createStdin(options: Stdin.IOptions): IStdin {
      return new Stdin(options);
    }

    private _editorFactory: CodeEditor.Factory;
  }

  /**
   * A namespace for cell content factory.
   */
  export namespace ContentFactory {
    /**
     * Options for the content factory.
     */
    export interface IOptions {
      /**
       * The editor factory used by the content factory.
       */
      editorFactory: CodeEditor.Factory;
    }
  }

  /**
   * Value of the signal emitted by cell on editor scroll request.
   */
  export interface IScrollRequest {
    /**
     * Scrolls to the target cell part, fulfilling the scroll request.
     *
     * ### Notes
     * This method is intended for use by windowed containers that
     * require the cell to be first scrolled into the viewport to
     * then enable proper scrolling within cell.
     */
    scrollWithinCell: (options: { scroller: HTMLElement }) => void;
    /**
     * Whether the default scrolling was prevented due to the cell being out of viewport.
     */
    defaultPrevented: boolean;
  }
}

/** ****************************************************************************
 * CodeCell
 ******************************************************************************/

/**
 * Code cell layout
 *
 * It will not detached the output area when the cell is detached.
 */
export class CodeCellLayout extends PanelLayout {
  /**
   * A message handler invoked on a `'before-attach'` message.
   *
   * #### Notes
   * The default implementation of this method forwards the message
   * to all widgets. It assumes all widget nodes are attached to the
   * parent widget node.
   *
   * This may be reimplemented by subclasses as needed.
   */
  protected onBeforeAttach(msg: Message): void {
    let beforeOutputArea = true;
    const outputAreaWrapper = this.parent!.node.firstElementChild;
    for (const widget of this) {
      if (outputAreaWrapper) {
        if (widget.node === outputAreaWrapper) {
          beforeOutputArea = false;
        } else {
          MessageLoop.sendMessage(widget, msg);

          if (beforeOutputArea) {
            this.parent!.node.insertBefore(widget.node, outputAreaWrapper);
          } else {
            this.parent!.node.appendChild(widget.node);
          }

          // Force setting isVisible to true as it requires the parent widget to be
          // visible. But that flag will be set only during the `onAfterAttach` call.
          if (!this.parent!.isHidden) {
            widget.setFlag(Widget.Flag.IsVisible);
          }

          // Not called in NotebookWindowedLayout to avoid outputArea
          // widgets unwanted update or reset.
          MessageLoop.sendMessage(widget, Widget.Msg.AfterAttach);
        }
      }
    }
  }

  /**
   * A message handler invoked on an `'after-detach'` message.
   *
   * #### Notes
   * The default implementation of this method forwards the message
   * to all widgets. It assumes all widget nodes are attached to the
   * parent widget node.
   *
   * This may be reimplemented by subclasses as needed.
   */
  protected onAfterDetach(msg: Message): void {
    for (const widget of this) {
      // TODO we could improve this further by removing outputs based
      // on their mime type (for example plain/text or markdown could safely be detached)
      // If the cell is out of the view port, its children are already detached -> skip detaching
      if (
        !widget.hasClass(CELL_OUTPUT_WRAPPER_CLASS) &&
        widget.node.isConnected
      ) {
        // Not called in NotebookWindowedLayout for windowed notebook
        MessageLoop.sendMessage(widget, Widget.Msg.BeforeDetach);

        this.parent!.node.removeChild(widget.node);

        MessageLoop.sendMessage(widget, msg);
      }
    }
  }
}

/**
 * A widget for a code cell.
 */
export class CodeCell extends Cell<ICodeCellModel> {
  /**
   * Construct a code cell widget.
   */
  constructor(options: CodeCell.IOptions) {
    super({ layout: new CodeCellLayout(), ...options, placeholder: true });
    this.addClass(CODE_CELL_CLASS);
    const trans = this.translator.load('jupyterlab');

    // Only save options not handled by parent constructor.
    const rendermime = (this._rendermime = options.rendermime);
    const contentFactory = this.contentFactory;
    const model = this.model;
    this.maxNumberOutputs = options.maxNumberOutputs;

    // Note that modifying the below label warrants one to also modify
    // the same in this._outputLengthHandler. Ideally, this label must
    // have been a constant and used in both places but it is not done
    // so because of limitations in the translation manager.
    const ariaLabel =
      model.outputs.length === 0
        ? trans.__('Code Cell Content')
        : trans.__('Code Cell Content with Output');
    this.node.setAttribute('aria-label', ariaLabel);

    const output = (this._output = new OutputArea({
      model: this.model.outputs,
      rendermime,
      contentFactory: contentFactory,
      maxNumberOutputs: this.maxNumberOutputs,
      translator: this.translator,
      promptOverlay: true,
      inputHistoryScope: options.inputHistoryScope,
      showInputPlaceholder: options.showInputPlaceholder
    }));
    output.node.addEventListener('keydown', this._detectCaretMovementInOuput);

    output.addClass(CELL_OUTPUT_AREA_CLASS);
    output.toggleScrolling.connect(() => {
      this.outputsScrolled = !this.outputsScrolled;
    });
    output.initialize.connect(() => {
      this.updatePromptOverlayIcon();
    });
    // Defer setting placeholder as OutputArea must be instantiated before initializing the DOM
    this.placeholder = options.placeholder ?? true;

    model.outputs.changed.connect(this.onOutputChanged, this);
    model.outputs.stateChanged.connect(this.onOutputChanged, this);
    model.stateChanged.connect(this.onStateChanged, this);
  }

  /**
   * Detect the movement of the caret in the output area.
   *
   * Emits scroll request if the caret moved.
   */
  private _detectCaretMovementInOuput = (e: KeyboardEvent) => {
    const inWindowedContainer = this._inViewport !== null;
    const defaultPrevented = inWindowedContainer && !this._inViewport;

    // Because we do not want to scroll on any key, but only on keys which
    // move the caret (this on keys which cause input and on keys like left,
    // right, top, bottom arrow, home, end, page down/up - but only if the
    // cursor is not at the respective end of the input) we need to listen
    // to the `selectionchange` event on target inputs/textareas, etc.
    const target = e.target;

    if (!target || !(target instanceof HTMLElement)) {
      return;
    }

    // Make sure the previous listener gets disconnected
    if (this._lastTarget) {
      this._lastTarget.removeEventListener(
        'selectionchange',
        this._lastOnCaretMovedHandler
      );
      document.removeEventListener(
        'selectionchange',
        this._lastOnCaretMovedHandler
      );
    }

    const onCaretMoved = () => {
      this._scrollRequested.emit({
        scrollWithinCell: ({ scroller }) => {
          ElementExt.scrollIntoViewIfNeeded(scroller, target);
        },
        defaultPrevented
      });
    };

    // Remember the most recent target/handler to disconnect them next time.
    this._lastTarget = target;
    this._lastOnCaretMovedHandler = onCaretMoved;

    // Firefox only supports `selectionchange` on the actual input element,
    // all other browsers only support it on the top-level document.
    target.addEventListener('selectionchange', onCaretMoved, { once: true });
    document.addEventListener('selectionchange', onCaretMoved, {
      once: true
    });

    // Schedule removal of the listener.
    setTimeout(() => {
      target.removeEventListener('selectionchange', onCaretMoved);
      document.removeEventListener('selectionchange', onCaretMoved);
    }, 250);
  };

  /**
   * Maximum number of outputs to display.
   */
  protected maxNumberOutputs: number | undefined;

  /**
   * Create children widgets.
   */
  protected initializeDOM(): void {
    if (!this.placeholder) {
      return;
    }

    super.initializeDOM();

    this._updatePrompt();

    // Insert the output before the cell footer.
    const outputWrapper = (this._outputWrapper = new Panel());
    outputWrapper.addClass(CELL_OUTPUT_WRAPPER_CLASS);
    const outputCollapser = new OutputCollapser();
    outputCollapser.addClass(CELL_OUTPUT_COLLAPSER_CLASS);
    outputWrapper.addWidget(outputCollapser);
    // Set a CSS if there are no outputs, and connect a signal for future
    // changes to the number of outputs. This is for conditional styling
    // if there are no outputs.
    if (this.model.outputs.length === 0) {
      this.addClass(NO_OUTPUTS_CLASS);
    }
    this._output.outputLengthChanged.connect(this._outputLengthHandler, this);
    outputWrapper.addWidget(this._output);
    const layout = this.layout as PanelLayout;
    const resizeHandle = new ResizeHandle(this.node);
    resizeHandle.sizeChanged.connect(this._sizeChangedHandler, this);
    layout.insertWidget(layout.widgets.length - 1, resizeHandle);
    layout.insertWidget(layout.widgets.length - 1, outputWrapper);

    if (this.model.isDirty) {
      this.addClass(DIRTY_CLASS);
    }

    this._outputPlaceholder = new OutputPlaceholder({
      callback: () => {
        this.outputHidden = !this.outputHidden;
      },
      text: this.getOutputPlaceholderText(),
      translator: this.translator
    });

    const layoutWrapper = outputWrapper.layout as PanelLayout;
    if (this.outputHidden) {
      layoutWrapper.removeWidget(this._output);
      layoutWrapper.addWidget(this._outputPlaceholder);
      if (this.inputHidden && !outputWrapper.isHidden) {
        this._outputWrapper!.hide();
      }
    }

    const trans = this.translator.load('jupyterlab');
    const ariaLabel =
      this.model.outputs.length === 0
        ? trans.__('Code Cell Content')
        : trans.__('Code Cell Content with Output');
    this.node.setAttribute('aria-label', ariaLabel);
  }

  protected getOutputPlaceholderText(): string | undefined {
    const firstOutput = this.model.outputs.get(0);
    const outputData = firstOutput?.data;
    if (!outputData) {
      return undefined;
    }
    const supportedOutputTypes = [
      'text/html',
      'image/svg+xml',
      'application/pdf',
      'text/markdown',
      'text/plain',
      'application/vnd.jupyter.stderr',
      'application/vnd.jupyter.stdout',
      'text'
    ];
    const preferredOutput = supportedOutputTypes.find(mt => {
      const data = firstOutput.data[mt];
      return (Array.isArray(data) ? typeof data[0] : typeof data) === 'string';
    });
    const dataToDisplay = firstOutput.data[preferredOutput ?? ''];
    if (dataToDisplay !== undefined) {
      return (
        Array.isArray(dataToDisplay)
          ? dataToDisplay
          : (dataToDisplay as string)?.split('\n')
      )?.find(part => part !== '');
    }
    return undefined;
  }

  /**
   * Initialize view state from model.
   *
   * #### Notes
   * Should be called after construction. For convenience, returns this, so it
   * can be chained in the construction, like `new Foo().initializeState();`
   */
  initializeState(): this {
    super.initializeState();
    this.loadScrolledState();

    this._updatePrompt();
    return this;
  }

  get headings(): Cell.IHeading[] {
    if (!this._headingsCache) {
      const headings: Cell.IHeading[] = [];

      // Iterate over the code cell outputs to check for Markdown or HTML from which we can generate ToC headings...
      const outputs = this.model.outputs;
      for (let j = 0; j < outputs.length; j++) {
        const m = outputs.get(j);

        let htmlType: string | null = null;
        let mdType: string | null = null;

        Object.keys(m.data).forEach(t => {
          if (!mdType && TableOfContentsUtils.Markdown.isMarkdown(t)) {
            mdType = t;
          } else if (!htmlType && TableOfContentsUtils.isHTML(t)) {
            htmlType = t;
          }
        });

        // Parse HTML output
        if (htmlType) {
          let htmlData = m.data[htmlType] as string | string[];
          if (typeof htmlData !== 'string') {
            htmlData = htmlData.join('\n');
          }
          headings.push(
            ...TableOfContentsUtils.getHTMLHeadings(
              this._rendermime.sanitizer.sanitize(htmlData)
            ).map(heading => {
              return {
                ...heading,
                outputIndex: j,
                type: Cell.HeadingType.HTML
              };
            })
          );
        } else if (mdType) {
          headings.push(
            ...TableOfContentsUtils.Markdown.getHeadings(
              m.data[mdType] as string
            ).map(heading => {
              return {
                ...heading,
                outputIndex: j,
                type: Cell.HeadingType.Markdown
              };
            })
          );
        }
      }

      this._headingsCache = headings;
    }

    return [...this._headingsCache!];
  }

  /**
   * Get the output area for the cell.
   */
  get outputArea(): OutputArea {
    return this._output;
  }

  /**
   * The view state of output being collapsed.
   */
  get outputHidden(): boolean {
    return this._outputHidden;
  }
  set outputHidden(value: boolean) {
    if (this._outputHidden === value) {
      return;
    }

    if (!this.placeholder) {
      const layout = this._outputWrapper!.layout as PanelLayout;
      if (value) {
        layout.removeWidget(this._output);
        layout.addWidget(this._outputPlaceholder!);
        if (this.inputHidden && !this._outputWrapper!.isHidden) {
          this._outputWrapper!.hide();
        }
        if (this._outputPlaceholder) {
          this._outputPlaceholder.text = this.getOutputPlaceholderText() ?? '';
        }
      } else {
        if (this._outputWrapper!.isHidden) {
          this._outputWrapper!.show();
        }
        layout.removeWidget(this._outputPlaceholder!);
        layout.addWidget(this._output);
      }
    }
    this._outputHidden = value;
    if (this.syncCollapse) {
      this.saveCollapseState();
    }
  }

  /**
   * Save view collapse state to model
   */
  saveCollapseState(): void {
    // Because collapse state for a code cell involves two different pieces of
    // metadata (the `collapsed` and `jupyter` metadata keys), we block reacting
    // to changes in metadata until we have fully committed our changes.
    // Otherwise setting one key can trigger a write to the other key to
    // maintain the synced consistency.
    this.model.sharedModel.transact(
      () => {
        super.saveCollapseState();

        const collapsed = this.model.getMetadata('collapsed');

        if (
          (this.outputHidden && collapsed === true) ||
          (!this.outputHidden && collapsed === undefined)
        ) {
          return;
        }

        // Do not set jupyter.outputs_hidden since it is redundant. See
        // and https://github.com/jupyter/nbformat/issues/137
        if (this.outputHidden) {
          this.model.setMetadata('collapsed', true);
        } else {
          this.model.deleteMetadata('collapsed');
        }
      },
      false,
      'silent-change'
    );
  }

  /**
   * Revert view collapse state from model.
   *
   * We consider the `collapsed` metadata key as the source of truth for outputs
   * being hidden.
   */
  loadCollapseState(): void {
    super.loadCollapseState();
    this.outputHidden = !!this.model.getMetadata('collapsed');
  }

  /**
   * Whether the output is in a scrolled state?
   */
  get outputsScrolled(): boolean {
    return this._outputsScrolled;
  }
  set outputsScrolled(value: boolean) {
    this.toggleClass('jp-mod-outputsScrolled', value);
    this._outputsScrolled = value;
    if (this.syncScrolled) {
      this.saveScrolledState();
    }
    this.updatePromptOverlayIcon();
  }

  /**
   * Update the Prompt Overlay Icon
   */
  updatePromptOverlayIcon(): void {
    const overlay = DOMUtils.findElement(
      this.node,
      'jp-OutputArea-promptOverlay'
    );
    if (!overlay) {
      return;
    }
    // If you are changing this, don't forget about svg.
    const ICON_HEIGHT = 16 + 4 + 4; // 4px for padding
    if (overlay.clientHeight <= ICON_HEIGHT) {
      overlay.firstChild?.remove();
      return;
    }
    let overlayTitle: string;
    if (this._outputsScrolled) {
      expandIcon.element({
        container: overlay
      });
      overlayTitle = 'Expand Output';
    } else {
      collapseIcon.element({
        container: overlay
      });
      overlayTitle = 'Collapse Output';
    }
    const trans = this.translator.load('jupyterlab');
    overlay.title = trans.__(overlayTitle);
  }
  /**
   * Save view collapse state to model
   */
  saveScrolledState(): void {
    const current = this.model.getMetadata('scrolled');

    if (
      (this.outputsScrolled && current === true) ||
      (!this.outputsScrolled && current === undefined)
    ) {
      return;
    }
    if (this.outputsScrolled) {
      this.model.setMetadata('scrolled', true);
    } else {
      this.outputArea.node.style.height = '';
      this.model.deleteMetadata('scrolled');
    }
  }

  /**
   * Revert view collapse state from model.
   */
  loadScrolledState(): void {
    // We don't have the notion of 'auto' scrolled, so we make it false.
    if (this.model.getMetadata('scrolled') === 'auto') {
      this.outputsScrolled = false;
    } else {
      this.outputsScrolled = !!this.model.getMetadata('scrolled');
    }
  }

  /**
   * Whether to sync the scrolled state to the cell model.
   */
  get syncScrolled(): boolean {
    return this._syncScrolled;
  }
  set syncScrolled(value: boolean) {
    if (this._syncScrolled === value) {
      return;
    }
    this._syncScrolled = value;
    if (value) {
      this.loadScrolledState();
    }
  }

  /**
   * Handle the input being hidden.
   *
   * #### Notes
   * This method is called by the case cell implementation and is
   * subclasses here so the code cell can watch to see when input
   * is hidden without accessing private state.
   */
  protected handleInputHidden(value: boolean): void {
    if (this.placeholder) {
      return;
    }
    if (!value && this._outputWrapper!.isHidden) {
      this._outputWrapper!.show();
    } else if (value && !this._outputWrapper!.isHidden && this._outputHidden) {
      this._outputWrapper!.hide();
    }
  }

  /**
   * Clone the cell, using the same model.
   */
  clone(): CodeCell {
    const constructor = this.constructor as typeof CodeCell;
    return new constructor({
      model: this.model,
      contentFactory: this.contentFactory,
      rendermime: this._rendermime,
      placeholder: false,
      translator: this.translator
    });
  }

  /**
   * Clone the OutputArea alone, returning a simplified output area, using the same model.
   */
  cloneOutputArea(): OutputArea {
    return new SimplifiedOutputArea({
      model: this.model.outputs!,
      contentFactory: this.contentFactory,
      rendermime: this._rendermime
    });
  }

  /**
   * Dispose of the resources used by the widget.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this._output.outputLengthChanged.disconnect(
      this._outputLengthHandler,
      this
    );
    this._output.node.removeEventListener(
      'keydown',
      this._detectCaretMovementInOuput
    );
    this._rendermime = null!;
    this._output = null!;
    this._outputWrapper = null!;
    this._outputPlaceholder = null!;
    super.dispose();
  }

  /**
   * Handle changes in the model.
   */
  protected onStateChanged(model: ICellModel, args: IChangedArgs<any>): void {
    switch (args.name) {
      case 'executionCount':
        if (args.newValue !== null) {
          // Mark execution state if execution count was set.
          this.model.executionState = 'idle';
        }
        this._updatePrompt();
        break;
      case 'executionState':
        this._updatePrompt();
        break;
      case 'isDirty':
        if ((model as ICodeCellModel).isDirty) {
          this.addClass(DIRTY_CLASS);
        } else {
          this.removeClass(DIRTY_CLASS);
        }
        break;
      default:
        break;
    }
  }

  /**
   * Callback on output changes
   */
  protected onOutputChanged(): void {
    this._headingsCache = null;
    if (this._outputPlaceholder && this.outputHidden) {
      this._outputPlaceholder.text = this.getOutputPlaceholderText() ?? '';
    }
    // This is to hide/show icon on single line output.
    this.updatePromptOverlayIcon();

    // Clear output area when empty
    const height = this.outputArea.node.style.height;
    if (this.model.outputs.length === 0 && height !== '') {
      this._lastOutputHeight = height;
      this.outputArea.node.style.height = '';
    } else if (this.model.outputs.length > 0 && height === '') {
      this.outputArea.node.style.height = this._lastOutputHeight;
    }
  }

  /**
   * Handle changes in the metadata.
   */
  protected onMetadataChanged(model: CellModel, args: IMapChange): void {
    switch (args.key) {
      case 'scrolled':
        if (this.syncScrolled) {
          this.loadScrolledState();
        }
        break;
      case 'collapsed':
        if (this.syncCollapse) {
          this.loadCollapseState();
        }
        break;
      default:
        break;
    }
    super.onMetadataChanged(model, args);
  }

  private _updatePrompt(): void {
    let prompt: string;
    if (this.model.executionState == 'running') {
      prompt = '*';
    } else {
      prompt = `${this.model.executionCount || ''}`;
    }
    this._setPrompt(prompt);
  }

  /**
   * Handle changes in the number of outputs in the output area.
   */
  private _outputLengthHandler(sender: OutputArea, args: number) {
    const force = args === 0 ? true : false;
    this.toggleClass(NO_OUTPUTS_CLASS, force);
    const trans = this.translator.load('jupyterlab');
    const ariaLabel = force
      ? trans.__('Code Cell Content')
      : trans.__('Code Cell Content with Output');
    this.node.setAttribute('aria-label', ariaLabel);
  }

  /**
   * Handle changes in input/output proportions in side-by-side mode.
   */
  private _sizeChangedHandler(sender: ResizeHandle) {
    this._displayChanged.emit();
  }

  private _headingsCache: Cell.IHeading[] | null = null;
  private _rendermime: IRenderMimeRegistry;
  private _outputHidden = false;
  private _outputsScrolled: boolean;
  private _outputWrapper: Widget | null = null;
  private _outputPlaceholder: OutputPlaceholder | null = null;
  private _output: OutputArea;
  private _syncScrolled = false;
  private _lastOnCaretMovedHandler: () => void;
  private _lastTarget: HTMLElement | null = null;
  private _lastOutputHeight = '';
}

/**
 * The namespace for the `CodeCell` class statics.
 */
export namespace CodeCell {
  /**
   * An options object for initializing a base cell widget.
   */
  export interface IOptions extends Cell.IOptions<ICodeCellModel> {
    /**
     * Code cell layout.
     */
    layout?: CodeCellLayout;
    /**
     * The mime renderer for the cell widget.
     */
    rendermime: IRenderMimeRegistry;
  }

  /**
   * Execute a cell given a client session.
   */
  export async function execute(
    cell: CodeCell,
    sessionContext: ISessionContext,
    metadata?: JSONObject
  ): Promise<KernelMessage.IExecuteReplyMsg | void> {
    const model = cell.model;
    const code = model.sharedModel.getSource();
    if (!code.trim() || !sessionContext.session?.kernel) {
      model.sharedModel.transact(
        () => {
          model.clearExecution();
        },
        false,
        'silent-change'
      );
      return;
    }
    const cellId = { cellId: model.sharedModel.getId() };
    metadata = {
      ...model.metadata,
      ...metadata,
      ...cellId
    };
    const { recordTiming } = metadata;
    model.sharedModel.transact(
      () => {
        model.clearExecution();
        cell.outputHidden = false;
      },
      false,
      'silent-change'
    );
    // note: in future we would like to distinguish running from scheduled
    model.executionState = 'running';
    model.trusted = true;
    let future:
      | Kernel.IFuture<
          KernelMessage.IExecuteRequestMsg,
          KernelMessage.IExecuteReplyMsg
        >
      | undefined;
    try {
      const msgPromise = OutputArea.execute(
        code,
        cell.outputArea,
        sessionContext,
        metadata
      );
      // cell.outputArea.future assigned synchronously in `execute`
      if (recordTiming) {
        const recordTimingHook = (msg: KernelMessage.IIOPubMessage) => {
          let label: string;
          switch (msg.header.msg_type) {
            case 'status':
              label = `status.${
                (msg as KernelMessage.IStatusMsg).content.execution_state
              }`;
              break;
            case 'execute_input':
              label = 'execute_input';
              break;
            default:
              return true;
          }
          // If the data is missing, estimate it to now
          // Date was added in 5.1: https://jupyter-client.readthedocs.io/en/stable/messaging.html#message-header
          const value = msg.header.date || new Date().toISOString();
          const timingInfo: any = Object.assign(
            {},
            model.getMetadata('execution')
          );
          timingInfo[`iopub.${label}`] = value;
          model.setMetadata('execution', timingInfo);
          return true;
        };
        cell.outputArea.future.registerMessageHook(recordTimingHook);
      } else {
        model.deleteMetadata('execution');
      }
      // Save this execution's future so we can compare in the catch below.
      future = cell.outputArea.future;
      const msg = (await msgPromise)!;
      model.executionCount = msg.content.execution_count;
      if (recordTiming) {
        const timingInfo = Object.assign(
          {},
          model.getMetadata('execution') as any
        );
        const started = msg.metadata.started as string;
        // Started is not in the API, but metadata IPyKernel sends
        if (started) {
          timingInfo['shell.execute_reply.started'] = started;
        }
        // Per above, the 5.0 spec does not assume date, so we estimate is required
        const finished = msg.header.date as string;
        timingInfo['shell.execute_reply'] =
          finished || new Date().toISOString();
        model.setMetadata('execution', timingInfo);
      }
      return msg;
    } catch (e) {
      // If we started executing, and the cell is still indicating this
      // execution, clear the prompt.
      if (future && !cell.isDisposed && cell.outputArea.future === future) {
        cell.model.executionState = 'idle';
        if (recordTiming && future.isDisposed) {
          // Record the time when the cell execution was aborted
          const timingInfo: any = Object.assign(
            {},
            model.getMetadata('execution')
          );
          timingInfo['execution_failed'] = new Date().toISOString();
          model.setMetadata('execution', timingInfo);
        }
      }
      throw e;
    }
  }
}

/**
 * `AttachmentsCell` - A base class for a cell widget that allows
 *  attachments to be drag/drop'd or pasted onto it
 */
export abstract class AttachmentsCell<
  T extends IAttachmentsCellModel
> extends Cell<T> {
  /**
   * Handle the DOM events for the widget.
   *
   * @param event - The DOM event sent to the widget.
   *
   * #### Notes
   * This method implements the DOM `EventListener` interface and is
   * called in response to events on the notebook panel's node. It should
   * not be called directly by user code.
   */
  handleEvent(event: Event): void {
    switch (event.type) {
      case 'lm-dragover':
        this._evtDragOver(event as Drag.Event);
        break;
      case 'lm-drop':
        this._evtDrop(event as Drag.Event);
        break;
      default:
        break;
    }
  }

  /**
   * Get the editor options at initialization.
   *
   * @returns Editor options
   */
  protected getEditorOptions(): InputArea.IOptions['editorOptions'] {
    const base = super.getEditorOptions() ?? {};
    base.extensions = [
      ...(base.extensions ?? []),
      EditorView.domEventHandlers({
        dragenter: (event: DragEvent) => {
          event.preventDefault();
        },
        dragover: (event: DragEvent) => {
          event.preventDefault();
        },
        drop: (event: DragEvent) => {
          this._evtNativeDrop(event);
        },
        paste: (event: ClipboardEvent) => {
          this._evtPaste(event);
        }
      })
    ];
    return base;
  }

  /**
   * Modify the cell source to include a reference to the attachment.
   */
  protected abstract updateCellSourceWithAttachment(
    attachmentName: string,
    URI?: string
  ): void;

  /**
   * Handle `after-attach` messages for the widget.
   */
  protected onAfterAttach(msg: Message): void {
    super.onAfterAttach(msg);

    const node = this.node;
    node.addEventListener('lm-dragover', this);
    node.addEventListener('lm-drop', this);
  }

  /**
   * A message handler invoked on a `'before-detach'`
   * message
   */
  protected onBeforeDetach(msg: Message): void {
    const node = this.node;
    node.removeEventListener('lm-dragover', this);
    node.removeEventListener('lm-drop', this);

    super.onBeforeDetach(msg);
  }

  private _evtDragOver(event: Drag.Event) {
    const supportedMimeType = some(imageRendererFactory.mimeTypes, mimeType => {
      if (!event.mimeData.hasData(CONTENTS_MIME_RICH)) {
        return false;
      }
      const data = event.mimeData.getData(
        CONTENTS_MIME_RICH
      ) as DirListing.IContentsThunk;
      return data.model.mimetype === mimeType;
    });
    if (!supportedMimeType) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    event.dropAction = event.proposedAction;
  }

  /**
   * Handle the `paste` event for the widget
   */
  private _evtPaste(event: ClipboardEvent): void {
    const isEditable = this.model.getMetadata('editable') ?? true;
    if (event.clipboardData && isEditable) {
      const items = event.clipboardData.items;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type === 'text/plain') {
          // Skip if this text is the path to a file
          if (i < items.length - 1 && items[i + 1].kind === 'file') {
            continue;
          }
          items[i].getAsString(text => {
            this.editor!.replaceSelection?.(
              text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
            );
          });
        }
        this._attachFiles(event.clipboardData.items);
      }
    }
    event.preventDefault();
  }

  /**
   * Handle the `drop` event for the widget
   */
  private _evtNativeDrop(event: DragEvent): void {
    if (event.dataTransfer) {
      this._attachFiles(event.dataTransfer.items);
    }
    event.preventDefault();
  }

  /**
   * Handle the `'lm-drop'` event for the widget.
   */
  private _evtDrop(event: Drag.Event): void {
    const supportedMimeTypes = event.mimeData.types().filter(mimeType => {
      if (mimeType === CONTENTS_MIME_RICH) {
        const data = event.mimeData.getData(
          CONTENTS_MIME_RICH
        ) as DirListing.IContentsThunk;
        return (
          imageRendererFactory.mimeTypes.indexOf(data.model.mimetype) !== -1
        );
      }
      return imageRendererFactory.mimeTypes.indexOf(mimeType) !== -1;
    });
    if (supportedMimeTypes.length === 0) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    if (event.proposedAction === 'none') {
      event.dropAction = 'none';
      return;
    }
    event.dropAction = 'copy';

    for (const mimeType of supportedMimeTypes) {
      if (mimeType === CONTENTS_MIME_RICH) {
        const { model, withContent } = event.mimeData.getData(
          CONTENTS_MIME_RICH
        ) as DirListing.IContentsThunk;
        if (model.type === 'file') {
          const URI = this._generateURI(model.name);
          this.updateCellSourceWithAttachment(model.name, URI);
          void withContent().then(fullModel => {
            this.model.attachments.set(URI, {
              [fullModel.mimetype]: fullModel.content
            });
          });
        }
      } else {
        // Pure mimetype, no useful name to infer
        const URI = this._generateURI();
        this.model.attachments.set(URI, {
          [mimeType]: event.mimeData.getData(mimeType)
        });
        this.updateCellSourceWithAttachment(URI, URI);
      }
    }
  }

  /**
   * Attaches all DataTransferItems (obtained from
   * clipboard or native drop events) to the cell
   */
  private _attachFiles(items: DataTransferItemList) {
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === 'file') {
        const blob = item.getAsFile();
        if (blob) {
          this._attachFile(blob);
        }
      }
    }
  }

  /**
   * Takes in a file object and adds it to
   * the cell attachments
   */
  private _attachFile(blob: File) {
    const reader = new FileReader();
    reader.onload = evt => {
      const { href, protocol } = URLExt.parse(reader.result as string);
      if (protocol !== 'data:') {
        return;
      }
      const dataURIRegex = /([\w+\/\+]+)?(?:;(charset=[\w\d-]*|base64))?,(.*)/;
      const matches = dataURIRegex.exec(href);
      if (!matches || matches.length !== 4) {
        return;
      }
      const mimeType = matches[1];
      const encodedData = matches[3];
      const bundle: nbformat.IMimeBundle = { [mimeType]: encodedData };
      const URI = this._generateURI(blob.name);

      if (mimeType.startsWith('image/')) {
        this.model.attachments.set(URI, bundle);
        this.updateCellSourceWithAttachment(blob.name, URI);
      }
    };
    reader.onerror = evt => {
      console.error(`Failed to attach ${blob.name}` + evt);
    };
    reader.readAsDataURL(blob);
  }

  /**
   * Generates a unique URI for a file
   * while preserving the file extension.
   */
  private _generateURI(name = ''): string {
    const lastIndex = name.lastIndexOf('.');
    return lastIndex !== -1
      ? UUID.uuid4().concat(name.substring(lastIndex))
      : UUID.uuid4();
  }
}

/** ****************************************************************************
 * MarkdownCell
 ******************************************************************************/

/**
 * A widget for a Markdown cell.
 *
 * #### Notes
 * Things get complicated if we want the rendered text to update
 * any time the text changes, the text editor model changes,
 * or the input area model changes.  We don't support automatically
 * updating the rendered text in all of these cases.
 */
export class MarkdownCell extends AttachmentsCell<IMarkdownCellModel> {
  /**
   * Construct a Markdown cell widget.
   */
  constructor(options: MarkdownCell.IOptions) {
    super({ ...options, placeholder: true });
    this.addClass(MARKDOWN_CELL_CLASS);
    this.model.contentChanged.connect(this.onContentChanged, this);
    const trans = this.translator.load('jupyterlab');
    this.node.setAttribute('aria-label', trans.__('Markdown Cell Content'));
    // Ensure we can resolve attachments:
    this._rendermime = options.rendermime.clone({
      resolver: new AttachmentsResolver({
        parent: options.rendermime.resolver ?? undefined,
        model: this.model.attachments
      })
    });

    this._renderer = this._rendermime.createRenderer('text/markdown');
    this._renderer.addClass(MARKDOWN_OUTPUT_CLASS);

    // Check if heading cell is set to be collapsed
    this._headingCollapsed = (this.model.getMetadata(
      MARKDOWN_HEADING_COLLAPSED
    ) ?? false) as boolean;

    this._showEditorForReadOnlyMarkdown =
      options.showEditorForReadOnlyMarkdown ??
      MarkdownCell.defaultShowEditorForReadOnlyMarkdown;

    // Defer setting placeholder as the renderer must be instantiated before initializing the DOM
    this.placeholder = options.placeholder ?? true;

    this._monitor = new ActivityMonitor({
      signal: this.model.contentChanged,
      timeout: RENDER_TIMEOUT
    });

    // Throttle the rendering rate of the widget.
    this.ready
      .then(() => {
        if (this.isDisposed) {
          // Bail early
          return;
        }
        this._monitor.activityStopped.connect(() => {
          if (this._rendered) {
            this.update();
          }
        }, this);
      })
      .catch(reason => {
        console.error('Failed to be ready', reason);
      });
  }

  /**
   * Text that represents the highest heading (i.e. lowest level) if cell is a heading.
   * Returns empty string if not a heading.
   */
  get headingInfo(): { text: string; level: number } {
    // Use table of content algorithm for consistency
    const headings = this.headings;

    if (headings.length > 0) {
      // Return the highest level
      const { text, level } = headings.reduce(
        (prev, curr) => (prev.level <= curr.level ? prev : curr),
        headings[0]
      );
      return { text, level };
    } else {
      return { text: '', level: -1 };
    }
  }

  get headings(): Cell.IHeading[] {
    if (!this._headingsCache) {
      // Use table of content algorithm for consistency
      const headings = TableOfContentsUtils.Markdown.getHeadings(
        this.model.sharedModel.getSource()
      );
      this._headingsCache = headings.map(h => {
        return { ...h, type: Cell.HeadingType.Markdown };
      });
    }

    return [...this._headingsCache!];
  }

  /**
   * Whether the heading is collapsed or not.
   */
  get headingCollapsed(): boolean {
    return this._headingCollapsed;
  }
  set headingCollapsed(value: boolean) {
    if (this._headingCollapsed !== value) {
      this._headingCollapsed = value;
      if (value) {
        this.model.setMetadata(MARKDOWN_HEADING_COLLAPSED, value);
      } else if (
        this.model.getMetadata(MARKDOWN_HEADING_COLLAPSED) !== 'undefined'
      ) {
        this.model.deleteMetadata(MARKDOWN_HEADING_COLLAPSED);
      }
      const collapseButton = this.inputArea?.promptNode.getElementsByClassName(
        HEADING_COLLAPSER_CLASS
      )[0];
      if (collapseButton) {
        if (value) {
          collapseButton.classList.add('jp-mod-collapsed');
        } else {
          collapseButton.classList.remove('jp-mod-collapsed');
        }
      }
      this.renderCollapseButtons(this._renderer);
      this._headingCollapsedChanged.emit(this._headingCollapsed);
    }
  }

  /**
   * Number of collapsed sub cells.
   */
  get numberChildNodes(): number {
    return this._numberChildNodes;
  }
  set numberChildNodes(value: number) {
    this._numberChildNodes = value;
    this.renderCollapseButtons(this._renderer);
  }

  /**
   * Signal emitted when the cell collapsed state changes.
   */
  get headingCollapsedChanged(): ISignal<MarkdownCell, boolean> {
    return this._headingCollapsedChanged;
  }

  /**
   * Whether the cell is rendered.
   */
  get rendered(): boolean {
    return this._rendered;
  }
  set rendered(value: boolean) {
    // Show cell as rendered when cell is not editable
    if (this.readOnly && this._showEditorForReadOnlyMarkdown === false) {
      value = true;
    }
    if (value === this._rendered) {
      return;
    }
    this._rendered = value;
    this._handleRendered()
      .then(() => {
        // If the rendered state changed, raise an event.
        this._displayChanged.emit();
        this._renderedChanged.emit(this._rendered);
      })
      .catch(reason => {
        console.error('Failed to render', reason);
      });
  }

  /**
   * Signal emitted when the markdown cell rendered state changes
   */
  get renderedChanged(): ISignal<MarkdownCell, boolean> {
    return this._renderedChanged;
  }

  /*
   * Whether the Markdown editor is visible in read-only mode.
   */
  get showEditorForReadOnly(): boolean {
    return this._showEditorForReadOnlyMarkdown;
  }
  set showEditorForReadOnly(value: boolean) {
    this._showEditorForReadOnlyMarkdown = value;
    if (value === false) {
      this.rendered = true;
    }
  }

  /**
   * Renderer
   */
  get renderer(): IRenderMime.IRenderer {
    return this._renderer;
  }

  /**
   * Dispose of the resources held by the widget.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this._monitor.dispose();
    super.dispose();
  }

  /**
   * Create children widgets.
   */
  protected initializeDOM(): void {
    if (!this.placeholder) {
      return;
    }

    super.initializeDOM();

    this.renderCollapseButtons(this._renderer!);

    this._handleRendered().catch(reason => {
      console.error('Failed to render', reason);
    });
  }

  protected maybeCreateCollapseButton(): void {
    const { level } = this.headingInfo;
    if (
      level > 0 &&
      this.inputArea?.promptNode.getElementsByClassName(HEADING_COLLAPSER_CLASS)
        .length == 0
    ) {
      let collapseButton = this.inputArea.promptNode.appendChild(
        document.createElement('button')
      );
      collapseButton.className = `jp-Button ${HEADING_COLLAPSER_CLASS}`;
      collapseButton.setAttribute('data-heading-level', level.toString());
      if (this._headingCollapsed) {
        collapseButton.classList.add('jp-mod-collapsed');
      } else {
        collapseButton.classList.remove('jp-mod-collapsed');
      }
      collapseButton.onclick = (event: Event) => {
        this.headingCollapsed = !this.headingCollapsed;
      };
    }
  }

  /**
   * Create, update or remove the hidden cells button.
   * Note that the actual visibility is controlled in Static Notebook by toggling jp-mod-showHiddenCellsButton class.
   */
  protected maybeCreateOrUpdateExpandButton(): void {
    const showHiddenCellsButtonList = this.node.getElementsByClassName(
      SHOW_HIDDEN_CELLS_CLASS
    );
    let trans = this.translator.load('jupyterlab');
    let buttonText = trans._n(
      '%1 cell hidden',
      '%1 cells hidden',
      this._numberChildNodes
    );
    let needToCreateButton =
      this.headingCollapsed &&
      this._numberChildNodes > 0 &&
      showHiddenCellsButtonList.length == 0;
    if (needToCreateButton) {
      const newShowHiddenCellsButton = document.createElement('button');
      newShowHiddenCellsButton.className = `jp-mod-minimal jp-Button ${SHOW_HIDDEN_CELLS_CLASS}`;
      addIcon.render(newShowHiddenCellsButton);
      const buttonTextElement = document.createElement('div');
      buttonTextElement.textContent = buttonText;
      newShowHiddenCellsButton.appendChild(buttonTextElement);
      newShowHiddenCellsButton.onclick = () => {
        this.headingCollapsed = false;
      };
      this.node.appendChild(newShowHiddenCellsButton);
    }
    let needToUpdateButtonText =
      this.headingCollapsed &&
      this._numberChildNodes > 0 &&
      showHiddenCellsButtonList.length == 1;
    if (needToUpdateButtonText) {
      showHiddenCellsButtonList[0].childNodes[1].textContent = buttonText;
    }
    let needToRemoveButton = !(
      this.headingCollapsed && this._numberChildNodes > 0
    );
    if (needToRemoveButton) {
      for (const button of showHiddenCellsButtonList) {
        this.node.removeChild(button);
      }
    }
  }

  /**
   * Callback on content changed
   */
  protected onContentChanged(): void {
    super.onContentChanged();
    this._headingsCache = null;
  }

  /**
   * Render the collapse button for heading cells,
   * and for collapsed heading cells render the "expand hidden cells"
   * button.
   */
  protected renderCollapseButtons(widget: Widget): void {
    this.node.classList.toggle(
      MARKDOWN_HEADING_COLLAPSED,
      this._headingCollapsed
    );
    this.maybeCreateCollapseButton();
    this.maybeCreateOrUpdateExpandButton();
  }

  /**
   * Render an input instead of the text editor.
   */
  protected renderInput(widget: Widget): void {
    this.addClass(RENDERED_CLASS);
    if (!this.placeholder && !this.isDisposed) {
      this.renderCollapseButtons(widget);
      this.inputArea!.renderInput(widget);
    }
  }

  /**
   * Show the text editor instead of rendered input.
   */
  protected showEditor(): void {
    this.removeClass(RENDERED_CLASS);
    if (!this.placeholder && !this.isDisposed) {
      this.inputArea!.showEditor();
      // if this is going to be a heading, place the cursor accordingly
      let numHashAtStart = (this.model.sharedModel
        .getSource()
        .match(/^#+/g) || [''])[0].length;
      if (numHashAtStart > 0) {
        this.inputArea!.editor.setCursorPosition(
          {
            column: numHashAtStart + 1,
            line: 0
          },
          { scroll: false }
        );
      }
    }
  }

  /*
   * Handle `update-request` messages.
   */
  protected onUpdateRequest(msg: Message): void {
    // Make sure we are properly rendered.
    this._handleRendered().catch(reason => {
      console.error('Failed to render', reason);
    });
    super.onUpdateRequest(msg);
  }

  /**
   * Modify the cell source to include a reference to the attachment.
   */
  protected updateCellSourceWithAttachment(
    attachmentName: string,
    URI?: string
  ): void {
    const textToBeAppended = `![${attachmentName}](attachment:${
      URI ?? attachmentName
    })`;
    // TODO this should be done on the model...
    this.editor?.replaceSelection?.(textToBeAppended);
  }

  /**
   * Handle the rendered state.
   */
  private async _handleRendered(): Promise<void> {
    if (!this._rendered) {
      this.showEditor();
    } else {
      // TODO: It would be nice for the cell to provide a way for
      // its consumers to hook into when the rendering is done.
      await this._updateRenderedInput();
      if (this._rendered) {
        // The rendered flag may be updated in the mean time
        this.renderInput(this._renderer);
      }
    }
  }

  /**
   * Update the rendered input.
   */
  private _updateRenderedInput(): Promise<void> {
    if (this.placeholder) {
      return Promise.resolve();
    }

    const model = this.model;
    const text =
      (model && model.sharedModel.getSource()) || DEFAULT_MARKDOWN_TEXT;
    // Do not re-render if the text has not changed.
    if (text !== this._prevText) {
      const mimeModel = new MimeModel({ data: { 'text/markdown': text } });
      this._prevText = text;
      return this._renderer.renderModel(mimeModel);
    }
    return Promise.resolve();
  }

  /**
   * Clone the cell, using the same model.
   */
  clone(): MarkdownCell {
    const constructor = this.constructor as typeof MarkdownCell;
    return new constructor({
      model: this.model,
      contentFactory: this.contentFactory,
      rendermime: this._rendermime,
      placeholder: false,
      translator: this.translator
    });
  }

  private _headingsCache: Cell.IHeading[] | null = null;
  private _headingCollapsed: boolean;
  private _headingCollapsedChanged = new Signal<MarkdownCell, boolean>(this);
  private _monitor: ActivityMonitor<ICellModel, void>;
  private _numberChildNodes: number;
  private _prevText = '';
  private _renderer: IRenderMime.IRenderer;
  private _rendermime: IRenderMimeRegistry;
  private _rendered = true;
  private _renderedChanged = new Signal<this, boolean>(this);
  private _showEditorForReadOnlyMarkdown = true;
}

/**
 * The namespace for the `CodeCell` class statics.
 */
export namespace MarkdownCell {
  /**
   * An options object for initializing a base cell widget.
   */
  export interface IOptions extends Cell.IOptions<IMarkdownCellModel> {
    /**
     * The mime renderer for the cell widget.
     */
    rendermime: IRenderMimeRegistry;

    /**
     * Show editor for read-only Markdown cells.
     */
    showEditorForReadOnlyMarkdown?: boolean;
  }

  /**
   * Default value for showEditorForReadOnlyMarkdown.
   */
  export const defaultShowEditorForReadOnlyMarkdown = true;
}

/** ****************************************************************************
 * RawCell
 ******************************************************************************/

/**
 * A widget for a raw cell.
 */
export class RawCell extends Cell<IRawCellModel> {
  /**
   * Construct a raw cell widget.
   */
  constructor(options: RawCell.IOptions) {
    super(options);
    this.addClass(RAW_CELL_CLASS);
    const trans = this.translator.load('jupyterlab');
    this.node.setAttribute('aria-label', trans.__('Raw Cell Content'));
  }

  /**
   * Clone the cell, using the same model.
   */
  clone(): RawCell {
    const constructor = this.constructor as typeof RawCell;
    return new constructor({
      model: this.model,
      contentFactory: this.contentFactory,
      placeholder: false,
      translator: this.translator
    });
  }
}

/**
 * The namespace for the `RawCell` class statics.
 */
export namespace RawCell {
  /**
   * An options object for initializing a base cell widget.
   */
  export interface IOptions extends Cell.IOptions<IRawCellModel> {}
}
