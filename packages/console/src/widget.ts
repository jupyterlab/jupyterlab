// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  IClientSession
} from '@jupyterlab/apputils';

import {
  Cell, CellModel, CodeCell, CodeCellModel, ICodeCellModel, IRawCellModel,
  RawCell, RawCellModel
} from '@jupyterlab/cells';

import {
  IEditorMimeTypeService, CodeEditor
} from '@jupyterlab/codeeditor';

import {
  nbformat
} from '@jupyterlab/coreutils';

import {
  IObservableList, ObservableList
} from '@jupyterlab/observables';

import {
  RenderMimeRegistry
} from '@jupyterlab/rendermime';

import {
  KernelMessage
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
  Panel, PanelLayout, Widget
} from '@phosphor/widgets';

import {
  ForeignHandler
} from './foreign';

import {
  ConsoleHistory, IConsoleHistory
} from './history';


/**
 * The data attribute added to a widget that has an active kernel.
 */
const KERNEL_USER = 'jpKernelUser';

/**
 * The data attribute added to a widget can run code.
 */
const CODE_RUNNER = 'jpCodeRunner';

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
 * The class name of the active prompt cell.
 */
const PROMPT_CLASS = 'jp-CodeConsole-promptCell';

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
    this.node.dataset[KERNEL_USER] = 'true';
    this.node.dataset[CODE_RUNNER] = 'true';
    this.node.tabIndex = -1;  // Allow the widget to take focus.

    // Create the panels that hold the content and input.
    let layout = this.layout = new PanelLayout();
    this._cells = new ObservableList<Cell>();
    this._content = new Panel();
    this._input = new Panel();

    this.contentFactory = (
      options.contentFactory || CodeConsole.defaultContentFactory
    );
    this.modelFactory = (
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

    // Set up the foreign iopub handler.
    this._foreignHandler = new ForeignHandler({
      session: this.session,
      parent: this,
      cellFactory: () => this._createCodeCell()
    });

    this._history = new ConsoleHistory({
      session: this.session
    });

    this._onKernelChanged();
    this.session.kernelChanged.connect(this._onKernelChanged, this);
    this.addBanner();
    this.session.statusChanged.connect(this._onKernelStatusChanged, this);
  }

  /**
   * A signal emitted when the console finished executing its prompt cell.
   */
  get executed(): ISignal<this, Date> {
    return this._executed;
  }

  /**
   * A signal emitted when a new prompt cell is created.
   */
  get promptCellCreated(): ISignal<this, CodeCell> {
    return this._promptCellCreated;
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
  readonly rendermime: RenderMimeRegistry;

  /**
   * The client session used by the console.
   */
  readonly session: IClientSession;

  /**
   * The list of content cells in the console.
   *
   * #### Notes
   * This list does not include the banner or the prompt for a console.
   */
  get cells(): IObservableList<Cell> {
    return this._cells;
  }

  /*
   * The console input prompt cell.
   */
  get promptCell(): CodeCell | null {
    let inputLayout = (this._input.layout as PanelLayout);
    return inputLayout.widgets[0] as CodeCell || null;
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
  addCell(cell: Cell) {
    this._content.addWidget(cell);
    this._cells.push(cell);
    cell.disposed.connect(this._onCellDisposed, this);
    this.update();
  }

  addBanner() {
    if (this._banner) {
      // An old banner just becomes a normal cell now.
      let cell = this._banner;
      this._cells.push(this._banner);
      cell.disposed.connect(this._onCellDisposed, this);
    }
    // Create the banner.
    let model = this.modelFactory.createRawCell({});
    model.value.text = '...';
    let banner = this._banner = new RawCell({
      model,
      contentFactory: this.contentFactory
    });
    banner.addClass(BANNER_CLASS);
    banner.readOnly = true;
    this._content.addWidget(banner);
  }

  /**
   * Clear the code cells.
   */
  clear(): void {
    // Dispose all the content cells
    let cells = this._cells;
    while (cells.length > 0) {
      cells.get(0).dispose();
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
    this._cells.clear();
    this._history.dispose();
    this._foreignHandler.dispose();

    super.dispose();
  }

  /**
   * Set whether the foreignHandler is able to inject foreign cells into a
   * console.
   */
  get showAllActivity(): boolean {
    return this._foreignHandler.enabled;
  }
  set showAllActivity(value: boolean) {
    this._foreignHandler.enabled = value;
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

    const promptCell = this.promptCell;
    if (!promptCell) {
      return Promise.reject('Cannot execute without a prompt cell');
    }
    promptCell.model.trusted = true;

    if (force) {
      // Create a new prompt cell before kernel execution to allow typeahead.
      this.newPromptCell();
      return this._execute(promptCell);
    }

    // Check whether we should execute.
    return this._shouldExecute(timeout).then(should => {
      if (this.isDisposed) {
        return;
      }
      if (should) {
        // Create a new prompt cell before kernel execution to allow typeahead.
        this.newPromptCell();
        return this._execute(promptCell);
      } else {
        // add a newline if we shouldn't execute
        promptCell.editor.newIndentedLine();
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
    let cell = this._createCodeCell();
    cell.model.value.text = code;
    this.addCell(cell);
    return this._execute(cell);
  }

  /**
   * Insert a line break in the prompt cell.
   */
  insertLinebreak(): void {
    let promptCell = this.promptCell;
    if (!promptCell) {
      return;
    }
    promptCell.editor.newIndentedLine();
  }

  /**
   * Serialize the output.
   */
  serialize(): nbformat.ICodeCell[] {
    let promptCell = this.promptCell;
    let layout = this._content.layout as PanelLayout;
    // Serialize content.
    let output = map(layout.widgets, widget => {
      return (widget as CodeCell).model.toJSON() as nbformat.ICodeCell;
    });
    if (!promptCell) {
      return toArray(output);
    }
    // Serialize prompt cell and return.
    return toArray(output).concat(promptCell.model.toJSON() as nbformat.ICodeCell);
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
    case 'click':
      this._evtClick(event as MouseEvent);
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
    node.addEventListener('click', this);
    // Create a prompt if necessary.
    if (!this.promptCell) {
      this.newPromptCell();
    } else {
      this.promptCell.editor.focus();
      this.update();
    }
  }

  /**
   * Handle `before-detach` messages for the widget.
   */
  protected onBeforeDetach(msg: Message): void {
    let node = this.node;
    node.removeEventListener('keydown', this, true);
    node.removeEventListener('click', this);
  }

  /**
   * Handle `'activate-request'` messages.
   */
  protected onActivateRequest(msg: Message): void {
    let editor = this.promptCell && this.promptCell.editor;
    if (editor) {
      editor.focus();
    }
    this.update();
  }

  /**
   * Make a new prompt cell.
   */
  protected newPromptCell(): void {
    let promptCell = this.promptCell;
    let input = this._input;

    // Make the last prompt read-only, clear its signals, and move to content.
    if (promptCell) {
      promptCell.readOnly = true;
      promptCell.removeClass(PROMPT_CLASS);
      Signal.clearData(promptCell.editor);
      let child = input.widgets[0];
      child.parent = null;
      this.addCell(promptCell);
    }

    // Create the new prompt cell.
    let factory = this.contentFactory;
    let options = this._createCodeCellOptions();
    promptCell = factory.createCodeCell(options);
    promptCell.model.mimeType = this._mimetype;
    promptCell.addClass(PROMPT_CLASS);
    this._input.addWidget(promptCell);

    // Suppress the default "Enter" key handling.
    let editor = promptCell.editor;
    editor.addKeydownHandler(this._onEditorKeydown);

    this._history.editor = editor;
    if (this.isAttached) {
      this.activate();
    }
    this._promptCellCreated.emit(promptCell);
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
    let editor = this.promptCell && this.promptCell.editor;
    if (!editor) {
      return;
    }
    if (event.keyCode === 13 && !editor.hasFocus()) {
      event.preventDefault();
      editor.focus();
    }
  }

  /**
   * Handle the `'click'` event for the widget.
   */
  private _evtClick(event: MouseEvent): void {
    if (this.promptCell && this.promptCell.node.contains(event.target as HTMLElement)) {
      this.promptCell.editor.focus();
    }
  }

  /**
   * Execute the code in the current prompt cell.
   */
  private _execute(cell: CodeCell): Promise<void> {
    let source = cell.model.value.text;
    this._history.push(source);
    // If the source of the console is just "clear", clear the console as we
    // do in IPython or QtConsole.
    if ( source === 'clear' || source === '%clear' ) {
      this.clear();
      return Promise.resolve(void 0);
    }
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
    return CodeCell.execute(cell, this.session).then(onSuccess, onFailure);
  }

  /**
   * Update the console based on the kernel info.
   */
  private _handleInfo(info: KernelMessage.IInfoReply): void {
    this._banner.model.value.text = info.banner;
    let lang = info.language_info as nbformat.ILanguageInfoMetadata;
    this._mimetype = this._mimeTypeService.getMimeTypeByLanguage(lang);
    if (this.promptCell) {
      this.promptCell.model.mimeType = this._mimetype;
    }
  }

  /**
   * Create a new foreign cell.
   */
  private _createCodeCell(): CodeCell {
    let factory = this.contentFactory;
    let options = this._createCodeCellOptions();
    let cell = factory.createCodeCell(options);
    cell.readOnly = true;
    cell.model.mimeType = this._mimetype;
    cell.addClass(FOREIGN_CELL_CLASS);
    return cell;
  }

  /**
   * Create the options used to initialize a code cell widget.
   */
  private _createCodeCellOptions(): CodeCell.IOptions {
    let contentFactory = this.contentFactory;
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
      this._cells.removeValue(sender as CodeCell);
    }
  }

  /**
   * Test whether we should execute the prompt cell.
   */
  private _shouldExecute(timeout: number): Promise<boolean> {
    const promptCell = this.promptCell;
    if (!promptCell) {
      return Promise.resolve(false);
    }
    let model = promptCell.model;
    let code = model.value.text;
    return new Promise<boolean>((resolve, reject) => {
      let timer = setTimeout(() => { resolve(true); }, timeout);
      let kernel = this.session.kernel;
      if (!kernel) {
        resolve(false);
        return;
      }
      kernel.requestIsComplete({ code }).then(isComplete => {
        clearTimeout(timer);
        if (this.isDisposed) {
          resolve(false);
        }
        if (isComplete.content.status !== 'incomplete') {
          resolve(true);
          return;
        }
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
  private _onKernelChanged(): void {
    this.clear();
    if (this._banner) {
      this._banner.dispose();
      this._banner = null;
    }
    this.addBanner();
  }

  /**
   * Handle a change to the kernel status.
   */
  private _onKernelStatusChanged(): void {
    if (this.session.status === 'connected') {
      // we just had a kernel restart or reconnect - reset banner
      let kernel = this.session.kernel;
      if (!kernel) {
        return;
      }
      kernel.requestKernelInfo().then(() => {
        if (this.isDisposed || !kernel || !kernel.info) {
          return;
        }
        this._handleInfo(this.session.kernel.info);
      }).catch(err => {
        console.error('could not get kernel info');
      });
    } else if (this.session.status === 'restarting') {
      this.addBanner();
    }
  }

  private _banner: RawCell = null;
  private _cells: IObservableList<Cell>;
  private _content: Panel;
  private _executed = new Signal<this, Date>(this);
  private _foreignHandler: ForeignHandler;
  private _history: IConsoleHistory ;
  private _input: Panel;
  private _mimetype = 'text/x-ipython';
  private _mimeTypeService: IEditorMimeTypeService;
  private _promptCellCreated = new Signal<this, CodeCell>(this);
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
    rendermime: RenderMimeRegistry;

    /**
     * The client session for the console widget.
     */
    session: IClientSession;

    /**
     * The service used to look up mime types.
     */
    mimeTypeService: IEditorMimeTypeService;
  }

  /**
   * A content factory for console children.
   */
  export
  interface IContentFactory extends Cell.IContentFactory {
    /**
     * Create a new code cell widget.
     */
    createCodeCell(options: CodeCell.IOptions): CodeCell;

    /**
     * Create a new raw cell widget.
     */
    createRawCell(options: RawCell.IOptions): RawCell;
  }

  /**
   * Default implementation of `IContentFactory`.
   */
  export
  class ContentFactory extends Cell.ContentFactory implements IContentFactory {

    /**
     * Create a new code cell widget.
     *
     * #### Notes
     * If no cell content factory is passed in with the options, the one on the
     * notebook content factory is used.
     */
    createCodeCell(options: CodeCell.IOptions): CodeCell {
      if (!options.contentFactory) {
        options.contentFactory = this;
      }
      return new CodeCell(options);
    }

    /**
     * Create a new raw cell widget.
     *
     * #### Notes
     * If no cell content factory is passed in with the options, the one on the
     * notebook content factory is used.
     */
    createRawCell(options: RawCell.IOptions): RawCell {
      if (!options.contentFactory) {
        options.contentFactory = this;
      }
      return new RawCell(options);
    }
  }

  /**
   * A namespace for the code console content factory.
   */
  export
  namespace ContentFactory {
    /**
     * An initialize options for `ContentFactory`.
     */
    export
    interface IOptions extends Cell.IContentFactory { }
  }

  /**
   * A default content factory for the code console.
   */
  export
  const defaultContentFactory: IContentFactory = new ContentFactory();

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
    constructor(options: IModelFactoryOptions = {}) {
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
