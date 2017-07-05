// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Panel, Widget
} from '@phosphor/widgets';

import {
  Message
} from '@phosphor/messaging';

import {
  CodeEditor
} from '@jupyterlab/codeeditor';

import {
  PathExt
} from '@jupyterlab/coreutils';

import {
  RenderMime
} from '@jupyterlab/rendermime';

import {
  DocumentRegistry
} from '@jupyterlab/docregistry';

import {
  Chatbox
} from './chatbox';


/**
 * The class name added to chatbox panels.
 */
const PANEL_CLASS = 'jp-ChatboxPanel';

/**
 * The class name added to the document info widget.
 */
const DOCUMENT_INFO_CLASS = 'jp-ChatboxDocumentInfo';

/**
 * The class name added to a button icon node.
 */
const ICON_CLASS = 'jp-FileButtons-buttonIcon';

/**
 * The class name added to a material icon button.
 */
const MATERIAL_CLASS = 'jp-MaterialIcon';

/**
 * The class name added to the add button.
 */
const CHAT_ICON = 'jp-ChatIcon';


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
    let factory = options.contentFactory;
    let rendermime = options.rendermime;
    let contentFactory = factory.chatboxContentFactory;

    this._documentInfo = new ChatboxDocumentInfo();
    this.addWidget(this._documentInfo);

    this.chatbox = new Chatbox({
      rendermime, contentFactory
    });
    this.addWidget(this.chatbox);
    this.id = 'chatbox';
  }

  /**
   * The chatbox widget used by the panel.
   */
  readonly chatbox: Chatbox;

  /**
   * The current document context for the chat.
   */
  get context(): DocumentRegistry.IContext<DocumentRegistry.IModel> {
    return this._context;
  }
  set context(value: DocumentRegistry.IContext<DocumentRegistry.IModel>) {
    if (this._context === value) {
      return;
    }
    this._context = value;
    this.chatbox.model = value.model;
    this._documentInfo.context = value;
  }

  /**
   * Dispose of the resources held by the widget.
   */
  dispose(): void {
    this.chatbox.dispose();
    this._documentInfo.dispose();
    super.dispose();
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

  private _documentInfo: ChatboxDocumentInfo;
  private _context: DocumentRegistry.IContext<DocumentRegistry.IModel> = null;
}

/**
 * A class representing a widget displaying document information
 * for the chatbox.
 */
export
class ChatboxDocumentInfo extends Widget {
  constructor() {
    super();
    this.addClass(DOCUMENT_INFO_CLASS);
    let chatIcon = document.createElement('div');
    chatIcon.className = ICON_CLASS + ' ' + MATERIAL_CLASS + ' ' + CHAT_ICON;
    let fileName = document.createElement('div');
    fileName.className = 'jp-ChatboxDocumentInfo-name';
    this.node.appendChild(chatIcon);
    this.node.appendChild(fileName);
  }

  /**
   * The current document context for the chat.
   */
  get context(): DocumentRegistry.IContext<DocumentRegistry.IModel> {
    return this._context;
  }
  set context(value: DocumentRegistry.IContext<DocumentRegistry.IModel>) {
    if (this._context) {
      this._context.pathChanged.disconnect(this._onPathChanged, this);
    }
    this._context = value;
    this._context.pathChanged.connect(this._onPathChanged, this);
    this.node.children[1].textContent = PathExt.basename(value.path);
  }

  /**
   * Handle a file moving/renaming.
   */
  private _onPathChanged(sender: DocumentRegistry.IContext<DocumentRegistry.IModel>, path: string): void {
    this.node.children[1].textContent = PathExt.basename(path);
  }

  private _context: DocumentRegistry.IContext<DocumentRegistry.IModel> = null;
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
    rendermime: RenderMime;

    /**
     * The content factory for the panel.
     */
    contentFactory: IContentFactory;
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
     * The factory for chatbox content.
     */
    readonly chatboxContentFactory: Chatbox.IContentFactory;
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
        new Chatbox.ContentFactory({
          editorFactory: this.editorFactory
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
    readonly chatboxContentFactory: Chatbox.IContentFactory;
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
       * The factory for chatbox widget content.  If given, this will
       * take precedence over the output area and cell factories.
       */
      chatboxContentFactory?: Chatbox.IContentFactory;
    }
  }
}
