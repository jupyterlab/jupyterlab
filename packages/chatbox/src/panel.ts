// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  IEditorMimeTypeService, CodeEditor
} from '@jupyterlab/codeeditor';

import {
  uuid
} from '@jupyterlab/coreutils';

import {
  IRenderMime
} from '@jupyterlab/rendermime';

import {
  Message
} from '@phosphor/messaging';

import {
  Panel
} from '@phosphor/widgets';

import {
  Chatbox
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
      rendermime, mimeTypeService, path, basePath, modelFactory
    } = options;
    let factory = options.contentFactory;
    let contentFactory = factory.chatboxContentFactory;
    let count = Private.count++;
    if (!path) {
      path = `${basePath || ''}/chatbox-${count}-${uuid()}`;
    }

    this.chatbox = factory.createChatbox({
      rendermime, mimeTypeService, contentFactory, modelFactory
    });
    this.addWidget(this.chatbox);

    this.title.icon = 'jp-ImageChatbox';
    this.title.closable = true;
    this.id = `chatbox-${count}`;
  }

  /**
   * The chatbox widget used by the panel.
   */
  readonly chatbox: Chatbox;

  /**
   * Dispose of the resources held by the widget.
   */
  dispose(): void {
    this.chatbox.dispose();
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
     * The model factory for the chatbox widget.
     */
    modelFactory?: Chatbox.IModelFactory;

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
    readonly chatboxContentFactory: Chatbox.IContentFactory;

    /**
     * Create a new chatbox panel.
     */
    createChatbox(options: Chatbox.IOptions): Chatbox;
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

    /**
     * Create a new chatbox panel.
     */
    createChatbox(options: Chatbox.IOptions): Chatbox {
      return new Chatbox(options);
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
       * The factory for chatbox widget content.  If given, this will
       * take precedence over the output area and cell factories.
       */
      chatboxContentFactory?: Chatbox.IContentFactory;
    }
  }
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
}
