// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ISession, KernelMessage
} from 'jupyter-js-services';

import {
  clearSignalData, defineSignal, ISignal
} from 'phosphor/lib/core/signaling';

import {
  Token
} from 'phosphor/lib/core/token';

import {
  Message
} from 'phosphor/lib/core/messaging';

import {
  Panel, PanelLayout
} from 'phosphor/lib/ui/panel';

import {
  SplitPanel
} from 'phosphor/lib/ui/splitpanel';

import {
  Widget
} from 'phosphor/lib/ui/widget';

import {
  InspectionHandler
} from '../inspector';

import {
  nbformat
} from '../notebook/notebook/nbformat';

import {
  CodeCellWidget, RawCellWidget
} from '../notebook/cells';

import {
  EdgeLocation, ICellEditorWidget
} from '../notebook/cells/editor';

import {
  mimetypeForLanguage
} from '../notebook/common/mimetype';

import {
  CompletionWidget, CompletionModel, CellCompletionHandler
} from '../notebook/completion';

import {
  IRenderMime
} from '../rendermime';

import {
  ConsoleHistory, IConsoleHistory
} from './history';


/**
 * The class name added to console widgets.
 */
const CONSOLE_CLASS = 'jp-Console';

/**
 * The class name added to the console banner.
 */
const BANNER_CLASS = 'jp-Console-banner';

/**
 * The class name of the active prompt
 */
const PROMPT_CLASS = 'jp-Console-prompt';

/**
 * The class name of the panel that holds cell content.
 */
const CONTENT_CLASS = 'jp-Console-content';

/**
 * The class name of the panel that holds prompts.
 */
const INPUT_CLASS = 'jp-Console-input';


/**
 * A widget containing a Jupyter console's content.
 *
 * #### Notes
 * The ConsoleContent class is intended to be used within a ConsolePanel
 * instance. Under most circumstances, it is not instantiated by user code.
 */
export
class ConsoleContent extends SplitPanel {
  /**
   * Construct a console widget.
   */
  constructor(options: ConsoleContent.IOptions) {
    super();
    this.addClass(CONSOLE_CLASS);

    // Create the panels that holds the content and input.
    this.orientation = 'vertical';
    this._content = new Panel();
    this._input = new Panel();
    this._content.addClass(CONTENT_CLASS);
    this._input.addClass(INPUT_CLASS);

    // Insert the content and input panes into the split panel.
    this.addWidget(this._content);
    this.addWidget(this._input);
    SplitPanel.setStretch(this._content, 1);
    SplitPanel.setStretch(this._input, 0);

    this._renderer = options.renderer;
    this._rendermime = options.rendermime;
    this._session = options.session;
    this._history = new ConsoleHistory({ kernel: this._session.kernel });

    // Instantiate tab completion widget.
    let completion = options.completion || new CompletionWidget({
      model: new CompletionModel()
    });
    this._completion = completion;

    // Set the completion widget's anchor node to peg its position.
    completion.anchor = this.node;

    // Because a completion widget may be passed in, check if it is attached.
    if (!completion.isAttached) {
      Widget.attach(completion, document.body);
    }

    // Set up the completion handler.
    this._completionHandler = new CellCompletionHandler(this._completion);
    this._completionHandler.kernel = this._session.kernel;

    // Set up the inspection handler.
    this._inspectionHandler = new InspectionHandler(this._rendermime);
    this._inspectionHandler.kernel = this._session.kernel;

    // Create the banner.
    let banner = this._renderer.createBanner();
    banner.addClass(BANNER_CLASS);
    banner.readOnly = true;
    banner.model.source = '...';

    // Add the banner to the content pane.
    this._content.addWidget(banner);

    // Set the banner text and the mimetype.
    this.initialize();

    // Create the prompt.
    this.newPrompt();

    // Handle changes to the kernel.
    this._session.kernelChanged.connect((s, kernel) => {
      this.clear();
      this.newPrompt();
      this.initialize();
      this._history.dispose();
      this._history = new ConsoleHistory(kernel);
      this._completionHandler.kernel = kernel;
      this._inspectionHandler.kernel = kernel;
    });
  }

  /**
   * A signal emitted when the console executes its prompt.
   */
  executed: ISignal<ConsoleContent, Date>;


  /**
   * Get the inspection handler used by the console.
   *
   * #### Notes
   * This is a read-only property.
   */
  get inspectionHandler(): InspectionHandler {
    return this._inspectionHandler;
  }

  /*
   * The last cell in a console is always a `CodeCellWidget` prompt.
   */
  get prompt(): CodeCellWidget {
    let inputLayout = (this._input.layout as PanelLayout);
    return inputLayout.widgets.at(0) as CodeCellWidget || null;
  }

  /**
   * Get the session used by the console.
   *
   * #### Notes
   * This is a read-only property.
   */
  get session(): ISession {
    return this._session;
  }

  /**
   * Dispose of the resources held by the widget.
   */
  dispose() {
    // Do nothing if already disposed.
    if (this.isDisposed) {
      return;
    }
    this._history.dispose();
    this._history = null;
    this._completionHandler.dispose();
    this._completionHandler = null;
    this._completion.dispose();
    this._completion = null;
    this._inspectionHandler.dispose();
    this._inspectionHandler = null;
    this._session.dispose();
    this._session = null;
    super.dispose();
  }

  /**
   * Execute the current prompt.
   *
   * @param force - Whether to force execution without checking code
   * completeness.
   */
  execute(force=false): Promise<void> {
    this.dismissCompletion();

    if (this._session.status === 'dead') {
      this._inspectionHandler.handleExecuteReply(null);
      return;
    }

    let prompt = this.prompt;
    prompt.trusted = true;
    if (force) {
      return this._execute();
    }

    // Check whether we should execute.
    return this._shouldExecute().then(value => {
      if (value) {
        return this._execute();
      }
    });
  }

  /**
   * Clear the code cells.
   */
  clear(): void {
    while (this.prompt) {
      this.prompt.dispose();
    }
    this.newPrompt();
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
   * Dismiss the completion widget for a console.
   */
  dismissCompletion(): void {
    this._completion.reset();
  }

  /**
   * Serialize the output.
   */
  serialize(): nbformat.ICodeCell[] {
    let output: nbformat.ICodeCell[] = [];
    let layout = this._content.layout as PanelLayout;
    for (let i = 1; i < layout.widgets.length; i++) {
      let widget = layout.widgets.at(i) as CodeCellWidget;
      output.push(widget.model.toJSON());
    }
    output.push(this.prompt.model.toJSON());
    return output;
  }

  /**
   * Handle `'activate-request'` messages.
   */
  protected onActivateRequest(msg: Message): void {
    this.prompt.activate();
  }

  /**
   * Handle an edge requested signal.
   */
  protected onEdgeRequest(editor: ICellEditorWidget, location: EdgeLocation): void {
    let prompt = this.prompt;
    if (location === 'top') {
      this._history.back().then(value => {
        if (!value) {
          return;
        }
        prompt.model.source = value;
        prompt.editor.setCursorPosition(0);
      });
    } else {
      this._history.forward().then(value => {
        // If at the bottom end of history, then clear the prompt.
        let text = value || '';
        prompt.model.source = text;
        prompt.editor.setCursorPosition(text.length);
      });
    }
  }

  /**
   * Handle `update_request` messages.
   */
  protected onUpdateRequest(msg: Message): void {
    Private.scrollToBottom(this._content.node);
  }

  /**
   * Initialize the banner and mimetype.
   */
  protected initialize(): void {
    if (this._session.kernel.info) {
      this._handleInfo(this._session.kernel.info);
    } else {
      this._session.kernel.kernelInfo().then(msg => {
        this._handleInfo(msg.content);
      });
    }
  }

  /**
   * Make a new prompt.
   */
  protected newPrompt(): void {
    // Make the previous editor read-only and clear its signals.
    let prompt = this.prompt;
    if (prompt) {
      prompt.readOnly = true;
      prompt.removeClass(PROMPT_CLASS);
      clearSignalData(prompt.editor);
      (this._input.layout as PanelLayout).removeWidgetAt(0);
      this._content.addWidget(prompt);
    }

    // Create the new prompt.
    prompt = this._renderer.createPrompt(this._rendermime);
    prompt.mimetype = this._mimetype;
    prompt.addClass(PROMPT_CLASS);
    this._input.addWidget(prompt);

    // Hook up completion and history handling.
    let editor = prompt.editor;
    editor.edgeRequested.connect(this.onEdgeRequest, this);

    // Associate the new prompt with the completion handler.
    this._completionHandler.activeCell = prompt;
    this._inspectionHandler.activeCell = prompt;

    prompt.activate();
    this.update();
  }

  /**
   * Test whether we should execute the prompt.
   */
  private _shouldExecute(): Promise<boolean> {
    let prompt = this.prompt;
    let code = prompt.model.source + '\n';
    return new Promise<boolean>((resolve, reject) => {
      // Allow 250 ms for the response.
      let timer = setTimeout(() => {
        resolve(true);
      }, 250);
      this._session.kernel.isComplete({ code }).then(isComplete => {
        clearTimeout(timer);
        if (isComplete.content.status === 'incomplete') {
          prompt.model.source = code + isComplete.content.indent;
          prompt.editor.setCursorPosition(prompt.model.source.length);
          resolve(false);
        } else {
          resolve(true);
        }
      }).catch(() => {
        resolve(true);
      });
    });
  }

  /**
   * Execute the code in the current prompt.
   */
  private _execute(): Promise<void> {
    let prompt = this.prompt;
    this._history.push(prompt.model.source);
    // Create a new prompt before kernel execution to allow typeahead.
    this.newPrompt();
    return prompt.execute(this._session.kernel).then(
    (value: KernelMessage.IExecuteReplyMsg) => {
      this.executed.emit(new Date());
      if (!value) {
        this._inspectionHandler.handleExecuteReply(null);
        return;
      }
      if (value.content.status === 'ok') {
        let content = value.content as KernelMessage.IExecuteOkReply;
        this._inspectionHandler.handleExecuteReply(content);
        // Use deprecated payloads for backwards compatibility.
        if (content.payload && content.payload.length) {
          let setNextInput = content.payload.filter(i => {
            return (i as any).source === 'set_next_input';
          })[0];
          if (setNextInput) {
            let text = (setNextInput as any).text;
            // Ignore the `replace` value and always set the next prompt.
            this.prompt.model.source = text;
          }
        }
      }
      this.update();
    },
      () => this.update()
    );
  }

  /**
   * Update the console based on the kernel info.
   */
  private _handleInfo(info: KernelMessage.IInfoReply): void {
    let layout = this._content.layout as PanelLayout;
    let banner = layout.widgets.at(0) as RawCellWidget;
    banner.model.source = info.banner;
    this._mimetype = mimetypeForLanguage(info.language_info);
    this.prompt.mimetype = this._mimetype;
  }

  private _completion: CompletionWidget = null;
  private _completionHandler: CellCompletionHandler = null;
  private _content: Panel = null;
  private _input: Panel = null;
  private _inspectionHandler: InspectionHandler = null;
  private _mimetype = 'text/x-ipython';
  private _rendermime: IRenderMime = null;
  private _renderer: ConsoleContent.IRenderer = null;
  private _history: IConsoleHistory = null;
  private _session: ISession = null;
}


// Define the signals for the `ConsoleContent` class.
defineSignal(ConsoleContent.prototype, 'executed');


/**
 * A namespace for ConsoleContent statics.
 */
export
namespace ConsoleContent {
  /**
   * The initialization options for a console widget.
   */
  export
  interface IOptions {
    /**
     * The completion widget for a console widget.
     */
    completion?: CompletionWidget;

    /**
     * The mime renderer for the console widget.
     */
    rendermime: IRenderMime;

    /**
     * The renderer for a console widget.
     */
    renderer: IRenderer;

    /**
     * The session for the console widget.
     */
    session: ISession;
  }

  /**
   * A renderer for completion widget nodes.
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
    createPrompt(rendermime: IRenderMime): CodeCellWidget;
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
    node.scrollTop = node.scrollHeight;
  }
}
