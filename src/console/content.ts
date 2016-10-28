// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  KernelMessage, Session, nbformat
} from '@jupyterlab/services';

import {
  map, toArray
} from 'phosphor/lib/algorithm/iteration';

import {
  Message
} from 'phosphor/lib/core/messaging';

import {
  clearSignalData, defineSignal, ISignal
} from 'phosphor/lib/core/signaling';

import {
  Token
} from 'phosphor/lib/core/token';

import {
  Panel, PanelLayout
} from 'phosphor/lib/ui/panel';

import {
  Widget
} from 'phosphor/lib/ui/widget';

import {
  CellCompleterHandler, CompleterModel, CompleterWidget
} from '../completer';

import {
  InspectionHandler
} from '../inspector';

import {
  BaseCellWidget, CodeCellWidget, RawCellWidget
} from '../notebook/cells';

import {
  EdgeLocation, ICellEditorWidget, ITextChange
} from '../notebook/cells/editor';

import {
  IRenderMime
} from '../rendermime';

import {
  ForeignHandler
} from './foreign';

import {
  ConsoleHistory, IConsoleHistory
} from './history';

import {
  IObservableVector, ObservableVector
} from '../common/observablevector';

/**
 * The class name added to console widgets.
 */
const CONSOLE_CLASS = 'jp-ConsoleContent';

/**
 * The class name added to the console banner.
 */
const BANNER_CLASS = 'jp-ConsoleContent-banner';

/**
 * The class name of a cell whose input originated from a foreign session.
 */
const FOREIGN_CELL_CLASS = 'jp-ConsoleContent-foreignCell';

/**
 * The class name of the active prompt
 */
const PROMPT_CLASS = 'jp-ConsoleContent-prompt';

/**
 * The class name of the panel that holds cell content.
 */
const CONTENT_CLASS = 'jp-ConsoleContent-content';

/**
 * The class name of the panel that holds prompts.
 */
const INPUT_CLASS = 'jp-ConsoleContent-input';

/**
 * The timeout in ms for execution requests to the kernel.
 */
const EXECUTION_TIMEOUT = 250;


/**
 * A widget containing a Jupyter console's content.
 *
 * #### Notes
 * The ConsoleContent class is intended to be used within a ConsolePanel
 * instance. Under most circumstances, it is not instantiated by user code.
 */
export
class ConsoleContent extends Widget {
  /**
   * Construct a console content widget.
   */
  constructor(options: ConsoleContent.IOptions) {
    super();
    this.addClass(CONSOLE_CLASS);

    // Create the panels that hold the content and input.
    let layout = this.layout = new PanelLayout();
    this._cells = new ObservableVector<BaseCellWidget>();
    this._content = new Panel();
    this._input = new Panel();
    this._renderer = options.renderer;
    this._rendermime = options.rendermime;
    this._session = options.session;
    this._history = options.history || new ConsoleHistory({
      kernel: this._session.kernel
    });

    // Add top-level CSS classes.
    this._content.addClass(CONTENT_CLASS);
    this._input.addClass(INPUT_CLASS);

    // Insert the content and input panes into the widget.
    layout.addWidget(this._content);
    layout.addWidget(this._input);

    // Create the banner.
    let banner = this._renderer.createBanner();
    banner.addClass(BANNER_CLASS);
    banner.readOnly = true;
    banner.model.source = '...';
    this._content.addWidget(banner);

    // Set the banner text and the mimetype.
    this._initialize();

    // Set up the inspection handler.
    this._inspectionHandler = new InspectionHandler({
      kernel: this._session.kernel,
      rendermime: this._rendermime
    });

    // Set up the foreign iopub handler.
    this._foreignHandler = new ForeignHandler({
      kernel: this._session.kernel,
      parent: this,
      renderer: { createCell: () => this._newForeignCell() }
    });

    // Instantiate the completer.
    this._newCompleter(options.completer);
  }

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
   * The console content panel that holds the banner and executed cells.
   */
  get content(): Panel {
    return this._content;
  }

  /**
   * A signal emitted when the console executes its prompt.
   */
  readonly executed: ISignal<this, Date>;

  /**
   * Get the inspection handler used by the console.
   */
  get inspectionHandler(): InspectionHandler {
    return this._inspectionHandler;
  }

  /*
   * The console input prompt.
   */
  get prompt(): CodeCellWidget | null {
    let inputLayout = (this._input.layout as PanelLayout);
    return inputLayout.widgets.at(0) as CodeCellWidget || null;
  }

  /**
   * Get the session used by the console.
   */
  get session(): Session.ISession {
    return this._session;
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
      cells.at(1).dispose();
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
    super.dispose();
    this._completerHandler.dispose();
    this._completerHandler = null;
    this._completer.dispose();
    this._completer = null;
    this._foreignHandler.dispose();
    this._foreignHandler = null;
    this._history.dispose();
    this._history = null;
    this._inspectionHandler.dispose();
    this._inspectionHandler = null;
    this._session = null;
    this._cells.clear();
    this._cells = null;
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
    this._completer.reset();

    if (this._session.status === 'dead') {
      return Promise.resolve(void 0);
    }

    let prompt = this.prompt;
    prompt.trusted = true;

    if (force) {
      // Create a new prompt before kernel execution to allow typeahead.
      this.newPrompt();
      return this._execute(prompt);
    }

    // Check whether we should execute.
    return this._shouldExecute(timeout).then(should => {
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
    // Create a new cell using the prompt renderer.
    let cell = this._renderer.createPrompt(this._rendermime, this);
    cell.model.source = code;
    cell.mimetype = this._mimetype;
    cell.readOnly = true;
    this.addCell(cell);
    return this._execute(cell);
  }

  /**
   * Insert a line break in the prompt.
   */
  insertLinebreak(): void {
    let prompt = this.prompt;
    let model = prompt.model;
    model.source += '\n';
    prompt.editor.setCursorPosition(model.source.length);
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
   * Make a new prompt.
   */
  protected newPrompt(): void {
    let prompt = this.prompt;
    let input = this._input;

    // Make the last prompt read-only, clear its signals, and move to content.
    if (prompt) {
      prompt.readOnly = true;
      prompt.removeClass(PROMPT_CLASS);
      clearSignalData(prompt.editor);
      (input.layout as PanelLayout).removeWidgetAt(0);
      this.addCell(prompt);
    }

    // Create the new prompt.
    prompt = this._renderer.createPrompt(this._rendermime, this);
    prompt.mimetype = this._mimetype;
    prompt.addClass(PROMPT_CLASS);
    this._input.addWidget(prompt);

    // Hook up history handling.
    let editor = prompt.editor;
    editor.edgeRequested.connect(this.onEdgeRequest, this);
    editor.textChanged.connect(this.onTextChange, this);

    // Associate the new prompt with the completer and inspection handlers.
    this._completerHandler.activeCell = prompt;
    this._inspectionHandler.activeCell = prompt;

    prompt.activate();
    this.update();
  }

  /**
   * Handle `'activate-request'` messages.
   */
  protected onActivateRequest(msg: Message): void {
    this.prompt.activate();
    this.update();
  }

  /**
   * Handle `'after-attach'` messages.
   */
  protected onAfterAttach(msg: Message): void {
    // Create a prompt if necessary.
    if (!this.prompt) {
      this.newPrompt();
    }
    // Listen for kernel change events.
    this._addSessionListeners();
  }

  /**
   * Handle an edge requested signal.
   */
  protected onEdgeRequest(editor: ICellEditorWidget, location: EdgeLocation): Promise<void> {
    let prompt = this.prompt;
    if (location === 'top') {
      return this._history.back(prompt.model.source).then(value => {
        if (!value) {
          return;
        }
        if (prompt.model.source === value) {
          return;
        }
        this._setByHistory = true;
        prompt.model.source = value;
        prompt.editor.setCursorPosition(0);
      });
    }
    return this._history.forward(prompt.model.source).then(value => {
      let text = value || this._history.placeholder;
      if (prompt.model.source === text) {
        return;
      }
      this._setByHistory = true;
      prompt.model.source = text;
      prompt.editor.setCursorPosition(text.length);
    });
  }

  /**
   * Handle a text change signal from the editor.
   */
  protected onTextChange(editor: ICellEditorWidget, args: ITextChange): void {
    if (this._setByHistory) {
      this._setByHistory = false;
      return;
    }
    this._history.reset();
  }

  /**
   * Handle `update-request` messages.
   */
  protected onUpdateRequest(msg: Message): void {
    super.onUpdateRequest(msg);
    Private.scrollToBottom(this._content.node);
  }

  /**
   * Handle kernel change events on the session.
   */
  private _addSessionListeners(): void {
    if (this._listening) {
      return;
    }
    this._listening = this._session.kernelChanged.connect((sender, kernel) => {
      this.clear();
      this.newPrompt();
      this._initialize();
      this._history.kernel = kernel;
      this._completerHandler.kernel = kernel;
      this._foreignHandler.kernel = kernel;
      this._inspectionHandler.kernel = kernel;
    });
  }

  /**
   * Initialize the banner and mimetype.
   */
  private _initialize(): void {
    let session = this._session;
    if (session.kernel.info) {
      this._handleInfo(this._session.kernel.info);
      return;
    }
    session.kernel.kernelInfo().then(msg => this._handleInfo(msg.content));
  }

  /**
   * Execute the code in the current prompt.
   */
  private _execute(cell: CodeCellWidget): Promise<void> {
    this._history.push(cell.model.source);
    cell.model.contentChanged.connect(this.update, this);
    let onSuccess = (value: KernelMessage.IExecuteReplyMsg) => {
      this.executed.emit(new Date());
      if (!value) {
        return;
      }
      if (value.content.status === 'ok') {
        let content = value.content as KernelMessage.IExecuteOkReply;
        // Use deprecated payloads for backwards compatibility.
        if (content.payload && content.payload.length) {
          let setNextInput = content.payload.filter(i => {
            return (i as any).source === 'set_next_input';
          })[0];
          if (setNextInput) {
            let text = (setNextInput as any).text;
            // Ignore the `replace` value and always set the next cell.
            cell.model.source = text;
          }
        }
      }
      cell.model.contentChanged.disconnect(this.update, this);
      this.update();
    };
    let onFailure = () => {
      cell.model.contentChanged.disconnect(this.update, this);
      this.update();
    };
    return cell.execute(this._session.kernel).then(onSuccess, onFailure);
  }

  /**
   * Update the console based on the kernel info.
   */
  private _handleInfo(info: KernelMessage.IInfoReply): void {
    let layout = this._content.layout as PanelLayout;
    let banner = layout.widgets.at(0) as RawCellWidget;
    banner.model.source = info.banner;
    let lang = info.language_info as nbformat.ILanguageInfoMetadata;
    this._mimetype = this._renderer.getCodeMimetype(lang);
    if (this.prompt) {
      this.prompt.mimetype = this._mimetype;
    }
  }

  /**
   * Create a new completer widget if necessary and initialize it.
   */
  private _newCompleter(completer: CompleterWidget): void {
    // Instantiate completer widget.
    this._completer = completer || new CompleterWidget({
      model: new CompleterModel()
    });

    // Set the completer widget's anchor node to peg its position.
    this._completer.anchor = this.node;

    // Because a completer widget may be passed in, check if it is attached.
    if (!this._completer.isAttached) {
      Widget.attach(this._completer, document.body);
    }

    // Set up the completer handler.
    this._completerHandler = new CellCompleterHandler({
      completer: this._completer,
      kernel: this._session.kernel
    });
  }

  /**
   * Create a new foreign cell.
   */
  private _newForeignCell(): CodeCellWidget {
    let cell = this._renderer.createForeignCell(this._rendermime, this);
    cell.readOnly = true;
    cell.mimetype = this._mimetype;
    cell.addClass(FOREIGN_CELL_CLASS);
    return cell;
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
    let code = prompt.model.source + '\n';
    return new Promise<boolean>((resolve, reject) => {
      let timer = setTimeout(() => { resolve(true); }, timeout);
      this._session.kernel.isComplete({ code }).then(isComplete => {
        clearTimeout(timer);
        if (isComplete.content.status !== 'incomplete') {
          resolve(true);
          return;
        }
        prompt.model.source = code + isComplete.content.indent;
        prompt.editor.setCursorPosition(prompt.model.source.length);
        resolve(false);
      }).catch(() => { resolve(true); });
    });
  }

  private _cells: IObservableVector<BaseCellWidget> = null;
  private _completer: CompleterWidget = null;
  private _completerHandler: CellCompleterHandler = null;
  private _content: Panel = null;
  private _foreignHandler: ForeignHandler =  null;
  private _history: IConsoleHistory = null;
  private _input: Panel = null;
  private _inspectionHandler: InspectionHandler = null;
  private _listening = false;
  private _mimetype = 'text/x-ipython';
  private _renderer: ConsoleContent.IRenderer = null;
  private _rendermime: IRenderMime = null;
  private _session: Session.ISession = null;
  private _setByHistory = false;
}


// Define the signals for the `ConsoleContent` class.
defineSignal(ConsoleContent.prototype, 'executed');


/**
 * A namespace for ConsoleContent statics.
 */
export
namespace ConsoleContent {
  /**
   * The initialization options for a console content widget.
   */
  export
  interface IOptions {
    /**
     * The completer widget for a console content widget.
     */
    completer?: CompleterWidget;

    /**
     * The history manager for a console content widget.
     */
    history?: IConsoleHistory;

    /**
     * The renderer for a console content widget.
     */
    renderer: IRenderer;

    /**
     * The mime renderer for the console content widget.
     */
    rendermime: IRenderMime;

    /**
     * The session for the console content widget.
     */
    session: Session.ISession;
  }

  /**
   * A renderer for completer widget nodes.
   */
  export
  interface IRenderer {
    /**
     * Create a new banner widget.
     */
    createBanner(): RawCellWidget;

    /**
     * Create a new prompt widget.
     */
    createPrompt(rendermime: IRenderMime, context: ConsoleContent): CodeCellWidget;

    /**
     * Create a code cell whose input originated from a foreign session.
     */
    createForeignCell(rendermine: IRenderMime, context: ConsoleContent): CodeCellWidget;

    /**
     * Get the preferred mimetype given language info.
     */
    getCodeMimetype(info: nbformat.ILanguageInfoMetadata): string;
  }

  /* tslint:disable */
  /**
   * The console renderer token.
   */
  export
  const IRenderer = new Token<IRenderer>('jupyter.services.console.renderer');
  /* tslint:enable */
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
