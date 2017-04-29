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
  IChangedArgs
} from '@jupyterlab/coreutils';

import {
  CodeEditor, CodeEditorWrapper
} from '@jupyterlab/codeeditor';

import {
  MimeModel, RenderMime
} from '@jupyterlab/rendermime';

import {
  IObservableMap, ObservableMap
} from '@jupyterlab/coreutils';

import {
  OutputArea
} from '@jupyterlab/outputarea';

import {
  ICellModel, ICodeCellModel,
  IMarkdownCellModel, IRawCellModel
} from './model';


/**
 * The CSS class added to cell widgets.
 */
const CELL_CLASS = 'jp-Cell';

/**
 * The CSS class added to the cell header.
 */
const CELL_HEADER_CLASS = 'JP-Cell-header';

/**
 * The CSS class added to the cell footer.
 */
const CELL_FOOTER_CLASS = 'JP-Cell-footer';

/**
 * The CSS class added to the cell input wrapper.
 */
const CELL_INPUT_WRAPPER_CLASS = 'jp-Cell-inputWrapper';

/**
 * The CSS class added to the cell output wrapper.
 */
const CELL_OUTPUT_WRAPPER_CLASS = 'jp-Cell-outputWrapper';

/**
 * The CSS class added to the cell input collapser.
 */
const CELL_INPUT_COLLAPSER_CLASS = 'jp-Cell-inputCollapser';

/**
 * The CSS class added to the cell output collapser.
 */
const CELL_OUTPUT_COLLAPSER_CLASS = 'jp-Cell-outputCollapser';

/**
 * The class name added to input area widgets.
 */
const INPUT_AREA_CLASS = 'jp-InputArea';

/**
 * The class name added to the prompt area of cell.
 */
const INPUT_PROMPT_CLASS = 'jp-InputArea-prompt';

/**
 * The class name added to the editor area of the cell.
 */
const INPUT_EDITOR_CLASS = 'jp-InputArea-editor';

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

/**
 * The text applied to an empty markdown cell.
 */
const DEFAULT_MARKDOWN_TEXT = 'Type Markdown and LaTeX: $ α^2 $';





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
    let contentFactory = this.contentFactory = (options.contentFactory || Cell.defaultContentFactory);
    let editorFactory = this.editorFactory = options.editorFactory;
    this.layout = new PanelLayout();

    // Header
    let header = this._header = contentFactory.createCellHeader();
    header.addClass(CELL_HEADER_CLASS);
    (this.layout as PanelLayout).addWidget(header);

    // Input
    let inputWrapper = this._inputWrapper = new Panel();
    inputWrapper.addClass(CELL_INPUT_WRAPPER_CLASS);
    let inputCollapser = this._inputCollapser = contentFactory.createCollapser();
    let editorOptions = { model, factory: editorFactory };
    let editor = this._editor = contentFactory.createCellEditorWrapper(editorOptions);
    editor.addClass(INPUT_EDITOR_CLASS);
    let input = this._input = contentFactory.createInputArea({ editor });
    inputWrapper.addWidget(inputCollapser);
    inputWrapper.addWidget(input);
    (this.layout as PanelLayout).addWidget(this._input);

    // Output and footer
    this.finishCell();
  }

  /**
   * The content factory used by the widget.
   */
  readonly contentFactory: Cell.IContentFactory;

  readonly editorFactory: CodeEditor.Factory;

  /**
   * Get the prompt node used by the cell.
   */
  get promptNode(): HTMLElement {
    return this._input.promptNode;
  }

  /**
   * Get the editor widget used by the cell.
   */
  get editorWidget(): CodeEditorWrapper {
    return this._editor;
  }

  /**
   * Get the editor used by the cell.
   */
  get editor(): CodeEditor.IEditor {
    return this._editor.editor;
  }

  /**
   * Get the model used by the cell.
   */
  get model(): ICellModel {
    return this._model;
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
  get inputCollapsed(): boolean {
    return this._inputCollapsed;
  }
  set inputCollapsed(value: boolean) {
    this._inputCollapsed = value;
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
   * Dispose of the resources held by the widget.
   */
  dispose() {
    // Do nothing if already disposed.
    if (this.isDisposed) {
      return;
    }
    this._model = null;
    this._input = null;
    this._editor = null;
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
    this._editor.editor.focus();
  }

  /**
   * Handle `update-request` messages.
   */
  protected onUpdateRequest(msg: Message): void {
    if (!this._model) {
      return;
    }
    // Handle read only state.
    this._editor.editor.readOnly = this._readOnly;
    this.toggleClass(READONLY_CLASS, this._readOnly);
  }

  /**
   * Render an input instead of the text editor.
   */
  protected renderInput(widget: Widget): void {
    this.addClass(RENDERED_CLASS);
    this._input.renderInput(widget);
  }

  /**
   * Show the text editor.
   */
  protected showEditor(): void {
    this.removeClass(RENDERED_CLASS);
    this._input.showEditor();
  }

  protected finishCell(): void {
    let footer = this._footer = this.contentFactory.createCellFooter();
    (this.layout as PanelLayout).addWidget(footer);
  }

  private _input: InputArea = null;
  private _editor: CodeEditorWrapper = null;
  private _model: ICellModel = null;
  private _readOnly = false;
  private _inputCollapsed = false;
  private _outputCollapsed = false;
  private _header: ICellHeader = null;
  private _footer: ICellFooter = null;
  private _inputCollapser: ICollapser = null;
  private _outputCollapser: ICollapser = null;
  private _inputWrapper: Widget = null;
  private _outputWrapper: Widget = null;
}


/**
 * The namespace for the `Cell` class statics.
 */
export
namespace Cell {
  /**
   * An options object for initializing a base cell widget.
   */
  export
  interface IOptions {
    /**
     * The model used by the cell.
     */
    model: ICellModel;

    /**
     * The factory object for cell components.
     */
    contentFactory: Cell.IContentFactory;

    /**
     * The factory object for creating actual editors.
     */
    editorFactory: CodeEditor.Factory;
  }

  /**
   * The factory object for cell components.
   */
  export
  interface IContentFactory extends OutputArea.IContentFactory {

    /**
     * Create a new cell editor for the parent widget.
     */
    createCellEditorWrapper(options: CodeEditorWrapper.IOptions): CodeEditorWrapper;

    /**
     * Create a new input area for the parent widget.
     */
    createInputArea(options: InputArea.IOptions): InputArea;

    /**
     * Create a new cell header for the parent widget.
     */
    createCellHeader(): ICellHeader;

    /**
     * Create a new cell header for the parent widget.
     */
    createCellFooter(): ICellFooter;

    /**
     * Create a collapser for input and output.
     */
    createCollapser(): ICollapser;
  }

  /**
   * The default implementation of an `IContentFactory`.
   */
  export
  class ContentFactory extends OutputArea.ContentFactory implements IContentFactory {

    /**
     * Create a new cell editor for the widget.
     */
    createCellEditorWrapper(options: CodeEditorWrapper.IOptions): CodeEditorWrapper {
      return new CodeEditorWrapper(options);
    }

    /**
     * Create a new input area for the widget.
     */
    createInputArea(options: InputArea.IOptions): InputArea {
      return new InputArea(options);
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
     * Create a new input/output collaper for the parent widget.
     */
    createCollapser(): ICollapser {
      return new Collapser();
    }
  }

  export
  const defaultContentFactory = new ContentFactory();

}


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
    let rendermime = this._rendermime = options.rendermime;
    let contentFactory = options.contentFactory;
    let model = this.model;
    this._output = contentFactory.createOutputArea({
      model: model.outputs,
      rendermime,
      contentFactory: contentFactory
    });
    (this.layout as PanelLayout).addWidget(this._output);
    this.setPrompt(`${model.executionCount || ''}`);
    model.stateChanged.connect(this.onStateChanged, this);
    model.metadata.changed.connect(this.onMetadataChanged, this);
  }

  /**
   * The model used by the widget.
   */
  readonly model: ICodeCellModel;

  /**
   * The content factory used by the widget.
   */
  readonly contentFactory: Cell.IContentFactory;

  /**
   * Dispose of the resources used by the widget.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this._output = null;
    super.dispose();
  }

  /**
   * Execute the cell given a client session.
   */
  execute(session: IClientSession): Promise<KernelMessage.IExecuteReplyMsg> {
    let model = this.model;
    let code = model.value.text;
    if (!code.trim() || !session.kernel) {
      model.executionCount = null;
      model.outputs.clear();
      return Promise.resolve(null);
    }
    model.executionCount = null;
    this.setPrompt('*');
    this.model.trusted = true;

    return this._output.execute(code, session).then(reply => {
      let status = reply.content.status;
      if (status === 'abort') {
        model.executionCount = null;
        this.setPrompt(' ');
      } else {
        model.executionCount = reply.content.execution_count;
      }
      return reply;
    });
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
      this.setPrompt(`${(model as ICodeCellModel).executionCount}`);
      break;
    default:
      break;
    }
  }

  /**
   * Handle changes in the metadata.
   */
  protected onMetadataChanged(model: IObservableMap<JSONValue>, args: ObservableMap.IChangedArgs<JSONValue>): void {
    switch (args.key) {
    case 'collapsed':
    case 'scrolled':
      this.update();
      break;
    default:
      break;
    }
  }

  private _rendermime: RenderMime = null;
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
  interface IOptions {
    /**
     * The model used by the cell.
     */
    model: ICodeCellModel;

    /**
     * The mime renderer for the cell widget.
     */
    rendermime: RenderMime;

    /**
     * The factory used to create code cell components.
     */
    contentFactory: Cell.IContentFactory;
  }

}


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
class MarkdownCellWidget extends Cell {
  /**
   * Construct a Markdown cell widget.
   */
  constructor(options: MarkdownCellWidget.IOptions) {
    super(options);
    this.addClass(MARKDOWN_CELL_CLASS);
    this._rendermime = options.rendermime;
    this.editor.wordWrap = true;
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
   * Dispose of the resource held by the widget.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this._output = null;
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
      this._updateOutput();
      this.renderInput(this._output);
    }
  }

  /**
   * Update the output.
   */
  private _updateOutput(): void {
    let model = this.model;
    let text = model && model.value.text || DEFAULT_MARKDOWN_TEXT;
    let trusted = this.model.trusted;
    // Do not re-render if the text has not changed and the trusted
    // has not changed.
    if (text !== this._prevText || trusted !== this._prevTrusted) {
      let data: JSONObject = { 'text/markdown': text };
      let bundle = new MimeModel({ data, trusted });
      let widget = this._rendermime.render(bundle);
      this._output = widget || new Widget();
      this._output.addClass(MARKDOWN_OUTPUT_CLASS);
    }
    this._prevText = text;
    this._prevTrusted = trusted;
  }

  private _rendermime: RenderMime = null;
  private _output: Widget = null;
  private _rendered = true;
  private _prevText = '';
  private _prevTrusted = false;
}


/**
 * The namespace for the `CodeCell` class statics.
 */
export
namespace MarkdownCellWidget {
  /**
   * An options object for initializing a base cell widget.
   */
  export
  interface IOptions {
    /**
     * The model used by the cell.
     */
    model: IMarkdownCellModel;

    /**
     * The mime renderer for the cell widget.
     */
    rendermime: RenderMime;

    /**
     * The factory object for cell components.
     */
    contentFactory: Cell.IContentFactory;
  }
}


/**
 * A widget for a raw cell.
 */
export
class RawCellWidget extends Cell {
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
 * The namespace for the `RawCellWidget` class statics.
 */
export
namespace RawCellWidget {
  /**
   * An options object for initializing a base cell widget.
   */
  export
  interface IOptions {
    /**
     * The model used by the cell.
     */
    model: IRawCellModel;

    /**
     * The factory object for cell components.
     */
    contentFactory: Cell.IContentFactory;
  }
}


/**
 * An input area widget, which hosts a prompt and an editor widget.
 */
export
class InputArea extends Widget {
  /**
   * Construct an input area widget.
   */
  constructor(options: InputArea.IOptions) {
    super();
    this.addClass(INPUT_AREA_CLASS);
    let editor = this._editor = options.editor;
    editor.addClass(EDITOR_CLASS);
    this.layout = new PanelLayout();
    let prompt = this._prompt = new Widget();
    prompt.addClass(PROMPT_CLASS);
    let layout = this.layout as PanelLayout;
    layout.addWidget(prompt);
    layout.addWidget(editor);
  }

  /**
   * Get the prompt node used by the cell.
   */
  get promptNode(): HTMLElement {
    return this._prompt.node;
  }

  /**
   * Render an input instead of the text editor.
   */
  renderInput(widget: Widget): void {
    let layout = this.layout as PanelLayout;
    if (this._rendered) {
      layout.removeWidget(this._rendered);
    } else {
      layout.removeWidget(this._editor);
    }
    this._rendered = widget;
    layout.addWidget(widget);
  }

  /**
   * Show the text editor.
   */
  showEditor(): void {
    let layout = this.layout as PanelLayout;
    if (this._rendered) {
      layout.removeWidget(this._rendered);
      layout.addWidget(this._editor);
    }
  }

  /**
   * Set the prompt of the input area.
   */
  setPrompt(value: string): void {
    if (value === 'null') {
      value = ' ';
    }
    let text = `In [${value || ' '}]:`;
    this._prompt.node.textContent = text;
  }

  private _prompt: Widget;
  private _editor: CodeEditorWrapper;
  private _rendered: Widget;
}


/**
 * The namespace for `InputArea` statics.
 */
export
namespace InputArea {
  /**
   * The options used to create an `InputArea`.
   */
  export
  interface IOptions {
    /**
     * The editor widget contained by the input area.
     */
    editor: CodeEditorWrapper;
  }
}


/**
 * The cell header interface.
 */
export
interface ICellHeader extends Widget {}

/**
 * Default implementatino of the cell header is a Widget with a class
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
 * Default implementatino of the cell footer is a Widget with a class
 */
export
class CellFooter extends Widget implements ICellFooter {
}


export
interface ICollapser extends Widget {}

export
class Collapser extends Widget {
  constructor() {
    super();
  }
}