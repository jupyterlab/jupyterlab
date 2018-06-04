/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import {
  AttachmentsResolver
} from '@jupyterlab/attachments';

import {
  IClientSession
} from '@jupyterlab/apputils';

import {
  IChangedArgs, ActivityMonitor
} from '@jupyterlab/coreutils';

import {
  CodeEditor, CodeEditorWrapper
} from '@jupyterlab/codeeditor';

import {
  IObservableMap
} from '@jupyterlab/observables';

import {
  OutputArea, SimplifiedOutputArea, IOutputPrompt, OutputPrompt, IStdin, Stdin
} from '@jupyterlab/outputarea';

import {
  IRenderMime, MimeModel, RenderMimeRegistry
} from '@jupyterlab/rendermime';

import {
  KernelMessage
} from '@jupyterlab/services';

import {
  JSONValue, PromiseDelegate
} from '@phosphor/coreutils';

import {
  Message
} from '@phosphor/messaging';

import {
  PanelLayout, Panel, Widget
} from '@phosphor/widgets';

import {
  InputCollapser, OutputCollapser
} from './collapser';

import {
  CellHeader, CellFooter, ICellHeader, ICellFooter
} from './headerfooter';

import {
  InputArea, IInputPrompt, InputPrompt
} from './inputarea';

import {
  ICellModel, ICodeCellModel,
  IMarkdownCellModel, IRawCellModel
} from './model';

import {
  InputPlaceholder, OutputPlaceholder
} from './placeholder';


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
 * The class name added to the cell when collapsed.
 */
const COLLAPSED_CLASS = 'jp-mod-collapsed';

/**
 * The class name added to the cell when readonly.
 */
const READONLY_CLASS = 'jp-mod-readOnly';

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

/******************************************************************************
 * Cell
 ******************************************************************************/


/**
 * A base cell widget.
 */
export
class Cell extends Widget {
  /**
   * Construct a new base cell widget.
   */
  constructor(options: Cell.IOptions) {
    super();
    this.addClass(CELL_CLASS);
    let model = this._model = options.model;
    let contentFactory = this.contentFactory = (
      options.contentFactory || Cell.defaultContentFactory
    );
    this.layout = new PanelLayout();

    // Header
    let header = this._header = contentFactory.createCellHeader();
    header.addClass(CELL_HEADER_CLASS);
    (this.layout as PanelLayout).addWidget(header);

    // Input
    let inputWrapper = this._inputWrapper = new Panel();
    inputWrapper.addClass(CELL_INPUT_WRAPPER_CLASS);
    let inputCollapser = this._inputCollapser = new InputCollapser();
    inputCollapser.addClass(CELL_INPUT_COLLAPSER_CLASS);
    let input = this._input = new InputArea({model, contentFactory });
    input.addClass(CELL_INPUT_AREA_CLASS);
    inputWrapper.addWidget(inputCollapser);
    inputWrapper.addWidget(input);
    (this.layout as PanelLayout).addWidget(inputWrapper);

    this._inputPlaceholder = new InputPlaceholder(() => {
      this.inputHidden = !this.inputHidden;
    });

    // Footer
    let footer = this._footer = this.contentFactory.createCellFooter();
    footer.addClass(CELL_FOOTER_CLASS);
    (this.layout as PanelLayout).addWidget(footer);

    // Editor settings
    if (options.editorConfig) {
      Object.keys(options.editorConfig)
      .forEach((key: keyof CodeEditor.IConfig) => {
        this.editor.setOption(key, options.editorConfig[key]);
      });
    }

  }

  /**
   * Modify some state for initialization.
   *
   * Should be called at the end of the subclasses's constructor.
   */
  protected initializeState() {
    const jupyter = this.model.metadata.get('jupyter') || {} as any;
    this.inputHidden = jupyter.source_hidden === true;
  }

  /**
   * The content factory used by the widget.
   */
  readonly contentFactory: Cell.IContentFactory;

  /**
   * Get the prompt node used by the cell.
   */
  get promptNode(): HTMLElement {
    if (!this._inputHidden) {
      return this._input.promptNode;
    } else {
      return ((this._inputPlaceholder.node as HTMLElement).firstElementChild as HTMLElement);
    }
  }

  /**
   * Get the CodeEditorWrapper used by the cell.
   */
  get editorWidget(): CodeEditorWrapper {
    return this._input.editorWidget;
  }

  /**
   * Get the CodeEditor used by the cell.
   */
  get editor(): CodeEditor.IEditor {
    return this._input.editor;
  }

  /**
   * Get the model used by the cell.
   */
  get model(): ICellModel {
    return this._model;
  }

  /**
   * Get the input area for the cell.
   */
  get inputArea(): InputArea {
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
    this.update();
  }

  /**
   * A promise that resolves when the widget renders for the first time.
   */
  get ready(): Promise<void> {
    return Promise.resolve(undefined);
  }

  /**
   * Set the prompt for the widget.
   */
  setPrompt(value: string): void {
    this._input.setPrompt(value);
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
    let layout = this._inputWrapper.layout as PanelLayout;
    if (value) {
      this._input.parent = null;
      layout.addWidget(this._inputPlaceholder);
    } else {
      this._inputPlaceholder.parent = null;
      layout.addWidget(this._input);
    }
    this._inputHidden = value;
    this.handleInputHidden(value);
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
   * Clone the cell, using the same model.
   */
  clone(): Cell {
    let constructor = this.constructor as typeof Cell;
    return new constructor({
      model: this.model,
      contentFactory: this.contentFactory
    });
  }

  /**
   * Dispose of the resources held by the widget.
   */
  dispose() {
    // Do nothing if already disposed.
    if (this.isDisposed) {
      return;
    }
    this._input = null;
    this._model = null;
    this._header = null;
    this._footer = null;
    this._inputCollapser = null;
    this._inputWrapper = null;
    this._inputPlaceholder = null;
    super.dispose();
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
    this.editor.focus();
  }

  /**
   * Handle `update-request` messages.
   */
  protected onUpdateRequest(msg: Message): void {
    if (!this._model) {
      return;
    }
    // Handle read only state.
    if (this.editor.getOption('readOnly') !== this._readOnly) {
      this.editor.setOption('readOnly', this._readOnly);
      this.toggleClass(READONLY_CLASS, this._readOnly);
    }
  }

  private _readOnly = false;
  private _model: ICellModel = null;
  private _header: ICellHeader = null;
  private _footer: ICellFooter = null;
  private _inputHidden = false;
  private _input: InputArea = null;
  private _inputCollapser: InputCollapser = null;
  private _inputWrapper: Widget = null;
  private _inputPlaceholder: InputPlaceholder = null;

}


/**
 * The namespace for the `Cell` class statics.
 */
export
namespace Cell {
  /**
   * An options object for initializing a cell widget.
   */
  export
  interface IOptions {
    /**
     * The model used by the cell.
     */
    model: ICellModel;

    /**
     * The factory object for customizable cell children.
     */
    contentFactory?: IContentFactory;

    /**
     * The configuration options for the text editor widget.
     */
    editorConfig?: Partial<CodeEditor.IConfig>;
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
  export
  interface IContentFactory extends OutputArea.IContentFactory, InputArea.IContentFactory {
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
  export
  class ContentFactory implements IContentFactory {
    /**
     * Create a content factory for a cell.
     */
    constructor(options: ContentFactory.IOptions = {}) {
      this._editorFactory = (options.editorFactory || InputArea.defaultEditorFactory);
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
     * Create a new cell header for the parent widget.
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

    private _editorFactory: CodeEditor.Factory = null;
  }

  /**
   * A namespace for cell content factory.
   */
  export
  namespace ContentFactory {
    /**
     * Options for the content factory.
     */
    export
    interface IOptions {
      /**
       * The editor factory used by the content factory.
       *
       * If this is not passed, a default CodeMirror editor factory
       * will be used.
       */
      editorFactory?: CodeEditor.Factory;
    }
  }

  /**
   * The default content factory for cells.
   */
  export
  const defaultContentFactory = new ContentFactory();
}

/******************************************************************************
 * CodeCell
 ******************************************************************************/

/**
 * A widget for a code cell.
 */
export
class CodeCell extends Cell {
  /**
   * Construct a code cell widget.
   */
  constructor(options: CodeCell.IOptions) {
    super(options);
    this.addClass(CODE_CELL_CLASS);

    // Only save options not handled by parent constructor.
    let rendermime = this._rendermime = options.rendermime;
    let contentFactory = this.contentFactory;
    let model = this.model;

    // Insert the output before the cell footer.
    let outputWrapper = this._outputWrapper = new Panel();
    outputWrapper.addClass(CELL_OUTPUT_WRAPPER_CLASS);
    let outputCollapser = this._outputCollapser = new OutputCollapser();
    outputCollapser.addClass(CELL_OUTPUT_COLLAPSER_CLASS);
    let output = this._output = new OutputArea({
      model: model.outputs,
      rendermime,
      contentFactory: contentFactory
    });
    output.addClass(CELL_OUTPUT_AREA_CLASS);
    // Set a CSS if there are no outputs, and connect a signal for future
    // changes to the number of outputs. This is for conditional styling
    // if there are no outputs.
    if (model.outputs.length === 0) {
      this.addClass(NO_OUTPUTS_CLASS);
    }
    output.outputLengthChanged.connect(this._outputLengthHandler, this);
    outputWrapper.addWidget(outputCollapser);
    outputWrapper.addWidget(output);
    (this.layout as PanelLayout).insertWidget(2, outputWrapper);

    this._outputPlaceholder = new OutputPlaceholder(() => {
      this.outputHidden = !this.outputHidden;
    });

    // Modify state
    this.initializeState();
    model.stateChanged.connect(this.onStateChanged, this);
    model.metadata.changed.connect(this.onMetadataChanged, this);
  }

  /**
   * The model used by the widget.
   */
  readonly model: ICodeCellModel;

  /**
   * Modify some state for initialization.
   *
   * Should be called at the end of the subclasses's constructor.
   */
  protected initializeState() {
    super.initializeState();

    const metadataScrolled = this.model.metadata.get('scrolled');
    this.outputsScrolled = metadataScrolled === true;

    const jupyter = this.model.metadata.get('jupyter') || {} as any;
    const collapsed = this.model.metadata.get('collapsed');
    this.outputHidden = collapsed === true || jupyter.outputs_hidden === true;

    this.setPrompt(`${this.model.executionCount || ''}`);
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
    let layout = this._outputWrapper.layout as PanelLayout;
    if (value) {
      layout.removeWidget(this._output);
      layout.addWidget(this._outputPlaceholder);
      if (this.inputHidden && !this._outputWrapper.isHidden) {
        this._outputWrapper.hide();
      }
    } else {
      if (this._outputWrapper.isHidden) {
        this._outputWrapper.show();
      }
      layout.removeWidget(this._outputPlaceholder);
      layout.addWidget(this._output);
    }
    this._outputHidden = value;
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
    if (!value && this._outputWrapper.isHidden) {
      this._outputWrapper.show();
    } else if (value && !this._outputWrapper.isHidden && this._outputHidden) {
      this._outputWrapper.hide();
    }
  }

  /**
   * Clone the cell, using the same model.
   */
  clone(): CodeCell {
    let constructor = this.constructor as typeof CodeCell;
    return new constructor({
      model: this.model,
      contentFactory: this.contentFactory,
      rendermime: this._rendermime
    });
  }

  /**
   * Clone the OutputArea alone, returning a simplified output area, using the same model.
   */
  cloneOutputArea(): OutputArea {
    return new SimplifiedOutputArea({
      model: this.model.outputs,
      contentFactory: this.contentFactory,
      rendermime: this._rendermime,
    });
  }

  /**
   * Dispose of the resources used by the widget.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this._output.outputLengthChanged.disconnect(this._outputLengthHandler, this);
    this._rendermime = null;
    this._output = null;
    this._outputWrapper = null;
    this._outputCollapser = null;
    this._outputPlaceholder = null;
    super.dispose();
  }

  /**
   * Handle `update-request` messages.
   */
  protected onUpdateRequest(msg: Message): void {
    let value = this.model.metadata.get('collapsed') as boolean;
    this.toggleClass(COLLAPSED_CLASS, value);
    if (this._output) {
      // TODO: handle scrolled state.
    }
    super.onUpdateRequest(msg);
  }

  /**
   * Handle changes in the model.
   */
  protected onStateChanged(model: ICellModel, args: IChangedArgs<any>): void {
    switch (args.name) {
    case 'executionCount':
      this.setPrompt(`${(model as ICodeCellModel).executionCount || ''}`);
      break;
    default:
      break;
    }
  }

  /**
   * Handle changes in the metadata.
   */
  protected onMetadataChanged(model: IObservableMap<JSONValue>, args: IObservableMap.IChangedArgs<JSONValue>): void {
    switch (args.key) {
    case 'collapsed':
    case 'scrolled':
      this.update();
      break;
    default:
      break;
    }
  }

  /**
   * Handle changes in the number of outputs in the output area.
   */
  private _outputLengthHandler(sender: OutputArea, args: number) {
    let force = args === 0 ? true : false;
    this.toggleClass(NO_OUTPUTS_CLASS, force);
    /* Turn off scrolling outputs if there are none */
    if (force) {
      this.outputsScrolled = false;
    }
  }

  private _rendermime: RenderMimeRegistry = null;
  private _outputHidden = false;
  private _outputsScrolled: boolean;
  private _outputWrapper: Widget = null;
  private _outputCollapser: OutputCollapser = null;
  private _outputPlaceholder: OutputPlaceholder = null;
  private _output: OutputArea = null;
}


/**
 * The namespace for the `CodeCell` class statics.
 */
export
namespace CodeCell {
  /**
   * An options object for initializing a base cell widget.
   */
  export
  interface IOptions extends Cell.IOptions {
    /**
     * The model used by the cell.
     */
    model: ICodeCellModel;

    /**
     * The mime renderer for the cell widget.
     */
    rendermime: RenderMimeRegistry;
  }

  /**
   * Execute a cell given a client session.
   */
  export
  function execute(cell: CodeCell, session: IClientSession): Promise<KernelMessage.IExecuteReplyMsg> {
    let model = cell.model;
    let code = model.value.text;
    if (!code.trim() || !session.kernel) {
      model.executionCount = null;
      model.outputs.clear();
      return Promise.resolve(void 0);
    }

    model.executionCount = null;
    cell.outputHidden = false;
    cell.setPrompt('*');
    model.trusted = true;

    return OutputArea.execute(code, cell.outputArea, session).then(msg => {
      model.executionCount = msg.content.execution_count;
      return msg;
    }).catch(e => {
      if (e.message === 'Canceled') {
        cell.setPrompt('');
      }
      throw e;
    });
  }
}


/******************************************************************************
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
export
class MarkdownCell extends Cell {
  /**
   * Construct a Markdown cell widget.
   */
  constructor(options: MarkdownCell.IOptions) {
    super(options);
    this.addClass(MARKDOWN_CELL_CLASS);
    // Ensure we can resolve attachments:
    this._rendermime = options.rendermime.clone({
      resolver: new AttachmentsResolver({
        parent: options.rendermime.resolver,
        model: this.model.attachments,
      })
    });

    // Throttle the rendering rate of the widget.
    this._monitor = new ActivityMonitor({
      signal: this.model.contentChanged,
      timeout: RENDER_TIMEOUT
    });
    this._monitor.activityStopped.connect(() => {
      if (this._rendered) {
        this.update();
      }
    }, this);

    this._updateRenderedInput().then(() => {
      this._ready.resolve(void 0);
    });

    super.initializeState();
  }

  /**
   * The model used by the widget.
   */
  readonly model: IMarkdownCellModel;

  /**
   * A promise that resolves when the widget renders for the first time.
   */
  get ready(): Promise<void> {
    return this._ready.promise;
  }

  /**
   * Whether the cell is rendered.
   */
  get rendered(): boolean {
    return this._rendered;
  }
  set rendered(value: boolean) {
    if (value === this._rendered) {
      return;
    }
    this._rendered = value;
    this._handleRendered();
  }

  /**
   * Render an input instead of the text editor.
   */
  protected renderInput(widget: Widget): void {
    this.addClass(RENDERED_CLASS);
    this.inputArea.renderInput(widget);
  }

  /**
   * Show the text editor instead of rendered input.
   */
  protected showEditor(): void {
    this.removeClass(RENDERED_CLASS);
    this.inputArea.showEditor();
  }

  /*
   * Handle `update-request` messages.
   */
  protected onUpdateRequest(msg: Message): void {
    // Make sure we are properly rendered.
    this._handleRendered();
    super.onUpdateRequest(msg);
  }

  /**
   * Handle the rendered state.
   */
  private _handleRendered(): void {
    if (!this._rendered) {
      this.showEditor();
    } else {
      this._updateRenderedInput();
      this.renderInput(this._renderer);
    }
  }

  /**
   * Update the rendered input.
   */
  private _updateRenderedInput(): Promise<void> {
    let model = this.model;
    let text = model && model.value.text || DEFAULT_MARKDOWN_TEXT;
    // Do not re-render if the text has not changed.
    if (text !== this._prevText) {
      let mimeModel = new MimeModel({ data: { 'text/markdown': text }});
      if (!this._renderer) {
        this._renderer = this._rendermime.createRenderer('text/markdown');
        this._renderer.addClass(MARKDOWN_OUTPUT_CLASS);
      }
      this._prevText = text;
      return this._renderer.renderModel(mimeModel);
    }
    return Promise.resolve(void 0);
  }

  /**
   * Clone the cell, using the same model.
   */
  clone(): MarkdownCell {
    let constructor = this.constructor as typeof MarkdownCell;
    return new constructor({
      model: this.model,
      contentFactory: this.contentFactory,
      rendermime: this._rendermime
    });
  }

  private _monitor: ActivityMonitor<any, any> = null;
  private _renderer: IRenderMime.IRenderer = null;
  private _rendermime: RenderMimeRegistry;
  private _rendered = true;
  private _prevText = '';
  private _ready = new PromiseDelegate<void>();
}


/**
 * The namespace for the `CodeCell` class statics.
 */
export
namespace MarkdownCell {
  /**
   * An options object for initializing a base cell widget.
   */
  export
  interface IOptions extends Cell.IOptions {
    /**
     * The model used by the cell.
     */
    model: IMarkdownCellModel;

    /**
     * The mime renderer for the cell widget.
     */
    rendermime: RenderMimeRegistry;

  }
}


/******************************************************************************
 * RawCell
 ******************************************************************************/


/**
 * A widget for a raw cell.
 */
export
class RawCell extends Cell {
  /**
   * Construct a raw cell widget.
   */
  constructor(options: Cell.IOptions) {
    super(options);
    this.addClass(RAW_CELL_CLASS);
    super.initializeState();
  }

  /**
   * Clone the cell, using the same model.
   */
  clone(): RawCell {
    let constructor = this.constructor as typeof RawCell;
    return new constructor({
      model: this.model,
      contentFactory: this.contentFactory
    });
  }

  /**
   * The model used by the widget.
   */
  readonly model: IRawCellModel;
}


/**
 * The namespace for the `RawCell` class statics.
 */
export
namespace RawCell {
  /**
   * An options object for initializing a base cell widget.
   */
  export
  interface IOptions extends Cell.IOptions {
    /**
     * The model used by the cell.
     */
    model: IRawCellModel;
  }
}
