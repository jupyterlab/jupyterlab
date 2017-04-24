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
  CodeChatbox
} from './widget';


/**
 * The class name added to chatbox panels.
 */
const PANEL_CLASS = 'jp-ChatboxPanel';


/**
 * A panel which contains a chatbox and the ability to add other children.
 */
export
class ChatboxPanel extends Panel {
  /**
   * Construct a chatbox panel.
   */
  constructor(options: ChatboxPanel.IOptions) {
    super();
    this.addClass(PANEL_CLASS);
    let {
      rendermime, mimeTypeService, path, basePath, name, manager, modelFactory
    } = options;
    let factory = options.contentFactory;
    let contentFactory = factory.chatboxContentFactory;
    let count = Private.count++;
    if (!path) {
      path = `${basePath || ''}/chatbox-${count}-${uuid()}`;
    }

    let session = this._session = new ClientSession({
      manager: manager.sessions,
      path,
      name: name || `Chatbox ${count}`,
      type: 'chatbox',
      kernelPreference: options.kernelPreference
    });

    rendermime.resolver = new RenderMime.UrlResolver({
      session,
      contents: manager.contents
    });

    this.chatbox = factory.createChatbox({
      rendermime, session, mimeTypeService, contentFactory, modelFactory
    });
    this.addWidget(this.chatbox);

    session.ready.then(() => {
      this._connected = new Date();
      this._updateTitle();
    });

    this._manager = manager;
    this.chatbox.executed.connect(this._onExecuted, this);
    session.kernelChanged.connect(this._updateTitle, this);
    session.propertyChanged.connect(this._updateTitle, this);

    this.title.icon = 'jp-ImageCodeChatbox';
    this.title.closable = true;
    this.id = `chatbox-${count}`;
  }

  /**
   * The chatbox widget used by the panel.
   */
  readonly chatbox: CodeChatbox;

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
    this.chatbox.dispose();
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
    this.chatbox.prompt.editor.focus();
  }

  /**
   * Handle `'close-request'` messages.
   */
  protected onCloseRequest(msg: Message): void {
    super.onCloseRequest(msg);
    this.dispose();
  }

  /**
   * Handle a chatbox execution.
   */
  private _onExecuted(sender: CodeChatbox, args: Date) {
    this._executed = args;
    this._updateTitle();
  }

  /**
   * Update the chatbox panel title.
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
 * A namespace for ChatboxPanel statics.
 */
export
namespace ChatboxPanel {
  /**
   * The initialization options for a chatbox panel.
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
     * The path of an existing chatbox.
     */
    path?: string;

    /**
     * The base path for a new chatbox.
     */
    basePath?: string;

    /**
     * The name of the chatbox.
     */
    name?: string;

    /**
     * A kernel preference.
     */
    kernelPreference?: IClientSession.IKernelPreference;

    /**
     * The model factory for the chatbox widget.
     */
    modelFactory?: CodeChatbox.IModelFactory;

    /**
     * The service used to look up mime types.
     */
    mimeTypeService: IEditorMimeTypeService;
  }

  /**
   * The chatbox panel renderer.
   */
  export
  interface IContentFactory {
    /**
     * The editor factory used by the content factory.
     */
    readonly editorFactory: CodeEditor.Factory;

    /**
     * The factory for code chatbox content.
     */
    readonly chatboxContentFactory: CodeChatbox.IContentFactory;

    /**
     * Create a new chatbox panel.
     */
    createChatbox(options: CodeChatbox.IOptions): CodeChatbox;
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
      this.chatboxContentFactory = (options.chatboxContentFactory ||
        new CodeChatbox.ContentFactory({
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
     * The factory for code chatbox content.
     */
    readonly chatboxContentFactory: CodeChatbox.IContentFactory;

    /**
     * Create a new chatbox panel.
     */
    createChatbox(options: CodeChatbox.IOptions): CodeChatbox {
      return new CodeChatbox(options);
    }
  }

  /**
   * The namespace for `ContentFactory`.
   */
  export
  namespace ContentFactory {
    /**
     * An initialization options for a chatbox panel factory.
     */
    export
    interface IOptions {
      /**
       * The editor factory.  This will be used to create a
       * chatboxContentFactory if none is given.
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
       * The factory for chatbox widget content.  If given, this will
       * take precedence over the output area and cell factories.
       */
      chatboxContentFactory?: CodeChatbox.IContentFactory;
    }
  }

  /* tslint:disable */
  /**
   * The chatbox renderer token.
   */
  export
  const IContentFactory = new Token<IContentFactory>('jupyter.services.chatbox.content-factory');
  /* tslint:enable */
}


/**
 * A namespace for private data.
 */
namespace Private {
  /**
   * The counter for new chatboxs.
   */
  export
  let count = 1;

  /**
   * Update the title of a chatbox panel.
   */
  export
  function updateTitle(panel: ChatboxPanel, connected: Date | null, executed: Date | null) {
    let session = panel.chatbox.session;
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
