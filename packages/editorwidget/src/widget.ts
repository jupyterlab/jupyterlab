// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  IChangedArgs
} from '@jupyterlab/coreutils';

import {
  ABCWidgetFactory, DocumentRegistry
} from '@jupyterlab/docregistry';

import {
  CodeEditor, IEditorServices, IEditorMimeTypeService, CodeEditorWidget
} from '@jupyterlab/codeeditor';


/**
 * The class name added to a dirty widget.
 */
const DIRTY_CLASS = 'jp-mod-dirty';

/**
 * The class name added to a jupyter code mirror widget.
 */
const EDITOR_CLASS = 'jp-EditorWidget';


/**
 * A document widget for editors.
 */
export
class EditorWidget extends CodeEditorWidget {
  /**
   * Construct a new editor widget.
   */
  constructor(options: EditorWidget.IOptions) {
    super({
      factory: options.factory,
      model: options.context.model
    });
    this.addClass(EDITOR_CLASS);
    let context = this._context = options.context;
    this._mimeTypeService = options.mimeTypeService;
    this.editor.model.value.text = context.model.toString();
    this._onPathChanged();
    context.pathChanged.connect(this._onPathChanged, this);
    context.ready.then(() => {
      this._onContextReady();
    });
    if(context.realtimeHandler) {
      let realtime = context.realtimeHandler;
      realtime.ready.then(() => {
        //Setup the selection style for collaborators
        this.editor.uuid = realtime.localCollaborator.sessionId;
        let color = realtime.localCollaborator.color;
        let r = parseInt(color.slice(1,3), 16);
        let g  = parseInt(color.slice(3,5), 16);
        let b  = parseInt(color.slice(5,7), 16);
        this.editor.selectionStyle = {
          css: `background-color: rgba( ${r}, ${g}, ${b}, 0.1)`,
          color: realtime.localCollaborator.color
        };

        realtime.collaborators.changed.connect(this._onCollaboratorsChanged, this);
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
    let model = this._context.model;
    let editor = this.editor;
    let value = editor.model.value;
    value.text = model.toString();

    // Prevent the initial loading from disk from being in the editor history.
    editor.clearHistory();
    this._handleDirtyState();

    model.stateChanged.connect(this._onModelStateChanged, this);
    model.contentChanged.connect(this._onContentChanged, this);
  }

  /**
   * Handle a change to the model state.
   */
  private _onModelStateChanged(sender: DocumentRegistry.IModel, args: IChangedArgs<any>): void {
    if (args.name === 'dirty') {
      this._handleDirtyState();
    }
  }

  /**
   * Handle the dirty state of the model.
   */
  private _handleDirtyState(): void {
    if (this._context.model.dirty) {
      this.title.className += ` ${DIRTY_CLASS}`;
    } else {
      this.title.className = this.title.className.replace(DIRTY_CLASS, '');
    }
  }

  /**
   * Handle a change in model content.
   */
  private _onContentChanged(): void {
    let value = this.editor.model.value;
    let old = value.text;
    let text = this._context.model.toString();
    if (old !== text) {
      value.text = text;
    }
  }

  /**
   * Handle a change to the path.
   */
  private _onPathChanged(): void {
    let editor = this.editor;
    let path = this._context.path;
    editor.model.mimeType = this._mimeTypeService.getMimeTypeByFilePath(path);
    this.title.label = path.split('/').pop();
  }

  private _onCollaboratorsChanged(): void {
    //if there are selections corresponding to non-collaborators,
    //they are stale and should be removed.
    for(let key of this.editor.model.selections.keys()) {
      if(!this._context.realtimeHandler.collaborators.has(key)) {
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
