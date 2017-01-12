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
  IEditorMimeTypeService
} from '../codeeditor';

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
  }

  /**
   * The console widget used by the panel.
   */
  readonly console: Console;

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

  private _content: Console = null;
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
