// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  IKernel
} from 'jupyter-js-services';

import {
  loadModeByMIME
} from '../../codemirror';

import {
  RenderMime, MimeMap
} from '../../rendermime';

import {
  Message
} from 'phosphor-messaging';

import {
  PanelLayout
} from 'phosphor-panel';

import {
  IChangedArgs
} from 'phosphor-properties';

import {
  ISignal, Signal, disconnectReceiver
} from 'phosphor-signaling';

import {
  Widget
} from 'phosphor-widget';

import {
  nbformat
} from '../notebook/nbformat';

import {
  OutputAreaWidget, OutputAreaModel, executeCode
} from '../output-area';

import {
  IMetadataCursor
} from '../common/metadata';

import {
  CellEditorWidget
} from './editor';

import {
  ICodeCellModel, ICellModel
} from './model';


/**
 * The class name added to cell widgets.
 */
const CELL_CLASS = 'jp-Cell';

/**
 * The class name added to input area widgets.
 */
const INPUT_CLASS = 'jp-InputArea';

/**
 * The class name added to the prompt area of cell.
 */
const PROMPT_CLASS = 'jp-InputArea-prompt';

/**
 * The class name added to the editor area of the cell.
 */
const EDITOR_CLASS = 'jp-InputArea-editor';

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
 * The class name added to the markdown cell renderer widget.
 */
const RENDERER_CLASS = 'jp-MarkdownCell-renderer';

/**
 * The class name added to raw cells.
 */
const RAW_CELL_CLASS = 'jp-RawCell';

/**
 * The class name added to a rendered markdown cell.
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
class BaseCellWidget extends Widget {
  /**
   * Construct a new base cell widget.
   */
  constructor(options: BaseCellWidget.IOptions = {}) {
    super();
    this.addClass(CELL_CLASS);
    this.layout = new PanelLayout();
    this.modelChanged.connect(this.onModelChanged, this);

    this._options = options;
    this._factory = options.cellWidgetFactory || Private.defaultFactory;
    this._editor = this._factory.createCellEditor(options.model || null);
    this._input = this._factory.createInputArea(this._editor);

    (this.layout as PanelLayout).addChild(this._input);
    this.model = options.model || null;
  }

  /**
   * The model used by the widget.
   */
  get model(): ICellModel {
    return this._model;
  }
  set model(model: ICellModel) {
    if (!model && !this._model || model === this._model) {
      return;
    }
    // If the model is being replaced, disconnect the old signal handler.
    if (this._model) {
      this._model.metadataChanged.disconnect(this.onMetadataChanged, this);
    }
    let args: IChangedArgs<ICellModel>;

    if (!model) {
      args = { name: 'model', oldValue: this._model, newValue: null };
      this._editor.model = null;
      this._model = null;
      this.modelChanged.emit(args);
      return;
    }
    args = { name: 'model', oldValue: this._model, newValue: model };
    this._model = model;
    this._editor.model = this._model;
    // Set the editor mode to be the default MIME type.
    loadModeByMIME(this._editor.editor, this._mimetype);
    this._model.metadataChanged.connect(this.onMetadataChanged, this);
    this._trustedCursor = this._model.getMetadata('trusted');
    this._trusted = !!this._trustedCursor.getValue();
    this.modelChanged.emit(args);
  }

  /**
   * The widget renderer factory.
   */
  get factory(): BaseCellWidget.ICellWidgetFactory {
    return this._factory;
  }

  /**
   * The instantiation options of the widget.
   */
  get options(): BaseCellWidget.IOptions {
    return this._options;
  }

  /**
   * A signal emitted when the model of the notebook changes.
   */
  get modelChanged(): ISignal<BaseCellWidget, IChangedArgs<ICellModel>> {
    return Private.modelChangedSignal.bind(this);
  }

  /**
   * Get the editor widget used by the cell.
   *
   * #### Notes
   * This is a ready-only property.
   */
  get editor(): CellEditorWidget {
    return this._editor;
  }

  /**
   * The mimetype used by the cell.
   */
  get mimetype(): string {
    return this._mimetype;
  }
  set mimetype(value: string) {
    if (!value) {
      return;
    }
    if (this._mimetype === value) {
      return;
    }
    this._mimetype = value;
    loadModeByMIME(this.editor.editor, value);
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
   * The trusted state of the cell.
   */
  get trusted(): boolean {
    return this._trusted;
  }
  set trusted(value: boolean) {
    this._trustedCursor.setValue(value);
    this._trusted = value;
  }

  /**
   * Focus the widget.
   */
  focus(): void {
    this.editor.editor.focus();
  }

  /**
   * Set the prompt for the widget.
   */
  setPrompt(value: string): void {
    this._input.setPrompt(value);
  }

  /**
   * Toggle whether the input area is shown.
   */
  toggleInput(value: boolean): void {
    if (value) {
      this._input.show();
      this.focus();
    } else {
      this._input.hide();
    }
  }

  /**
   * Dispose of the resources held by the widget.
   */
  dispose() {
    // Do nothing if already disposed.
    if (this.isDisposed) {
      return;
    }
    this.modelChanged.disconnect(this.onModelChanged, this);
    this._model = null;
    this._input = null;
    this._editor = null;
    this._trustedCursor = null;
    this._options = null;
    super.dispose();
  }

  /**
   * Handle `after-attach` messages.
   */
  protected onAfterAttach(msg: Message): void {
    this.update();
  }

  /**
   * Handle `update_request` messages.
   */
  protected onUpdateRequest(message: Message): void {
    // Handle read only state.
    let option = this._readOnly ? 'nocursor' : false;
    this.editor.editor.setOption('readOnly', option);
    this.toggleClass(READONLY_CLASS, this._readOnly);
  }

  /**
   * Handle the widget receiving a new model.
   *
   * #### Notes
   * This method should be implemented by subclasses that need to respond to
   * the model being replaced.
   */
  protected onModelChanged(sender: any, args: IChangedArgs<ICellModel>): void {
  }

  /**
   * Handle changes in the model.
   */
  protected onMetadataChanged(model: ICellModel, args: IChangedArgs<any>): void {
    switch (args.name) {
    case 'trusted':
      this._trusted = !!this._trustedCursor.getValue();
      this.update();
      break;
    default:
      break;
    }
  }

  private _factory: BaseCellWidget.ICellWidgetFactory;
  private _options: BaseCellWidget.IOptions;
  private _input: InputAreaWidget = null;
  private _editor: CellEditorWidget = null;
  private _model: ICellModel = null;
  private _mimetype = 'text/plain';
  private _readOnly = false;
  private _trustedCursor: IMetadataCursor = null;
  private _trusted = false;
}


/**
 * The namespace for the `BaseCellWidget` class statics.
 */
export
namespace BaseCellWidget {
  /**
   * An options object for initializing a base cell widget.
   */
  export
  interface IOptions {
    /**
     * A factory for creating code cell widgets.
     *
     * The default is a shared factory instance.
     */
    cellWidgetFactory?: ICellWidgetFactory;
  }

  /**
   * A factory for creating code cell widgets.
   */
  export
  interface ICellWidgetFactory {
    /**
     * Create a new cell editor for the widget.
     */
    createCellEditor(model: ICellModel): CellEditorWidget;

    /**
     * Create a new input area for the widget.
     */
    createInputArea(editor: CellEditorWidget): InputAreaWidget;
  }

  /**
   * A factory for creating code cell widgets.
   */
  export
  interface ICellWidgetFactory {
    /**
     * Create a new cell editor for the widget.
     */
    createCellEditor(model: ICellModel): CellEditorWidget;

    /**
     * Create a new input area for the widget.
     */
    createInputArea(editor: CellEditorWidget): InputAreaWidget;
  }
}

/**
 * A widget for a code cell.
 */
export
class CodeCellWidget extends BaseCellWidget {
  /**
   * Construct a code cell widget.
   */
  constructor(options: CodeCellWidget.IOptions) {
    super(options);
    this.addClass(CODE_CELL_CLASS);
  }

  /**
   * Dispose of the resources used by the widget.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this._collapsedCursor = null;
    this._scrolledCursor = null;
    this._output = null;
    super.dispose();
  }

  /**
   * Execute the cell given a kernel.
   */
  execute(kernel: IKernel): Promise<void> {
    let model = this.model as ICodeCellModel;
    let code = model.source;
    if (!code.trim()) {
      model.executionCount = null;
      return Promise.resolve(void 0);
    }
    model.executionCount = null;
    this.setPrompt('*');
    this.trusted = true;
    let outputs = model.outputs;
    return executeCode(code, kernel, outputs).then(reply => {
      model.executionCount = reply.execution_count;
    });
  }

  /**
   * Handle `update_request` messages.
   */
  protected onUpdateRequest(message: Message): void {
    if (this._collapsedCursor) {
      this.toggleClass(COLLAPSED_CLASS, this._collapsedCursor.getValue());
    }
    if (this._output) {
      // TODO: handle scrolled state.
      this._output.trusted = this.trusted;
    }
    super.onUpdateRequest(message);
  }

  /**
   * Handle the widget receiving a new model.
   */
  protected onModelChanged(sender: any, args: IChangedArgs<ICellModel>): void {
    if (args.oldValue) {
      args.oldValue.stateChanged.disconnect(this.onModelStateChanged, this);
    }

    let factory = this.factory as CodeCellWidget.ICellWidgetFactory;
    let model = this.model as ICodeCellModel;
    let options = this.options as CodeCellWidget.IOptions

    if (this._output) {
      this._output.dispose();
    }

    this._output = factory.createOutputArea(model.outputs, options.rendermime);
    this._output.trusted = this.trusted;
    (this.layout as PanelLayout).addChild(this._output);
    this._collapsedCursor = model.getMetadata('collapsed');
    this._scrolledCursor = model.getMetadata('scrolled');
    this.setPrompt(`${model.executionCount}`);
    model.stateChanged.connect(this.onModelStateChanged, this);
  }

  /**
   * Handle changes in the model.
   */
  protected onModelStateChanged(model: ICodeCellModel, args: IChangedArgs<any>): void {
    switch (args.name) {
    case 'executionCount':
      this.setPrompt(`${model.executionCount}`);
      break;
    default:
      break;
    }
  }

  /**
   * Handle changes in the metadata.
   */
  protected onMetadataChanged(model: ICodeCellModel, args: IChangedArgs<any>): void {
    switch (args.name) {
    case 'collapsed':
    case 'scrolled':
      this.update();
      break;
    default:
      break;
    }
    super.onMetadataChanged(model, args);
  }

  private _output: OutputAreaWidget = null;
  private _collapsedCursor: IMetadataCursor = null;
  private _scrolledCursor: IMetadataCursor = null;
}


/**
 * The namespace for the `CodeCellWidget` class statics.
 */
export
namespace CodeCellWidget {
  /**
   * An options object for initializing a base cell widget.
   */
  export
  interface IOptions {
    /**
     * A factory for creating code cell widgets.
     *
     * The default is a shared factory instance.
     */
    cellWidgetFactory?: ICellWidgetFactory;

    /**
     * A model for the cell widget.
     */
    model: ICodeCellModel;

    /**
     * The mime renderer for the cell widget.
     */
    rendermime: RenderMime<Widget>;
  }

  /**
   * A factory for creating code cell widgets.
   */
  export
  interface ICellWidgetFactory extends BaseCellWidget.ICellWidgetFactory {
    /**
     * Create a new output area for the widget.
     */
    createOutputArea(outputs: ObservableOutputs, rendermime: RenderMime<Widget>): OutputAreaWidget;
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
class MarkdownCellWidget extends BaseCellWidget {
  /**
   * Construct a Markdown cell widget.
   */
  constructor(options: MarkdownCellWidget.IOptions) {
    super(options);
    this.addClass(MARKDOWN_CELL_CLASS);
    // Insist on the Github-flavored markdown mode.
    this.mimetype = 'text/x-ipythongfm';
    this._renderer = new Widget();
    this._renderer.addClass(RENDERER_CLASS);
    (this.layout as PanelLayout).addChild(this._renderer);
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
    this.update();
  }

  /**
   * Dispose of the resource held by the widget.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this._renderer = null;
    super.dispose();
  }

  /**
   * Handle `update_request` messages.
   */
  protected onUpdateRequest(message: Message): void {
    let model = this.model;
    let options = this.options as MarkdownCellWidget.IOptions;
    if (this.rendered) {
      let text = model.source || DEFAULT_MARKDOWN_TEXT;
      // Do not re-render if the text has not changed.
      if (text !== this._prev) {
        let bundle: MimeMap<string> = { 'text/markdown': text };
        this._renderer.dispose();
        this._renderer = options.rendermime.render(bundle) || new Widget();
        this._renderer.addClass(RENDERER_CLASS);
        (this.layout as PanelLayout).addChild(this._renderer);
      }
      this._prev = text;
      this._renderer.show();
      this.toggleInput(false);
      this.addClass(RENDERED_CLASS);
    } else {
      this._renderer.hide();
      this.toggleInput(true);
      this.removeClass(RENDERED_CLASS);
    }
    super.onUpdateRequest(message);
  }

  private _renderer: Widget = null;
  private _rendered = true;
  private _prev = '';
}


/**
 * The namespace for the `CodeCellWidget` class statics.
 */
export
namespace MarkdownCellWidget {
  /**
   * An options object for initializing a base cell widget.
   */
  export
    interface IOptions {
    /**
     * A factory for creating code cell widgets.
     *
     * The default is a shared factory instance.
     */
    cellWidgetFactory?: BaseCellWidget.ICellWidgetFactory;

    /**
     * A model for the cell widget.
     */
    model?: ICellModel;

    /**
     * The mime renderer for the cell widget.
     */
    rendermime: RenderMime<Widget>;
  }
}


/**
 * A widget for a raw cell.
 */
export
class RawCellWidget extends BaseCellWidget {
  /**
   * Construct a raw cell widget.
   */
  constructor(options: BaseCellWidget.IOptions) {
    super(options);
    this.addClass(RAW_CELL_CLASS);
  }
}


/**
 * An input area widget, which hosts a prompt and an editor widget.
 */
export
class InputAreaWidget extends Widget {
  /**
   * Construct an input area widget.
   */
  constructor(editor: CellEditorWidget) {
    super();
    this.addClass(INPUT_CLASS);
    editor.addClass(EDITOR_CLASS);
    this.layout = new PanelLayout();
    let prompt = new Widget();
    prompt.addClass(PROMPT_CLASS);
    let layout = this.layout as PanelLayout;
    layout.addChild(prompt);
    layout.addChild(editor);
  }

  /**
   * Set the prompt of the input area.
   */
  setPrompt(value: string): void {
    let prompt = (this.layout as PanelLayout).childAt(0);
    if (value === 'null') {
      value = ' ';
    }
    let text = `In [${value || ' '}]:`;
    prompt.node.textContent = text;
  }
}


/**
 * A namespace for private data.
 */
namespace Private {
  /**
   * A signal emitted when the model changes on a cell widget.
   */
  export
  const modelChangedSignal = new Signal<BaseCellWidget, IChangedArgs<ICellModel>>();


  export
  const defaultFactory: CodeCellWidget.ICellWidgetFactory = {
    /**
     * Create a new cell editor for the widget.
     */
    createCellEditor: (model: ICellModel): CellEditorWidget => {
      return new CellEditorWidget(model);
    },

    /**
    * Create a new input area for the widget.
    */
    createInputArea: (editor: CellEditorWidget): InputAreaWidget => {
      return new InputAreaWidget(editor);
    },

    /**
    * Create an output area widget.
    */
    createOutputArea: (model: OutputAreaModel, rendermime: RenderMime<Widget>): OutputAreaWidget => {
      let output = new OutputAreaWidget({ rendermime });
      output.model = model;
      return output;
    }
  };
}
