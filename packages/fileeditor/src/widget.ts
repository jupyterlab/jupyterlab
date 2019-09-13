// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  CodeEditor,
  IEditorServices,
  IEditorMimeTypeService,
  CodeEditorWrapper
} from '@jupyterlab/codeeditor';

import { DatastoreExt } from '@jupyterlab/datastore';

import {
  ABCWidgetFactory,
  DocumentRegistry,
  DocumentWidget,
  IDocumentWidget
} from '@jupyterlab/docregistry';

import { PromiseDelegate } from '@phosphor/coreutils';

import { Message } from '@phosphor/messaging';

import { StackedLayout, Widget } from '@phosphor/widgets';

/**
 * The data attribute added to a widget that can run code.
 */
const CODE_RUNNER = 'jpCodeRunner';

/**
 * The data attribute added to a widget that can undo.
 */
const UNDOER = 'jpUndoer';

/**
 * A code editor wrapper for the file editor.
 */
export class FileEditorCodeWrapper extends CodeEditorWrapper {
  /**
   * Construct a new editor widget.
   */
  constructor(options: FileEditor.IOptions) {
    super({
      factory: options.factory,
      model: options.context.model
    });

    const context = (this._context = options.context);

    this.addClass('jp-FileEditorCodeWrapper');
    this.node.dataset[CODE_RUNNER] = 'true';
    this.node.dataset[UNDOER] = 'true';

    void context.ready.then(() => {
      this._onContextReady();
    });

    // TODO Let collaborators know who we are via a cursor.
  }

  /**
   * Get the context for the editor widget.
   */
  get context(): DocumentRegistry.Context {
    return this._context;
  }

  /**
   * A promise that resolves when the file editor is ready.
   */
  get ready(): Promise<void> {
    return this._ready.promise;
  }

  /**
   * Dispose of the resources held by the widget.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this._trimSelections();
    super.dispose();
  }

  /**
   * Remove selections from inactive cells to avoid
   * spurious cursors.
   */
  private _trimSelections(): void {
    DatastoreExt.withTransaction(this.model.record.datastore, () => {
      DatastoreExt.updateField(
        { ...this.model.record, field: 'selections' },
        { [this.editor.uuid]: null }
      );
    });
  }

  /**
   * Handle actions that should be taken when the context is ready.
   */
  private _onContextReady(): void {
    if (this.isDisposed) {
      return;
    }
    this.editor.model.value = this._context.model.toString();
    // Prevent the initial loading from disk from being in the editor history.
    this.editor.clearHistory();

    // Resolve the ready promise.
    this._ready.resolve(undefined);
  }

  protected _context: DocumentRegistry.Context;
  private _ready = new PromiseDelegate<void>();
}

/**
 * A widget for editors.
 */
export class FileEditor extends Widget {
  /**
   * Construct a new editor widget.
   */
  constructor(options: FileEditor.IOptions) {
    super();
    this.addClass('jp-FileEditor');

    const context = (this._context = options.context);
    this._mimeTypeService = options.mimeTypeService;

    let layout = (this.layout = new StackedLayout());

    context.ready.then(() => {
      let editorWidget = (this._editorWidget = new FileEditorCodeWrapper(
        options
      ));
      layout.addWidget(editorWidget);
      this._onPathChanged();
    });

    // Listen for changes to the path.
    context.pathChanged.connect(this._onPathChanged, this);
  }

  /**
   * Get the context for the editor widget.
   */
  get context(): DocumentRegistry.Context {
    return this._editorWidget.context;
  }

  /**
   * The code editor model associated with the file.
   */
  get model(): CodeEditor.IModel | null {
    return this._editorWidget.model;
  }

  /**
   * The code editor widget associated with the file.
   */
  get editor(): CodeEditor.IEditor | null {
    return this._editorWidget.editor;
  }

  /**
   * A promise that resolves when the file editor is ready.
   */
  get ready(): Promise<void> {
    return this._editorWidget.ready;
  }

  /**
   * Handle the DOM events for the widget.
   *
   * @param event - The DOM event sent to the widget.
   *
   * #### Notes
   * This method implements the DOM `EventListener` interface and is
   * called in response to events on the widget's node. It should
   * not be called directly by user code.
   */
  handleEvent(event: Event): void {
    if (!this.model) {
      return;
    }
    switch (event.type) {
      case 'mousedown':
        this._ensureFocus();
        break;
      default:
        break;
    }
  }

  /**
   * Handle `after-attach` messages for the widget.
   */
  protected onAfterAttach(msg: Message): void {
    super.onAfterAttach(msg);
    let node = this.node;
    node.addEventListener('mousedown', this);
  }

  /**
   * Handle `before-detach` messages for the widget.
   */
  protected onBeforeDetach(msg: Message): void {
    let node = this.node;
    node.removeEventListener('mousedown', this);
  }

  /**
   * Handle `'activate-request'` messages.
   */
  protected onActivateRequest(msg: Message): void {
    this._ensureFocus();
  }

  /**
   * Ensure that the widget has focus.
   */
  private _ensureFocus(): void {
    if (!this._editorWidget.editor.hasFocus()) {
      this._editorWidget.editor.focus();
    }
  }

  /**
   * Handle a change to the path.
   */
  private _onPathChanged(): void {
    const localPath = this._context.localPath;
    this.model.mimeType = this._mimeTypeService.getMimeTypeByFilePath(
      localPath
    );
  }

  private _context: DocumentRegistry.Context;
  private _editorWidget: FileEditorCodeWrapper | null = null;
  private _mimeTypeService: IEditorMimeTypeService;
}

/**
 * The namespace for editor widget statics.
 */
export namespace FileEditor {
  /**
   * The options used to create an editor widget.
   */
  export interface IOptions {
    /**
     * A code editor factory.
     */
    factory: CodeEditor.Factory;

    /**
     * The mime type service for the editor.
     */
    mimeTypeService: IEditorMimeTypeService;

    /**
     * The document context associated with the editor.
     */
    context: DocumentRegistry.CodeContext;
  }
}

/**
 * A widget factory for editors.
 */
export class FileEditorFactory extends ABCWidgetFactory<
  IDocumentWidget<FileEditor>,
  DocumentRegistry.ICodeModel
> {
  /**
   * Construct a new editor widget factory.
   */
  constructor(options: FileEditorFactory.IOptions) {
    super(options.factoryOptions);
    this._services = options.editorServices;
  }

  /**
   * Create a new widget given a context.
   */
  protected createNewWidget(
    context: DocumentRegistry.CodeContext
  ): IDocumentWidget<FileEditor> {
    let func = this._services.factoryService.newDocumentEditor;
    let factory: CodeEditor.Factory = options => {
      return func(options);
    };
    const content = new FileEditor({
      factory,
      context,
      mimeTypeService: this._services.mimeTypeService
    });
    const widget = new DocumentWidget({ content, context });
    return widget;
  }

  private _services: IEditorServices;
}

/**
 * The namespace for `FileEditorFactory` class statics.
 */
export namespace FileEditorFactory {
  /**
   * The options used to create an editor widget factory.
   */
  export interface IOptions {
    /**
     * The editor services used by the factory.
     */
    editorServices: IEditorServices;

    /**
     * The factory options associated with the factory.
     */
    factoryOptions: DocumentRegistry.IWidgetFactoryOptions<
      IDocumentWidget<FileEditor>
    >;
  }
}
