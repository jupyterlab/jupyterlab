// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Token
} from 'phosphor/lib/core/token';

import {
  IInstanceTracker
} from '../common/instancetracker';

import {
  IChangedArgs
} from '..//common/interfaces';

import {
  ABCWidgetFactory, DocumentRegistry
} from '../docregistry';

import {
  CodeEditor, IEditorServices, IEditorMimeTypeService
} from '../codeeditor';

import {
  CodeEditorWidget
} from '../codeeditor/widget';

import {
  Widget
} from 'phosphor/lib/ui/widget';


/**
 * The class name added to a dirty widget.
 */
const DIRTY_CLASS = 'jp-mod-dirty';

/**
 * The class name added to a jupyter code mirror widget.
 */
const EDITOR_CLASS = 'jp-EditorWidget';


/**
 * A class that tracks editor widgets.
 */
export
interface IEditorTracker extends IInstanceTracker<EditorWidget> {}


/* tslint:disable */
/**
 * The editor tracker token.
 */
export
const IEditorTracker = new Token<EditorWidget>('jupyter.services.editor-tracker');
/* tslint:enable */


/**
 * A document widget for editors.
 */
export
class EditorWidget extends CodeEditorWidget {
  /**
   * Construct a new editor widget.
   */
  constructor(options: EditorWidget.IOptions) {
    super(options.factory);
    this.addClass(EDITOR_CLASS);
    let context = this._context = options.context;
    this._mimeTypeService = options.mimeTypeService;

    let model = context.model;
    let editor = this.editor;
    let value = editor.model.value;

    // Prevent the initial loading from disk from being in the editor history.
    context.ready.then( () => {
      if (!this.isDisposed) {
        value.text = model.toString();
        editor.model.clearHistory();
      }
    });

    value.text = model.toString();
    this.title.label = context.path.split('/').pop();
    this._handleDirtyState();
    this._onPathChanged();

    model.stateChanged.connect(this._onModelStateChanged, this);
    model.contentChanged.connect(this._onContentChanged, this);
    editor.model.value.changed.connect(this._onValueChanged, this);
    context.pathChanged.connect(this._onPathChanged, this);
  }

  /**
   * Get the context for the editor widget.
   */
  get context(): DocumentRegistry.Context {
    return this._context;
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
   * Handle a change in the editor model value.
   */
  private _onValueChanged(): void {
    this._context.model.fromString(this.editor.model.value.text);
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
     * The editor factory used to create the editor.
     */
    factory: (host: Widget) => CodeEditor.IEditor;

    /**
     * The mime type service for the editor.
     */
    mimeTypeService: IEditorMimeTypeService;

    /**
     * The document context associated with the editor.
     */
    context: DocumentRegistry.Context;
  }
}


/**
 * A widget factory for editors.
 */
export
class EditorWidgetFactory extends ABCWidgetFactory<EditorWidget, DocumentRegistry.IModel> {
  /**
   * Construct a new editor widget factory.
   */
  constructor(options: EditorWidgetFactory.IOptions) {
    super(options.factoryOptions);
    this._mimeTypeService = options.editorServices.mimeTypeService;
    let factory = options.editorServices.factory;
    this._factory = (host: Widget) => factory.newDocumentEditor(host.node, {
      lineNumbers: true,
      readOnly: false,
      wordWrap: true
    });
  }

  /**
   * Create a new widget given a context.
   */
  protected createNewWidget(context: DocumentRegistry.Context): EditorWidget {
    return new EditorWidget({
      factory: this._factory,
      context,
      mimeTypeService: this._mimeTypeService
    });
  }

  private _mimeTypeService: IEditorMimeTypeService;
  private _factory: (host: Widget) => CodeEditor.IEditor;
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
