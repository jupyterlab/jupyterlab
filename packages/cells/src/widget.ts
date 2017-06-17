// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  KernelMessage
} from '@jupyterlab/services';

import {
  JSONObject, JSONValue
} from '@phosphor/coreutils';

import {
  Message
} from '@phosphor/messaging';

import {
  PanelLayout, Panel
} from '@phosphor/widgets';

import {
  Widget
} from '@phosphor/widgets';

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
  MimeModel, RenderMime
} from '@jupyterlab/rendermime';

import {
  IObservableMap
} from '@jupyterlab/coreutils';

import {
  OutputArea, IOutputPrompt, OutputPrompt, IStdin, Stdin
} from '@jupyterlab/outputarea';

import {
  ICellModel, ICodeCellModel,
  IMarkdownCellModel, IRawCellModel
} from './model';

import {
  InputArea, IInputPrompt, InputPrompt
} from './inputarea';


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
    let inputCollapser = this._inputCollapser = contentFactory.createCollapser();
    inputCollapser.addClass(CELL_INPUT_COLLAPSER_CLASS);
    let input = this._input = new InputArea({model, contentFactory });
    input.addClass(CELL_INPUT_AREA_CLASS);
    inputWrapper.addWidget(inputCollapser);
    inputWrapper.addWidget(input);
    (this.layout as PanelLayout).addWidget(inputWrapper);

    let inputPlaceholder = this._inputPlaceholder = new Widget();
    inputPlaceholder.addClass('jp-InputPlaceholder');

    // Footer
    let footer = this._footer = this.contentFactory.createCellFooter();
    footer.addClass(CELL_FOOTER_CLASS);
    (this.layout as PanelLayout).addWidget(footer);
  }

  /**
   * The content factory used by the widget.
   */
  readonly contentFactory: Cell.IContentFactory;

  /**
   * Get the prompt node used by the cell.
   */
  get promptNode(): HTMLElement {
    return this._input.promptNode;
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
   * Set the prompt for the widget.
   */
  setPrompt(value: string): void {
    this._input.setPrompt(value);
  }

  /**
   * The view state of input being collapsed.
   */
  get sourceHidden(): boolean {
    return this._sourceHidden;
  }
  set sourceHidden(value: boolean) {
    if (this._sourceHidden === value) {
      return;
    }
    let layout = this._inputWrapper.layout as PanelLayout;
    if (value) {
      layout.removeWidget(this._input);
      layout.addWidget(this._inputPlaceholder);
    } else {
      layout.removeWidget(this._inputPlaceholder);
      layout.addWidget(this._input);
    }
    this._sourceHidden = value;
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
    this.editor.readOnly = this._readOnly;
    this.toggleClass(READONLY_CLASS, this._readOnly);
  }

  private _readOnly = false;
  private _sourceHidden = false;
  private _input: InputArea = null;
  private _model: ICellModel = null;
  private _header: ICellHeader = null;
  private _footer: ICellFooter = null;
  private _inputCollapser: ICollapser = null;
  private _inputWrapper: Widget = null;
  private _inputPlaceholder: Widget = null;

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

    /**
     * Create a new input/output collaper for the parent widget.
     */
    createCollapser(): ICollapser;
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
     * Create a new input/output collapser for the parent widget.
     */
    createCollapser(): ICollapser {
      return new Collapser();
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

    /**
     * Create an input prompt.
     */
    createInputPrompt(): IInputPrompt {
      return new InputPrompt();
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

    // Code cells should not wrap lines.
    this.editor.wordWrap = false;

    // Insert the output before the cell footer.
    let outputWrapper = this._outputWrapper = new Panel();
    outputWrapper.addClass(CELL_OUTPUT_WRAPPER_CLASS);
    let outputCollapser = this._outputCollapser = contentFactory.createCollapser();
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

    // Modify state
    this.setPrompt(`${model.executionCount || ''}`);
    model.stateChanged.connect(this.onStateChanged, this);
    model.metadata.changed.connect(this.onMetadataChanged, this);
  }

  /**
   * The model used by the widget.
   */
  readonly model: ICodeCellModel;

  /**
   * Get the output area for the cell.
   */
  get outputArea(): OutputArea {
    return this._output;
  }

  /**
   * The view state of output being collapsed.
   */
  get outputCollapsed(): boolean {
    return this._outputCollapsed;
  }
  set outputCollapsed(value: boolean) {
    this._outputCollapsed = value;
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
  }

  private _rendermime: RenderMime = null;
  private _outputCollapsed = false;
  private _outputWrapper: Widget = null;
  private _outputCollapser: ICollapser = null;
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
    rendermime: RenderMime;
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
    cell.setPrompt('*');
    model.trusted = true;

    return OutputArea.execute(code, cell.outputArea, session).then(msg => {
      model.executionCount = msg.content.execution_count;
      return msg;
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
    this._rendermime = options.rendermime;
    this.editor.wordWrap = true;

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
  }

  /**
   * The model used by the widget.
   */
  readonly model: IMarkdownCellModel;

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

  /**
   * Dispose of the resource held by the widget.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this._renderedInput = null;
    this._rendermime = null;
    super.dispose();
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
      this.renderInput(this._renderedInput);
    }
  }

  /**
   * Update the rendered input.
   */
  private _updateRenderedInput(): void {
    let model = this.model;
    let text = model && model.value.text || DEFAULT_MARKDOWN_TEXT;
    let trusted = this.model.trusted;
    // Do not re-render if the text has not changed and the trusted
    // has not changed.
    if (text !== this._prevText || trusted !== this._prevTrusted) {
      let data: JSONObject = { 'text/markdown': text };
      let bundle = new MimeModel({ data, trusted });
      let widget = this._rendermime.render(bundle);
      this._renderedInput = widget || new Widget();
      this._renderedInput.addClass(MARKDOWN_OUTPUT_CLASS);
    }
    this._prevText = text;
    this._prevTrusted = trusted;
  }

  private _monitor: ActivityMonitor<any, any> = null;
  private _rendermime: RenderMime = null;
  private _renderedInput: Widget = null;
  private _rendered = true;
  private _prevText = '';
  private _prevTrusted = false;
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
    rendermime: RenderMime;

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


/******************************************************************************
 * Cell children
 ******************************************************************************/


/**
 * The cell header interface.
 */
export
interface ICellHeader extends Widget {}


/**
 * Default implementation of the cell header is a Widget with a class
 */
export
class CellHeader extends Widget implements ICellHeader {
}


/**
 * The cell footer interface.
 */
export
interface ICellFooter extends Widget {}


/**
 * Default implementation of the cell footer is a Widget with a class
 */
export
class CellFooter extends Widget implements ICellFooter {
}


/**
 * A collapser for input and output.
 *
 * This is the element that gets clicked on.
 */
export
interface ICollapser extends Widget {}


/**
 * Default implementation of the collapser.
 */
export
class Collapser extends Widget implements ICollapser {
  constructor() {
    super();
  }
}
