// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Token
} from 'phosphor/lib/core/token';

import {
  Session
} from '@jupyterlab/services';

import {
  Message
} from 'phosphor/lib/core/messaging';

import {
  Panel
} from 'phosphor/lib/ui/panel';

import {
  Widget
} from 'phosphor/lib/ui/widget';

import {
  IEditorMimeTypeService
} from '../codeeditor';

import {
  CellCompleterHandler, CompleterWidget
} from '../completer';

import {
  InspectionHandler
} from '../inspector';

import {
  CodeCellWidget
} from '../notebook/cells';

import {
  IRenderMime
} from '../rendermime';

import {
  Console
} from './widget';


/**
 * The class name added to console panels.
 */
const PANEL_CLASS = 'jp-ConsolePanel';


/**
 * A panel which contains a console and the ability to add other children.
 */
export
class ConsolePanel extends Panel {
  /**
   * Construct a console panel.
   */
  constructor(options: ConsolePanel.IOptions) {
    super();
    this.addClass(PANEL_CLASS);
    let factory = options.contentFactory;
    let { rendermime, session, mimeTypeService } = options;
    let contentFactory = factory.consoleContentFactory;
    let consoleOpts = { rendermime, session, mimeTypeService, contentFactory };
    this.console = factory.createConsole(consoleOpts);
    this.addWidget(this.console);

    // Set up the inspection handler.
    this.inspectionHandler = factory.createInspectionHandler({
      kernel: options.session.kernel,
      rendermime: this.console.rendermime
    });

    // Instantiate the completer.
    this._completer = factory.createCompleter({});

    // Set the completer widget's anchor node to peg its position.
    this._completer.anchor = this.node;

    // Because a completer widget may be passed in, check if it is attached.
    if (!this._completer.isAttached) {
      Widget.attach(this._completer, document.body);
    }

    // Instantiate the completer handler.
    this._completerHandler = factory.createCompleterHandler({
      completer: this._completer,
      kernel: options.session.kernel
    });

    this.console.promptCreated.connect(this._onPromptCreated, this);

    options.session.kernelChanged.connect(this._onKernelChanged, this);
  }

  /**
   * The console widget used by the panel.
   */
  readonly console: Console;

  /**
   * The inspection handler used by the console.
   */
  readonly inspectionHandler: InspectionHandler;

  /**
   * Dispose of the resources held by the widget.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }

    // Dispose console widget.
    this._content.dispose();
    this._content = null;

    this._completerHandler.dispose();
    this._completerHandler = null;
    this._completer.dispose();
    this._completer = null;
    this.inspectionHandler.dispose();

    super.dispose();
  }

  /**
   * Handle `'activate-request'` messages.
   */
  protected onActivateRequest(msg: Message): void {
    this.console.prompt.editor.focus();
  }

  /**
   * Handle `'close-request'` messages.
   */
  protected onCloseRequest(msg: Message): void {
    super.onCloseRequest(msg);
    this.dispose();
  }

  /**
   * Handle the creation of a new prompt.
   */
  private _onPromptCreated(sender: Console, prompt: CodeCellWidget): void {
    this._completer.reset();

    // Associate the new prompt with the completer and inspection handlers.
    this._completerHandler.activeCell = prompt;
    this.inspectionHandler.activeCell = prompt;
  }

  /**
   * Handle a change to the kernel.
   */
  private _onKernelChanged(): void {
    let kernel = this.console.session.kernel;
    this._completerHandler.kernel = kernel;
    this.inspectionHandler.kernel = kernel;
  }

  private _content: Console = null;
  private _completer: CompleterWidget = null;
  private _completerHandler: CellCompleterHandler = null;

}


/**
 * A namespace for ConsolePanel statics.
 */
export
namespace ConsolePanel {
  /**
   * The initialization options for a console panel.
   */
  export
  interface IOptions {
    /**
     * The rendermime instance used by the panel.
     */
    rendermime: IRenderMime;

    /**
     * The content factory for the panel.
     */
    contentFactory: IContentFactory;

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
   * The console panel renderer.
   */
  export
  interface IContentFactory {
    /**
     * The console content factory.
     */
    readonly consoleContentFactory: Console.IContentFactory;

    /**
     * Create a new console panel.
     */
    createConsole(options: Console.IOptions): Console;

    /**
     * The inspection handler for a console widget.
     */
    createInspectionHandler(options: InspectionHandler.IOptions): InspectionHandler;

    /**
     * The completer widget for a console widget.
     */
    createCompleter(options: CompleterWidget.IOptions): CompleterWidget;

    /**
     * The completer handler for a console widget.
     */
    createCompleterHandler(options: CellCompleterHandler.IOptions): CellCompleterHandler;
  }

  /**
   * Default implementation of `IContentFactory`.
   */
  export
  class ContentFactory implements IContentFactory {
    /**
     * Create a new content factory.
     */
    constructor(options: ContentFactory.IOptions) {
      this.consoleContentFactory = options.consoleContentFactory;
    }

    /**
     * The console content factory.
     */
    readonly consoleContentFactory: Console.IContentFactory;

    /**
     * Create a new console panel.
     */
    createConsole(options: Console.IOptions): Console {
      return new Console(options);
    }

    /**
     * The inspection handler for a console widget.
     */
    createInspectionHandler(options: InspectionHandler.IOptions): InspectionHandler {
      return new InspectionHandler(options);
    }

    /**
     * The completer widget for a console widget.
     */
    createCompleter(options: CompleterWidget.IOptions): CompleterWidget {
      return new CompleterWidget(options);
    }

    /**
     * The completer handler for a console widget.
     */
   createCompleterHandler(options: CellCompleterHandler.IOptions): CellCompleterHandler {
      return new CellCompleterHandler(options);
   }
  }

  /**
   * The namespace for `ContentFactory`.
   */
  export
  namespace ContentFactory {
    /**
     * An initialization options for a console panel factory.
     */
    export
    interface IOptions {
      /**
       * The notebook content factory.
       */
      consoleContentFactory: Console.IContentFactory;
    }
  }

  /* tslint:disable */
  /**
   * The console renderer token.
   */
  export
  const IContentFactory = new Token<IContentFactory>('jupyter.services.console.content-factory');
  /* tslint:enable */
}
