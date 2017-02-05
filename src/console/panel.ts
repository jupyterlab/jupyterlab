// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Token
} from 'phosphor/lib/core/token';

import {
  Session, Kernel
} from '@jupyterlab/services';

import {
  Message
} from 'phosphor/lib/core/messaging';

import {
  Panel
} from 'phosphor/lib/ui/panel';

import {
  Widget, ResizeMessage
} from 'phosphor/lib/ui/widget';

import {
  SizeWatcher
} from '../common/sizewatcher'

import {
  IEditorMimeTypeService, CodeEditor
} from '../codeeditor';

import {
  CompletionHandler, CompleterModel, CompleterWidget
} from '../completer';

import {
  BaseCellWidget, CodeCellWidget
} from '../cells';

import {
  OutputAreaWidget
} from '../outputarea';

import {
  IRenderMime
} from '../rendermime';

import {
  CodeConsole
} from './widget';


/**
 * The class name added to console panels.
 */
const PANEL_CLASS = 'jp-ConsolePanel';

/*
 * The width, below which, this panel will get the jp-width-tiny CSS class
*/
const TINY_WIDTH = 300;

/*
 * The width, below which, this panel will get the jp-width-small CSS class
*/
const SMALL_WIDTH = 500;

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

    // Instantiate the SizeWatcher for adding/removing CSS classes based on with.
    this._widthWatcher = new SizeWatcher(
      { direction: "width", tinySize: TINY_WIDTH, smallSize: SMALL_WIDTH}
    );

    // Instantiate the completer.
    this._completer = factory.createCompleter({ model: new CompleterModel() });

    // Set the completer widget's anchor widget to peg its position.
    this._completer.anchor = this.console;
    Widget.attach(this._completer, document.body);

    // Instantiate the completer handler.
    this._completerHandler = factory.createCompleterHandler({
      completer: this._completer,
      kernel: options.session.kernel
    });

    // Connect to change events.
    this.console.promptCreated.connect(this._onPromptCreated, this);
    options.session.kernelChanged.connect(this._onKernelChanged, this);
  }

  /**
   * The console widget used by the panel.
   */
  readonly console: CodeConsole;

  /**
   * Dispose of the resources held by the widget.
   */
  dispose(): void {
    if (this._completer === null) {
      return;
    }
    let completer = this._completer;
    let completerHandler = this._completerHandler;
    this._completer = null;
    this._completerHandler = null;
    completer.dispose();
    completerHandler.dispose();

    this.console.dispose();
    super.dispose();
  }

  /*
   * Handle the ResizeMessage, adding/removing size based CSS classes.
   */
  protected onResize(msg: ResizeMessage): void {
    super.onResize(msg);
    let width = msg.width;
    if (this.parent.isVisible) {
      this._widthWatcher.update(width, this);
    }
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
  private _onPromptCreated(sender: CodeConsole, prompt: CodeCellWidget): void {
    this._completer.reset();

    // Associate the new prompt with the completer.
    this._completerHandler.editor = prompt.editor;
  }

  /**
   * Handle a change to the kernel.
   */
  private _onKernelChanged(sender: Session.ISession, kernel: Kernel.IKernel): void {
    this._completerHandler.kernel = kernel;
  }

  private _completer: CompleterWidget = null;
  private _completerHandler: CompletionHandler = null;
  private _widthWatcher: SizeWatcher = null;
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

    /**
     * The completer widget for a console widget.
     */
    createCompleter(options: CompleterWidget.IOptions): CompleterWidget;

    /**
     * The completer handler for a console widget.
     */
    createCompleterHandler(options: CompletionHandler.IOptions): CompletionHandler;
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

    /**
     * The completer widget for a console widget.
     */
    createCompleter(options: CompleterWidget.IOptions): CompleterWidget {
      return new CompleterWidget(options);
    }

    /**
     * The completer handler for a console widget.
     */
   createCompleterHandler(options: CompletionHandler.IOptions): CompletionHandler {
      return new CompletionHandler(options);
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
