// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Kernel, KernelMessage
} from '@jupyterlab/services';

import {
  JSONObject, JSONValue
} from '@phosphor/coreutils';

import {
  Message
} from '@phosphor/messaging';

import {
  PanelLayout
} from '@phosphor/widgets';

import {
  Widget
} from '@phosphor/widgets';

import {
  IChangedArgs
} from '@jupyterlab/coreutils';

import {
  CodeEditor, CodeEditorWidget
} from '@jupyterlab/codeeditor';

import {
  MimeModel, RenderMime
} from '@jupyterlab/rendermime';

import {
  IObservableMap, ObservableMap
} from '@jupyterlab/coreutils';

import {
  OutputAreaWidget
} from '@jupyterlab/outputarea';

import {
  ICellModel, ICodeCellModel,
  IMarkdownCellModel, IRawCellModel
} from './model';


/**
 * The class name added to cell widgets.
 */
const CELL_CLASS = 'jp-Cell';

/**
 * The class name added to the prompt area of cell.
 */
const PROMPT_CLASS = 'jp-Cell-prompt';

/**
 * The class name added to input area widgets.
 */
const INPUT_CLASS = 'jp-InputArea';

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
 * The class name added to rendered markdown output widgets.
 */
const MARKDOWN_OUTPUT_CLASS = 'jp-MarkdownOutput';

/**
 * The class name added to raw cells.
 */
const RAW_CELL_CLASS = 'jp-RawCell';

/**
 * The class name added to cell editor widget nodes.
 */
const CELL_EDITOR_CLASS = 'jp-CellEditor';

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
class BaseCellWidget extends Widget {
  /**
   * Construct a new base cell widget.
   */
  constructor(options: BaseCellWidget.IOptions) {
    super();
    this.addClass(CELL_CLASS);
    this.layout = new PanelLayout();

    let model = this._model = options.model;

    let factory = this.contentFactory = options.contentFactory;
    let editorOptions = { model, factory: factory.editorFactory };

    let editor = this._editor = factory.createCellEditor(editorOptions);
    editor.addClass(CELL_EDITOR_CLASS);

    this._input = factory.createInputArea({ editor });
    (this.layout as PanelLayout).addWidget(this._input);
  }

  /**
   * The content factory used by the widget.
   */
  readonly contentFactory: BaseCellWidget.IContentFactory;

  /**
   * Get the prompt node used by the cell.
   */
  get promptNode(): HTMLElement {
    return this._input.promptNode;
  }

  /**
   * Get the editor widget used by the cell.
   */
  get editorWidget(): CodeEditorWidget {
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

  private _input: InputAreaWidget = null;
  private _editor: CodeEditorWidget = null;
  private _model: ICellModel = null;
  private _readOnly = false;
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
     * The model used by the cell.
     */
    model: ICellModel;

    /**
     * The factory object for cell components.
     */
    contentFactory: BaseCellWidget.IContentFactory;
  }

  /**
   * The factory object for cell components.
   */
  export
  interface IContentFactory {
    /**
     * The editor factory.
     */
    readonly editorFactory: CodeEditor.Factory;

    /**
     * Create a new cell editor for the widget.
     */
    createCellEditor(options: CodeEditorWidget.IOptions): CodeEditorWidget;

    /**
     * Create a new input area for the widget.
     */
    createInputArea(options: InputAreaWidget.IOptions): InputAreaWidget;
  }

  /**
   * The default implementation of an `IContentFactory`.
   */
  export
  class ContentFactory implements IContentFactory {
    /**
     * Creates a new renderer.
     */
    constructor(options: ContentFactory.IOptions) {
      this.editorFactory = options.editorFactory;
    }

    /**
     * The editor factory.
     */
    readonly editorFactory: CodeEditor.Factory;

    /**
     * Create a new cell editor for the widget.
     */
    createCellEditor(options: CodeEditorWidget.IOptions): CodeEditorWidget {
      return new CodeEditorWidget(options);
    }

    /**
     * Create a new input area for the widget.
     */
    createInputArea(options: InputAreaWidget.IOptions): InputAreaWidget {
      return new InputAreaWidget(options);
    }
  }

  /**
   * The namespace for the `ContentFactory` class statics.
   */
  export
  namespace ContentFactory {
    /**
     * An options object for initializing a renderer.
     */
    export
    interface IOptions {
      /**
       * A code editor factory.
       */
      readonly editorFactory: CodeEditor.Factory;
    }
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
    let rendermime = this._rendermime = options.rendermime;
    let factory = options.contentFactory;
    let model = this.model;
    this._output = factory.createOutputArea({
      model: model.outputs,
      rendermime,
      contentFactory: factory.outputAreaContentFactory
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
  readonly contentFactory: CodeCellWidget.IContentFactory;

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
   * Execute the cell given a kernel.
   */
  execute(kernel: Kernel.IKernel): Promise<KernelMessage.IExecuteReplyMsg> {
    let model = this.model;
    let code = model.value.text;
    if (!code.trim()) {
      model.executionCount = null;
      model.outputs.clear();
      return Promise.resolve(null);
    }
    model.executionCount = null;
    this.setPrompt('*');
    this.model.trusted = true;
    return this._output.execute(code, kernel).then(reply => {
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
  private _output: OutputAreaWidget = null;
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
    contentFactory: IContentFactory;
  }

  /**
   * A factory for creating code cell widget components.
   */
  export
  interface IContentFactory extends BaseCellWidget.IContentFactory {
    /**
     * The factory for output area content.
     */
    readonly outputAreaContentFactory: OutputAreaWidget.IContentFactory;

    /**
     * Create a new output area for the widget.
     */
    createOutputArea(options: OutputAreaWidget.IOptions): OutputAreaWidget;
  }

  /**
   * The default implementation of an `IContentFactory`.
   */
  export
  class ContentFactory extends BaseCellWidget.ContentFactory implements IContentFactory {
    /**
     * Construct a new code cell content factory
     */
    constructor(options: ContentFactory.IOptions) {
      super(options);
      this.outputAreaContentFactory = (options.outputAreaContentFactory ||
        OutputAreaWidget.defaultContentFactory
      );
    }

    /**
     * The factory for output area content.
     */
    readonly outputAreaContentFactory: OutputAreaWidget.IContentFactory;

    /**
     * Create an output area widget.
     */
    createOutputArea(options: OutputAreaWidget.IOptions): OutputAreaWidget {
      return new OutputAreaWidget(options);
    }
  }

  /**
   * The namespace for the `ContentFactory` class statics.
   */
  export
  namespace ContentFactory {
    /**
     * An options object for initializing a renderer.
     */
    export
    interface IOptions {
      /**
       * A code editor factory.
       */
      editorFactory: CodeEditor.Factory;

      /**
       * The factory to use for output area widget content.
       */
      outputAreaContentFactory?: OutputAreaWidget.IContentFactory;
    }
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
    contentFactory: BaseCellWidget.IContentFactory;
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
    contentFactory: BaseCellWidget.IContentFactory;
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
  constructor(options: InputAreaWidget.IOptions) {
    super();
    this.addClass(INPUT_CLASS);
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
  private _editor: CodeEditorWidget;
  private _rendered: Widget;
}


/**
 * The namespace for `InputAreaWidget` statics.
 */
export
namespace InputAreaWidget {
  /**
   * The options used to create an `InputAreaWidget`.
   */
  export
  interface IOptions {
    /**
     * The editor widget contained by the input area.
     */
    editor: CodeEditorWidget;
  }
}
