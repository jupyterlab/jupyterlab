// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ClientSession, IClientSession
} from '@jupyterlab/apputils';

import {
  BaseCellWidget, CodeCellWidget
} from '@jupyterlab/cells';

import {
  IEditorMimeTypeService, CodeEditor
} from '@jupyterlab/codeeditor';

import {
  PathExt, Time, uuid
} from '@jupyterlab/coreutils';

import {
  OutputAreaWidget
} from '@jupyterlab/outputarea';

import {
  IRenderMime, RenderMime
} from '@jupyterlab/rendermime';

import {
  ServiceManager
} from '@jupyterlab/services';

import {
  Token
} from '@phosphor/coreutils';

import {
  Message
} from '@phosphor/messaging';

import {
  Panel
} from '@phosphor/widgets';

import {
  CodeConsole
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
    let {
      rendermime, mimeTypeService, path, basePath, name, manager, modelFactory
    } = options;
    let factory = options.contentFactory;
    let contentFactory = factory.consoleContentFactory;
    let count = Private.count++;
    if (!path) {
      path = `${basePath || ''}/console-${count}-${uuid()}`;
    }

    let session = this._session = new ClientSession({
      manager: manager.sessions,
      path,
      name: name || `Console ${count}`,
      type: 'console',
      kernelPreference: options.kernelPreference
    });

    rendermime.resolver = new RenderMime.UrlResolver({
      session,
      contents: manager.contents
    });

    this.console = factory.createConsole({
      rendermime, session, mimeTypeService, contentFactory, modelFactory
    });
    this.addWidget(this.console);

    session.ready.then(() => {
      this._connected = new Date();
      this._updateTitle();
    });

    this._manager = manager;
    this.console.executed.connect(this._onExecuted, this);
    session.kernelChanged.connect(this._updateTitle, this);
    session.propertyChanged.connect(this._updateTitle, this);

    this.title.icon = 'jp-ImageCodeConsole';
    this.title.closable = true;
    this.id = `console-${count}`;
  }

  /**
   * The console widget used by the panel.
   */
  readonly console: CodeConsole;

  /**
   * The session used by the panel.
   */
  get session(): IClientSession {
    return this._session;
  }

  /**
   * Dispose of the resources held by the widget.
   */
  dispose(): void {
    this.console.dispose();
    super.dispose();
  }

  /**
   * Handle `'after-attach'` messages.
   */
  protected onAfterAttach(msg: Message): void {
    this._session.initialize();
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
   * Handle a console execution.
   */
  private _onExecuted(sender: CodeConsole, args: Date) {
    this._executed = args;
    this._updateTitle();
  }

  /**
   * Update the console panel title.
   */
  private _updateTitle(): void {
    Private.updateTitle(this, this._connected, this._executed);
  }

  private _manager: ServiceManager.IManager;
  private _executed: Date = null;
  private _connected: Date = null;
  private _session: ClientSession;
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
     * The service manager used by the panel.
     */
    manager: ServiceManager.IManager;

    /**
     * The path of an existing console.
     */
    path?: string;

    /**
     * The base path for a new console.
     */
    basePath?: string;

    /**
     * The name of the console.
     */
    name?: string;

    /**
     * A kernel preference.
     */
    kernelPreference?: IClientSession.IKernelPreference;

    /**
     * The model factory for the console widget.
     */
    modelFactory?: CodeConsole.IModelFactory;

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
     * The editor factory used by the content factory.
     */
    readonly editorFactory: CodeEditor.Factory;

    /**
     * The factory for code console content.
     */
    readonly consoleContentFactory: CodeConsole.IContentFactory;

    /**
     * Create a new console panel.
     */
    createConsole(options: CodeConsole.IOptions): CodeConsole;
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
      this.editorFactory = options.editorFactory;
      this.consoleContentFactory = (options.consoleContentFactory ||
        new CodeConsole.ContentFactory({
          editorFactory: this.editorFactory,
          outputAreaContentFactory: options.outputAreaContentFactory,
          codeCellContentFactory: options.codeCellContentFactory,
          rawCellContentFactory: options.rawCellContentFactory
        })
      );
    }

    /**
     * The editor factory used by the content factory.
     */
    readonly editorFactory: CodeEditor.Factory;

    /**
     * The factory for code console content.
     */
    readonly consoleContentFactory: CodeConsole.IContentFactory;

    /**
     * Create a new console panel.
     */
    createConsole(options: CodeConsole.IOptions): CodeConsole {
      return new CodeConsole(options);
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
       * The editor factory.  This will be used to create a
       * consoleContentFactory if none is given.
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

      /**
       * The factory for console widget content.  If given, this will
       * take precedence over the output area and cell factories.
       */
      consoleContentFactory?: CodeConsole.IContentFactory;
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


/**
 * A namespace for private data.
 */
namespace Private {
  /**
   * The counter for new consoles.
   */
  export
  let count = 1;

  /**
   * Update the title of a console panel.
   */
  export
  function updateTitle(panel: ConsolePanel, connected: Date | null, executed: Date | null) {
    let session = panel.console.session;
    let caption = (
      `Name: ${session.name}\n` +
      `Directory: ${PathExt.dirname(session.path)}\n` +
      `Kernel: ${session.kernelDisplayName}`
    );
    if (connected) {
      caption += `\nConnected: ${Time.format(connected.toISOString())}`;
    }
    if (executed) {
      caption += `\nLast Execution: ${Time.format(executed.toISOString())}`;
    }
    panel.title.label = session.name;
    panel.title.caption = caption;
  }
}
