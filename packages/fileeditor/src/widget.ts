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
const EDITOR_CLASS = 'jp-FileEditor';


/**
 * A document widget for editors.
 */
export
class FileEditor extends CodeEditorWrapper {
  /**
   * Construct a new editor widget.
   */
  constructor(options: FileEditor.IOptions) {
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

    if (context.model.modelDB.isCollaborative) {
      let modelDB = context.model.modelDB;
      modelDB.connected.then(() => {
        //Setup the selection style for collaborators
        let localCollaborator = modelDB.collaborators.localCollaborator;
        this.editor.uuid = localCollaborator.sessionId;
        let color = localCollaborator.color;
        let r = parseInt(color.slice(1,3), 16);
        let g  = parseInt(color.slice(3,5), 16);
        let b  = parseInt(color.slice(5,7), 16);
        this.editor.selectionStyle = {
          css: `background-color: rgba( ${r}, ${g}, ${b}, 0.1)`,
          color: localCollaborator.color
        };

        modelDB.collaborators.changed.connect(this._onCollaboratorsChanged, this);
        //Trigger an initial onCollaboratorsChanged event.
        this._onCollaboratorsChanged();
      });
    }
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

  private _onCollaboratorsChanged(): void {
    //if there are selections corresponding to non-collaborators,
    //they are stale and should be removed.
    for (let key of this.editor.model.selections.keys()) {
      if (!this._context.model.modelDB.collaborators.has(key)) {
        this.editor.model.selections.delete(key);
      }
    }
  }

  protected _context: DocumentRegistry.Context;
  private _mimeTypeService: IEditorMimeTypeService;
}


/**
 * The namespace for editor widget statics.
 */
export
namespace FileEditor {
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
class FileEditorFactory extends ABCWidgetFactory<FileEditor, DocumentRegistry.ICodeModel> {
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
  protected createNewWidget(context: DocumentRegistry.CodeContext): FileEditor {
    let func = this._services.factoryService.newDocumentEditor.bind(
      this._services.factoryService);
    let factory: CodeEditor.Factory = options => {
      options.lineNumbers = true;
      options.readOnly = false;
      options.wordWrap = true;
      return func(options);
    };
    return new FileEditor({
      factory,
      context,
      mimeTypeService: this._services.mimeTypeService
    });
  }

  private _services: IEditorServices;
}


/**
 * The namespace for `FileEditorFactory` class statics.
 */
export
namespace FileEditorFactory {
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
