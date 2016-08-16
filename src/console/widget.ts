// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ISession, KernelMessage
} from 'jupyter-js-services';

import {
  clearSignalData
} from 'phosphor/lib/core/signaling';

import {
  Token
} from 'phosphor/lib/core/token';

import {
  Message
} from 'phosphor/lib/core/messaging';

import {
  scrollIntoViewIfNeeded
} from 'phosphor/lib/dom/query';

import {
  PanelLayout
} from 'phosphor/lib/ui/panel';

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
 * A widget containing a Jupyter console.
 */
export
class ConsoleWidget extends Widget {
  /**
   * Construct a console widget.
   */
  constructor(options: ConsoleWidget.IOptions) {
    super();
    this.addClass(CONSOLE_CLASS);

    let layout = new PanelLayout();

    this.layout = layout;
    this._renderer = options.renderer;
    this._rendermime = options.rendermime;
    this._session = options.session;

    this._history = new ConsoleHistory(this._session.kernel);

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
    layout.addWidget(banner);

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
    let layout = this.layout as PanelLayout;
    let last = layout.widgets.length - 1;
    return last > 0 ? layout.widgets.at(last) as CodeCellWidget : null;
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
   */
  execute(): Promise<void> {
    this.dismissCompletion();

    if (this._session.status === 'dead') {
      this._inspectionHandler.handleExecuteReply(null);
      return;
    }

    let prompt = this.prompt;
    prompt.trusted = true;
    this._history.push(prompt.model.source);
    // Create a new prompt before kernel execution to allow typeahead.
    this.newPrompt();
    return prompt.execute(this._session.kernel).then(
      (value: KernelMessage.IExecuteReplyMsg) => {
        if (!value) {
          this._inspectionHandler.handleExecuteReply(null);
          return;
        }
        if (value.content.status === 'ok') {
          let content = value.content as KernelMessage.IExecuteOkReply;
          this._inspectionHandler.handleExecuteReply(content);
          // Use deprecated payloads for backwards compatibility.
          if (content.payload) {
            let setNextInput = content.payload.filter(i => {
              return (i as any).source === 'set_next_input';
            })[0];
            if (setNextInput) {
              let text = (setNextInput as any).text;
              this.prompt.model.source = text;
            }
          }
        }
        Private.scrollToBottom(this.node);
      },
      () => { Private.scrollToBottom(this.node); }
    );
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
    let layout = this.layout as PanelLayout;
    for (let i = 1; i < layout.widgets.length; i++) {
      let widget = layout.widgets.at(i) as CodeCellWidget;
      output.push(widget.model.toJSON());
    }
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
    let prompt = this.prompt;
    scrollIntoViewIfNeeded(this.parent.node, prompt.node);
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
    }

    // Create the new prompt and add to layout.
    let layout = this.layout as PanelLayout;
    prompt = this._renderer.createPrompt(this._rendermime);
    prompt.mimetype = this._mimetype;
    prompt.addClass(PROMPT_CLASS);
    layout.addWidget(prompt);

    // Hook up completion and history handling.
    let editor = prompt.editor;
    editor.edgeRequested.connect(this.onEdgeRequest, this);

    // Associate the new prompt with the completion handler.
    this._completionHandler.activeCell = prompt;
    this._inspectionHandler.activeCell = prompt;

    // Jump to the bottom of the console.
    Private.scrollToBottom(this.node);
    prompt.activate();
  }

  /**
   * Update the console based on the kernel info.
   */
  private _handleInfo(info: KernelMessage.IInfoReply): void {
    let layout = this.layout as PanelLayout;
    let banner = layout.widgets.at(0) as RawCellWidget;
    banner.model.source = info.banner;
    this._mimetype = mimetypeForLanguage(info.language_info);
    this.prompt.mimetype = this._mimetype;
  }

  private _completion: CompletionWidget = null;
  private _completionHandler: CellCompletionHandler = null;
  private _inspectionHandler: InspectionHandler = null;
  private _mimetype = 'text/x-ipython';
  private _rendermime: IRenderMime = null;
  private _renderer: ConsoleWidget.IRenderer = null;
  private _history: IConsoleHistory = null;
  private _session: ISession = null;
}

/**
 * A namespace for ConsoleWidget statics.
 */
export
namespace ConsoleWidget {
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
