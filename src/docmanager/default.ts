// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import {
  IKernelSpecId, IContentsOpts
} from 'jupyter-js-services';

import {
  ISignal, Signal
} from 'phosphor-signaling';

import {
  loadModeByFileName
} from '../codemirror';

import {
  CodeMirrorWidget
} from '../codemirror/widget';

import {
  IDocumentModel, IWidgetFactory, IModelFactory, IDocumentContext
} from './index';


/**
 * The default implementation a document model.
 */
export
class DocumentModel implements IDocumentModel {
  /**
   * Construct a new document model.
   */
  constructor(path: string) {
    // Use the path to set the default kernel and language.
  }

  /**
   * A signal emitted when the document content changes.
   */
  get contentChanged(): ISignal<IDocumentModel, string> {
    return Private.contentChangedSignal.bind(this);
  }

  /**
   * Serialize the model.
   */
  serialize(): string {
    return this._text;
  }

  /**
   * Deserialize the model from a string.
   */
  deserialize(value: string): void {
    this._text = value;
    this.contentChanged.emit(value);
  }

  /**
   * The default kernel name for the the document.
   *
   * #### Notes
   * This is a read-only property.
   */
  get defaultKernelName(): string {
    return this._defaultName;
  }

  /**
   * The default kernel language for the document.
   *
   * #### Notes
   * This is a read-only property.
   */
  get defaultKernelLanguage(): string {
    return this._defaultLanguage;
  }

  private _text = '';
  private _defaultName = '';
  private _defaultLanguage = '';
}


/**
 * The default implementation of a model factory.
 */
export
class ModelFactory {
  /**
   * The name of the model factory.
   *
   * #### Notes
   * This is a read-only property.
   */
  get name(): string {
    return 'file';
  }

  /**
   * The contents options used to fetch/save files.
   *
   * #### Notes
   * This is a read-only property.
   */
  get contentsOptions(): IContentsOpts {
    return { type: 'file' };
  }

  /**
   * Create a new model.
   */
   createNew(path: string): IDocumentModel {
     return new DocumentModel(path);
   }
}



/**
 * A document widget for codemirrors.
 */
export
class EditorWidget extends CodeMirrorWidget {

  /**
   * Construct a new editor widget.
   */
  constructor(model: IDocumentModel, context: IDocumentContext) {
    super();
    this._model = model;
    this._context = context;
    this.editor.getDoc().setValue(model.serialize());
    loadModeByFileName(this.editor, context.path);
    this._context.pathChanged.connect((c, path) => {
      loadModeByFileName(this.editor, path);
    });
    model.contentChanged.connect((m, text) => {
      this.editor.getDoc().setValue(text);
    });
  }

  private _model: IDocumentModel = null;
  private _context: IDocumentContext = null;
}


/**
 * The default implemetation of a widget factory.
 */
export
class WidgetFactory implements IWidgetFactory<EditorWidget> {
  /**
   * The file extensions the widget can view.
   *
   * #### Notes
   * This is a read-only property.
   *
   * This widget factory can view all files, so we don't have
   * a specific file extension.
   */
  get fileExtensions(): string[] {
    return [];
  }

  /**
   * The name of the widget to display in dialogs.
   *
   * #### Notes
   * This is a read-only property.
   */
  get displayName(): string {
    return 'Editor';
  }

  /**
   * The registered name of the model type used to create the widgets.
   *
   * #### Notes
   * This is a read-only property.
   */
  get modelName(): string {
    return 'file';
  }

  /**
   * Create a new widget given a document model and a context.
   */
  createNew(model: IDocumentModel, context: IDocumentContext): EditorWidget {
    return new EditorWidget(model, context);
  }

  /**
   * Get the preferred widget title given a path.
   */
  getWidgetTitle(path: string, widget: EditorWidget): string {
    return path.split('/').pop();
  }
}


/**
 * A private namespace for data.
 */
namespace Private {
  /**
   * A signal emitted when a document content changes.
   */
  export
  const contentChangedSignal = new Signal<IDocumentModel, string>();

}
