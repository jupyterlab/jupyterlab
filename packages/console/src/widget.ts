// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Kernel, KernelMessage, Session
} from '@jupyterlab/services';

import {
  map, toArray
} from '@phosphor/algorithm';

import {
  Message
} from '@phosphor/messaging';

import {
  ISignal, Signal
} from '@phosphor/signaling';

import {
  Panel, PanelLayout
} from '@phosphor/widgets';

import {
  Widget
} from '@phosphor/widgets';

import {
  IEditorMimeTypeService, CodeEditor
} from '@jupyterlab/codeeditor';

import {
  BaseCellWidget, CodeCellWidget, RawCellWidget,
  ICodeCellModel, IRawCellModel, CellModel,
  RawCellModel, CodeCellModel
} from '@jupyterlab/cells';

import {
  nbformat
} from '@jupyterlab/coreutils';

import {
  OutputAreaWidget
} from '@jupyterlab/outputarea';

import {
  IRenderMime
} from '@jupyterlab/rendermime';

import {
  ForeignHandler
} from './foreign';

import {
  ConsoleHistory, IConsoleHistory
} from './history';

import {
  IObservableVector, ObservableVector
} from '@jupyterlab/coreutils';

/**
 * The class name added to console widgets.
 */
const CONSOLE_CLASS = 'jp-CodeConsole';

/**
 * The class name added to the console banner.
 */
const BANNER_CLASS = 'jp-CodeConsole-banner';

/**
 * The class name of a cell whose input originated from a foreign session.
 */
const FOREIGN_CELL_CLASS = 'jp-CodeConsole-foreignCell';

/**
 * The class name of the active prompt
 */
const PROMPT_CLASS = 'jp-CodeConsole-prompt';

/**
 * The class name of the panel that holds cell content.
 */
const CONTENT_CLASS = 'jp-CodeConsole-content';

/**
 * The class name of the panel that holds prompts.
 */
const INPUT_CLASS = 'jp-CodeConsole-input';

/**
 * The timeout in ms for execution requests to the kernel.
 */
const EXECUTION_TIMEOUT = 250;


/**
 * A widget containing a Jupyter console.
 *
 * #### Notes
 * The CodeConsole class is intended to be used within a ConsolePanel
 * instance. Under most circumstances, it is not instantiated by user code.
 */
export
class CodeConsole extends Widget {
  /**
   * Construct a console widget.
   */
  constructor(options: CodeConsole.IOptions) {
    super();
    this.addClass(CONSOLE_CLASS);

    // Create the panels that hold the content and input.
    let layout = this.layout = new PanelLayout();
    this._cells = new ObservableVector<BaseCellWidget>();
    this._content = new Panel();
    this._input = new Panel();

    let factory = this.contentFactory = options.contentFactory;
    let modelFactory = this.modelFactory = (
      options.modelFactory || CodeConsole.defaultModelFactory
    );
    this.rendermime = options.rendermime;
    this.session = options.session;
    this._mimeTypeService = options.mimeTypeService;

    // Add top-level CSS classes.
    this._content.addClass(CONTENT_CLASS);
    this._input.addClass(INPUT_CLASS);

    // Insert the content and input panes into the widget.
    layout.addWidget(this._content);
    layout.addWidget(this._input);

    // Create the banner.
    let model = modelFactory.createRawCell({});
    model.value.text = '...';
    let banner = this.banner = factory.createBanner({
      model,
      contentFactory: factory.rawCellContentFactory
    }, this);
    banner.addClass(BANNER_CLASS);
    banner.readOnly = true;
    this._content.addWidget(banner);

    // Set the banner text and the mimetype.
    this._initialize();

    // Set up the foreign iopub handler.
    this._foreignHandler = factory.createForeignHandler({
      kernel: this.session.kernel,
      parent: this,
      cellFactory: () => this._createForeignCell(),
    });

    this._history = factory.createConsoleHistory({
      kernel: this.session.kernel
    });

    this.session.kernelChanged.connect(this._onKernelChanged, this);
  }

  /**
   * A signal emitted when the console finished executing its prompt.
   */
  get executed(): ISignal<this, Date> {
    return this._executed;
  }

  /**
   * A signal emitted when a new prompt is created.
   */
  get promptCreated(): ISignal<this, CodeCellWidget> {
    return this._promptCreated;
  }

  /**
   * The content factory used by the console.
   */
  readonly contentFactory: CodeConsole.IContentFactory;

  /**
   * The model factory for the console widget.
   */
  readonly modelFactory: CodeConsole.IModelFactory;

  /**
   * The rendermime instance used by the console.
   */
  readonly rendermime: IRenderMime;

  /**
   * The session used by the console.
   */
  readonly session: Session.ISession;

  /**
   * The console banner widget.
   */
  readonly banner: RawCellWidget;

  /**
   * The list of content cells in the console.
   *
   * #### Notes
   * This list does not include the banner or the prompt for a console.
   */
  get cells(): IObservableVector<BaseCellWidget> {
    return this._cells;
  }

  /*
   * The console input prompt.
   */
  get prompt(): CodeCellWidget | null {
    let inputLayout = (this._input.layout as PanelLayout);
    return inputLayout.widgets[0] as CodeCellWidget || null;
  }

  /**
   * Add a new cell to the content panel.
   *
   * @param cell - The cell widget being added to the content panel.
   *
   * #### Notes
   * This method is meant for use by outside classes that want to inject content
   * into a console. It is distinct from the `inject` method in that it requires
   * rendered code cell widgets and does not execute them.
   */
  addCell(cell: BaseCellWidget) {
    this._content.addWidget(cell);
    this._cells.pushBack(cell);
    cell.disposed.connect(this._onCellDisposed, this);
    this.update();
  }

  /**
   * Clear the code cells.
   */
  clear(): void {
    // Dispose all the content cells except the first, which is the banner.
    let cells = this._content.widgets;
    while (cells.length > 1) {
      cells[1].dispose();
    }
  }

  /**
   * Dispose of the resources held by the widget.
   */
  dispose() {
    // Do nothing if already disposed.
    if (this._foreignHandler === null) {
      return;
    }
    let foreignHandler = this._foreignHandler;
    let history = this._history;
    let cells = this._cells;
    this._foreignHandler = null;
    this._history = null;
    this._cells = null;

    foreignHandler.dispose();
    history.dispose();
    cells.clear();

    super.dispose();
  }

  /**
   * Execute the current prompt.
   *
   * @param force - Whether to force execution without checking code
   * completeness.
   *
   * @param timeout - The length of time, in milliseconds, that the execution
   * should wait for the API to determine whether code being submitted is
   * incomplete before attempting submission anyway. The default value is `250`.
   */
  execute(force = false, timeout = EXECUTION_TIMEOUT): Promise<void> {
    if (this.session.status === 'dead') {
      return Promise.resolve(void 0);
    }

    let prompt = this.prompt;
    prompt.model.trusted = true;

    if (force) {
      // Create a new prompt before kernel execution to allow typeahead.
      this.newPrompt();
      return this._execute(prompt);
    }

    // Check whether we should execute.
    return this._shouldExecute(timeout).then(should => {
      if (this.isDisposed) {
        return;
      }
      if (should) {
        // Create a new prompt before kernel execution to allow typeahead.
        this.newPrompt();
        return this._execute(prompt);
      }
    });
  }

  /**
   * Inject arbitrary code for the console to execute immediately.
   *
   * @param code - The code contents of the cell being injected.
   *
   * @returns A promise that indicates when the injected cell's execution ends.
   */
  inject(code: string): Promise<void> {
    let cell = this._createForeignCell();
    cell.model.value.text = code;
    this.addCell(cell);
    return this._execute(cell);
  }

  /**
   * Insert a line break in the prompt.
   */
  insertLinebreak(): void {
    let prompt = this.prompt;
    let model = prompt.model;
    let editor = prompt.editor;
    // Insert the line break at the cursor position, and move cursor forward.
    let pos = editor.getCursorPosition();
    let offset = editor.getOffsetAt(pos);
    let text = model.value.text;
    model.value.text = text.substr(0, offset) + '\n' + text.substr(offset);
    pos = editor.getPositionAt(offset + 1);
    editor.setCursorPosition(pos);
  }

  /**
   * Serialize the output.
   */
  serialize(): nbformat.ICodeCell[] {
    let prompt = this.prompt;
    let layout = this._content.layout as PanelLayout;
    // Serialize content.
    let output = map(layout.widgets, widget => {
      return (widget as CodeCellWidget).model.toJSON() as nbformat.ICodeCell;
    });
    // Serialize prompt and return.
    return toArray(output).concat(prompt.model.toJSON() as nbformat.ICodeCell);
  }


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
    case 'keydown':
      this._evtKeyDown(event as KeyboardEvent);
      break;
    default:
      break;
    }
  }

  /**
   * Handle `after_attach` messages for the widget.
   */
  protected onAfterAttach(msg: Message): void {
    let node = this.node;
    node.addEventListener('keydown', this, true);
    // Create a prompt if necessary.
    if (!this.prompt) {
      this.newPrompt();
    } else {
      this.prompt.editor.focus();
      this.update();
    }
  }

  /**
   * Handle `before-detach` messages for the widget.
   */
  protected onBeforeDetach(msg: Message): void {
    let node = this.node;
    node.removeEventListener('keydown', this, true);
  }

  /**
   * Handle `'activate-request'` messages.
   */
  protected onActivateRequest(msg: Message): void {
    this.prompt.editor.focus();
    this.update();
  }

  /**
   * Make a new prompt.
   */
  protected newPrompt(): void {
    let prompt = this.prompt;
    let input = this._input;

    // Make the last prompt read-only, clear its signals, and move to content.
    if (prompt) {
      prompt.readOnly = true;
      prompt.removeClass(PROMPT_CLASS);
      Signal.clearData(prompt.editor);
      (input.layout as PanelLayout).removeWidgetAt(0);
      this.addCell(prompt);
    }

    // Create the new prompt.
    let factory = this.contentFactory;
    let options = this._createCodeCellOptions();
    prompt = factory.createPrompt(options, this);
    prompt.model.mimeType = this._mimetype;
    prompt.addClass(PROMPT_CLASS);
    this._input.addWidget(prompt);

    // Suppress the default "Enter" key handling.
    let editor = prompt.editor;
    editor.addKeydownHandler(this._onEditorKeydown);

    this._history.editor = editor;
    if (this.isAttached) {
      this.activate();
    }
    this._promptCreated.emit(prompt);
  }

  /**
   * Handle `update-request` messages.
   */
  protected onUpdateRequest(msg: Message): void {
    Private.scrollToBottom(this._content.node);
  }

  /**
   * Handle the `'keydown'` event for the widget.
   */
  private _evtKeyDown(event: KeyboardEvent): void {
    let editor = this.prompt.editor;
    if (event.keyCode === 13 && !editor.hasFocus()) {
      event.preventDefault();
      editor.focus();
    }
  }

  /**
   * Initialize the banner and mimetype.
   */
  private _initialize(): void {
    let kernel = this.session.kernel;
    if (!kernel) {
      return;
    }
    kernel.ready.then(() => {
      if (this.isDisposed) {
        return;
      }
      this._handleInfo(kernel.info);
    });
  }

  /**
   * Execute the code in the current prompt.
   */
  private _execute(cell: CodeCellWidget): Promise<void> {
    this._history.push(cell.model.value.text);
    cell.model.contentChanged.connect(this.update, this);
    let onSuccess = (value: KernelMessage.IExecuteReplyMsg) => {
      if (this.isDisposed) {
        return;
      }
      if (value && value.content.status === 'ok') {
        let content = value.content as KernelMessage.IExecuteOkReply;
        // Use deprecated payloads for backwards compatibility.
        if (content.payload && content.payload.length) {
          let setNextInput = content.payload.filter(i => {
            return (i as any).source === 'set_next_input';
          })[0];
          if (setNextInput) {
            let text = (setNextInput as any).text;
            // Ignore the `replace` value and always set the next cell.
            cell.model.value.text = text;
          }
        }
      }
      cell.model.contentChanged.disconnect(this.update, this);
      this.update();
      this._executed.emit(new Date());
    };
    let onFailure = () => {
      if (this.isDisposed) {
        return;
      }
      cell.model.contentChanged.disconnect(this.update, this);
      this.update();
    };
    return cell.execute(this.session.kernel).then(onSuccess, onFailure);
  }

  /**
   * Update the console based on the kernel info.
   */
  private _handleInfo(info: KernelMessage.IInfoReply): void {
    let layout = this._content.layout as PanelLayout;
    let banner = layout.widgets[0] as RawCellWidget;
    banner.model.value.text = info.banner;
    let lang = info.language_info as nbformat.ILanguageInfoMetadata;
    this._mimetype = this._mimeTypeService.getMimeTypeByLanguage(lang);
    if (this.prompt) {
      this.prompt.model.mimeType = this._mimetype;
    }
  }

  /**
   * Create a new foreign cell.
   */
  private _createForeignCell(): CodeCellWidget {
    let factory = this.contentFactory;
    let options = this._createCodeCellOptions();
    let cell = factory.createForeignCell(options, this);
    cell.readOnly = true;
    cell.model.mimeType = this._mimetype;
    cell.addClass(FOREIGN_CELL_CLASS);
    return cell;
  }

  /**
   * Create the options used to initialize a code cell widget.
   */
  private _createCodeCellOptions(): CodeCellWidget.IOptions {
    let factory = this.contentFactory;
    let contentFactory = factory.codeCellContentFactory;
    let modelFactory = this.modelFactory;
    let model = modelFactory.createCodeCell({ });
    let rendermime = this.rendermime;
    return { model, rendermime, contentFactory };
  }

  /**
   * Handle cell disposed signals.
   */
  private _onCellDisposed(sender: Widget, args: void): void {
    if (!this.isDisposed) {
      this._cells.remove(sender as CodeCellWidget);
    }
  }

  /**
   * Test whether we should execute the prompt.
   */
  private _shouldExecute(timeout: number): Promise<boolean> {
    let prompt = this.prompt;
    let model = prompt.model;
    let code = model.value.text + '\n';
    return new Promise<boolean>((resolve, reject) => {
      let timer = setTimeout(() => { resolve(true); }, timeout);
      this.session.kernel.requestIsComplete({ code }).then(isComplete => {
        clearTimeout(timer);
        if (this.isDisposed) {
          resolve(false);
        }
        if (isComplete.content.status !== 'incomplete') {
          resolve(true);
          return;
        }
        model.value.text = code + isComplete.content.indent;
        let editor = prompt.editor;
        let pos = editor.getPositionAt(model.value.text.length);
        editor.setCursorPosition(pos);
        resolve(false);
      }).catch(() => { resolve(true); });
    });
  }

  /**
   * Handle a keydown event on an editor.
   */
  private _onEditorKeydown(editor: CodeEditor.IEditor, event: KeyboardEvent) {
    // Suppress "Enter" events.
    return event.keyCode === 13;
  }

  /**
   * Handle a change to the kernel.
   */
  private _onKernelChanged(sender: Session.ISession, kernel: Kernel.IKernel): void {
    this.clear();
    this._initialize();
    this._history.kernel = kernel;
    this._foreignHandler.kernel = kernel;
    this.newPrompt();
  }

  private _mimeTypeService: IEditorMimeTypeService;
  private _cells: IObservableVector<BaseCellWidget> = null;
  private _content: Panel = null;
  private _foreignHandler: ForeignHandler =  null;
  private _history: IConsoleHistory = null;
  private _input: Panel = null;
  private _mimetype = 'text/x-ipython';
  private _executed = new Signal<this, Date>(this);
  private _promptCreated = new Signal<this, CodeCellWidget>(this);
}


/**
 * A namespace for CodeConsole statics.
 */
export
namespace CodeConsole {
  /**
   * The initialization options for a console widget.
   */
  export
  interface IOptions {
    /**
     * The content factory for the console widget.
     */
    contentFactory: IContentFactory;

    /**
     * The model factory for the console widget.
     */
    modelFactory?: IModelFactory;

    /**
     * The mime renderer for the console widget.
     */
    rendermime: IRenderMime;

    /**
     * The session for the console widget.
     */
    session: Session.ISession;

    /**
     * The service used to look up mime types.
     */
    mimeTypeService: IEditorMimeTypeService;
  }

  /**
   * A content factory for console children.
   */
  export
  interface IContentFactory {
    /**
     * The editor factory.
     */
    readonly editorFactory: CodeEditor.Factory;

    /**
     * The factory for code cell widget content.
     */
    readonly codeCellContentFactory: CodeCellWidget.IContentFactory;

    /**
     * The factory for raw cell widget content.
     */
    readonly rawCellContentFactory: BaseCellWidget.IContentFactory;

    /**
     * The history manager for a console widget.
     */
    createConsoleHistory(options: ConsoleHistory.IOptions): IConsoleHistory;

    /**
     * The foreign handler for a console widget.
     */
    createForeignHandler(options: ForeignHandler.IOptions): ForeignHandler;

    /**
     * Create a new banner widget.
     */
    createBanner(options: RawCellWidget.IOptions, parent: CodeConsole): RawCellWidget;

    /**
     * Create a new prompt widget.
     */
    createPrompt(options: CodeCellWidget.IOptions, parent: CodeConsole): CodeCellWidget;

    /**
     * Create a code cell whose input originated from a foreign session.
     */
    createForeignCell(options: CodeCellWidget.IOptions, parent: CodeConsole): CodeCellWidget;
  }

  /**
   * Default implementation of `IContentFactory`.
   */
  export
  class ContentFactory implements IContentFactory {
    /**
     * Create a new content factory.
     */
    constructor(options: IContentFactoryOptions) {
      let editorFactory = options.editorFactory;
      let outputAreaContentFactory = (options.outputAreaContentFactory ||
        OutputAreaWidget.defaultContentFactory
      );
      this.codeCellContentFactory = (options.codeCellContentFactory ||
        new CodeCellWidget.ContentFactory({
          editorFactory,
          outputAreaContentFactory
        })
      );
      this.rawCellContentFactory = (options.rawCellContentFactory ||
        new RawCellWidget.ContentFactory({ editorFactory })
      );
    }

    /**
     * The editor factory.
     */
    readonly editorFactory: CodeEditor.Factory;

    /**
     * The factory for code cell widget content.
     */
    readonly codeCellContentFactory: CodeCellWidget.IContentFactory;

    /**
     * The factory for raw cell widget content.
     */
    readonly rawCellContentFactory: BaseCellWidget.IContentFactory;

    /**
     * The history manager for a console widget.
     */
    createConsoleHistory(options: ConsoleHistory.IOptions): IConsoleHistory {
      return new ConsoleHistory(options);
    }

    /**
     * The foreign handler for a console widget.
     */
    createForeignHandler(options: ForeignHandler.IOptions):
    ForeignHandler {
      return new ForeignHandler(options);
    }
    /**
     * Create a new banner widget.
     */
    createBanner(options: RawCellWidget.IOptions, parent: CodeConsole): RawCellWidget {
      return new RawCellWidget(options);
    }

    /**
     * Create a new prompt widget.
     */
    createPrompt(options: CodeCellWidget.IOptions, parent: CodeConsole): CodeCellWidget {
      return new CodeCellWidget(options);
    }

    /**
     * Create a new code cell widget for an input from a foreign session.
     */
    createForeignCell(options: CodeCellWidget.IOptions, parent: CodeConsole): CodeCellWidget {
      return new CodeCellWidget(options);
    }
  }
  /**
   * An initialize options for `ContentFactory`.
   */
  export
  interface IContentFactoryOptions {
    /**
     * The editor factory.
     */
    editorFactory: CodeEditor.Factory;

    /**
     * The factory for output area content.
     */
    outputAreaContentFactory?: OutputAreaWidget.IContentFactory;

    /**
     * The factory for code cell widget content.  If given, this will
     * take precedence over the `outputAreaContentFactory`.
     */
    codeCellContentFactory?: CodeCellWidget.IContentFactory;

    /**
     * The factory for raw cell widget content.
     */
    rawCellContentFactory?: BaseCellWidget.IContentFactory;
  }

  /**
   * A model factory for a console widget.
   */
  export
  interface IModelFactory {
   /**
    * The factory for code cell content.
    */
    readonly codeCellContentFactory: CodeCellModel.IContentFactory;

    /**
     * Create a new code cell.
     *
     * @param options - The options used to create the cell.
     *
     * @returns A new code cell. If a source cell is provided, the
     *   new cell will be intialized with the data from the source.
     */
    createCodeCell(options: CodeCellModel.IOptions): ICodeCellModel;

    /**
     * Create a new raw cell.
     *
     * @param options - The options used to create the cell.
     *
     * @returns A new raw cell. If a source cell is provided, the
     *   new cell will be intialized with the data from the source.
     */
    createRawCell(options: CellModel.IOptions): IRawCellModel;
  }

  /**
   * The default implementation of an `IModelFactory`.
   */
  export
  class ModelFactory {
    /**
     * Create a new cell model factory.
     */
    constructor(options: IModelFactoryOptions) {
      this.codeCellContentFactory = (options.codeCellContentFactory ||
        CodeCellModel.defaultContentFactory
      );
    }

    /**
     * The factory for output area models.
     */
    readonly codeCellContentFactory: CodeCellModel.IContentFactory;

    /**
     * Create a new code cell.
     *
     * @param source - The data to use for the original source data.
     *
     * @returns A new code cell. If a source cell is provided, the
     *   new cell will be intialized with the data from the source.
     *   If the contentFactory is not provided, the instance
     *   `codeCellContentFactory` will be used.
     */
    createCodeCell(options: CodeCellModel.IOptions): ICodeCellModel {
      if (!options.contentFactory) {
        options.contentFactory = this.codeCellContentFactory;
      }
      return new CodeCellModel(options);
    }

    /**
     * Create a new raw cell.
     *
     * @param source - The data to use for the original source data.
     *
     * @returns A new raw cell. If a source cell is provided, the
     *   new cell will be intialized with the data from the source.
     */
    createRawCell(options: CellModel.IOptions): IRawCellModel {
     return new RawCellModel(options);
    }
  }

  /**
   * The options used to initialize a `ModelFactory`.
   */
  export
  interface IModelFactoryOptions {
    /**
     * The factory for output area models.
     */
    codeCellContentFactory?: CodeCellModel.IContentFactory;
  }

  /**
   * The default `ModelFactory` instance.
   */
  export
  const defaultModelFactory = new ModelFactory({});
}


/**
 * A namespace for console widget private data.
 */
namespace Private {
  /**
   * Jump to the bottom of a node.
   *
   * @param node - The scrollable element.
   */
  export
  function scrollToBottom(node: HTMLElement): void {
    node.scrollTop = node.scrollHeight - node.clientHeight;
  }
}
