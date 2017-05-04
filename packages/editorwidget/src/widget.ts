// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  IChangedArgs
} from '@jupyterlab/coreutils';

import {
  ABCWidgetFactory, DocumentRegistry
} from '@jupyterlab/docregistry';

import {
  CodeEditor, IEditorServices, IEditorMimeTypeService, CodeEditorWrapper
} from '@jupyterlab/codeeditor';


/**
 * The class name added to a dirty widget.
 */
const DIRTY_CLASS = 'jp-mod-dirty';

/**
 * The class name added to a jupyter editor widget.
 */
const EDITOR_CLASS = 'jp-EditorWidget';


/**
 * A document widget for editors.
 */
export
class EditorWidget extends CodeEditorWrapper {
  /**
   * Construct a new editor widget.
   */
  constructor(options: EditorWidget.IOptions) {
    super({
      factory: options.factory,
      model: options.context.model
    });

    const context = this._context = options.context;
    const editor = this.editor;

    this.addClass(EDITOR_CLASS);
    this._mimeTypeService = options.mimeTypeService;
    editor.model.value.text = context.model.toString();
    context.pathChanged.connect(this._onPathChanged, this);
    context.ready.then(() => { this._onContextReady(); });
    this._onPathChanged();
  }

  /**
   * Get the context for the editor widget.
   */
  get context(): DocumentRegistry.Context {
    return this._context;
  }

  /**
   * Handle actions that should be taken when the context is ready.
   */
  private _onContextReady(): void {
    if (this.isDisposed) {
      return;
    }
    const contextModel = this._context.model;
    const editor = this.editor;
    const editorModel = editor.model;

    // Set the editor model value.
    editorModel.value.text = contextModel.toString();

    // Prevent the initial loading from disk from being in the editor history.
    editor.clearHistory();
    this._handleDirtyState();

    // Wire signal connections.
    contextModel.stateChanged.connect(this._onModelStateChanged, this);
    contextModel.contentChanged.connect(this._onContentChanged, this);
  }

  /**
   * Handle a change to the context model state.
   */
  private _onModelStateChanged(sender: DocumentRegistry.IModel, args: IChangedArgs<any>): void {
    if (args.name === 'dirty') {
      this._handleDirtyState();
    }
  }

  /**
   * Handle the dirty state of the context model.
   */
  private _handleDirtyState(): void {
    if (this._context.model.dirty) {
      this.title.className += ` ${DIRTY_CLASS}`;
    } else {
      this.title.className = this.title.className.replace(DIRTY_CLASS, '');
    }
  }

  /**
   * Handle a change in context model content.
   */
  private _onContentChanged(): void {
    const editorModel = this.editor.model;
    const oldValue = editorModel.value.text;
    const newValue = this._context.model.toString();

    if (oldValue !== newValue) {
      editorModel.value.text = newValue;
    }
  }

  /**
   * Handle a change to the path.
   */
  private _onPathChanged(): void {
    const editor = this.editor;
    const path = this._context.path;

    editor.model.mimeType = this._mimeTypeService.getMimeTypeByFilePath(path);
    this.title.label = path.split('/').pop();
  }

  protected _context: DocumentRegistry.Context;
  private _mimeTypeService: IEditorMimeTypeService;
}


/**
 * The namespace for editor widget statics.
 */
export
namespace EditorWidget {
  /**
   * The options used to create an editor widget.
   */
  export
  interface IOptions {
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
export
class EditorWidgetFactory extends ABCWidgetFactory<EditorWidget, DocumentRegistry.ICodeModel> {
  /**
   * Construct a new editor widget factory.
   */
  constructor(options: EditorWidgetFactory.IOptions) {
    super(options.factoryOptions);
    this._services = options.editorServices;
  }

  /**
   * Create a new widget given a context.
   */
  protected createNewWidget(context: DocumentRegistry.CodeContext): EditorWidget {
    let func = this._services.factoryService.newDocumentEditor.bind(
      this._services.factoryService);
    let factory: CodeEditor.Factory = options => {
      options.lineNumbers = true;
      options.readOnly = false;
      options.wordWrap = true;
      return func(options);
    };
    return new EditorWidget({
      factory,
      context,
      mimeTypeService: this._services.mimeTypeService
    });
  }

  private _services: IEditorServices;
}


/**
 * The namespace for `EditorWidgetFactory` class statics.
 */
export
namespace EditorWidgetFactory {
  /**
   * The options used to create an editor widget factory.
   */
  export
  interface IOptions {
    /**
     * The editor services used by the factory.
     */
    editorServices: IEditorServices;

    /**
     * The factory options associated with the factory.
     */
    factoryOptions: DocumentRegistry.IWidgetFactoryOptions;
  }
}
