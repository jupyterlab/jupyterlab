// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Session
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
  BaseCellWidget, CodeCellWidget
} from '@jupyterlab/cells';

import {
  IEditorMimeTypeService, CodeEditor
} from '@jupyterlab/codeeditor';

import {
  OutputAreaWidget
} from '@jupyterlab/outputarea';

import {
  IRenderMime
} from '@jupyterlab/rendermime';

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
    let factory = options.contentFactory;
    let { rendermime, session, mimeTypeService } = options;
    let contentFactory = factory.consoleContentFactory;
    let modelFactory = options.modelFactory;
    let consoleOpts = {
      rendermime, session, mimeTypeService, contentFactory, modelFactory
    };
    this.console = factory.createConsole(consoleOpts);
    this.addWidget(this.console);
  }

  /**
   * The console widget used by the panel.
   */
  readonly console: CodeConsole;

  /**
   * Dispose of the resources held by the widget.
   */
  dispose(): void {
    this.console.dispose();
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
