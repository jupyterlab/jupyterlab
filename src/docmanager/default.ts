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
  IDocumentModel, IWidgetFactory, IModelFactory, IDocumentContext,
  IKernelPreference
} from './index';


/**
 * The default implementation of a document model.
 */
export
class DocumentModel implements IDocumentModel {
  /**
   * Construct a new document model.
   */
  constructor(kernelPreference: IKernelPreference) {
    this._kernelPreference = kernelPreference;
  }

  /**
   * A signal emitted when the document content changes.
   */
  get contentChanged(): ISignal<IDocumentModel, string> {
    return Private.contentChangedSignal.bind(this);
  }

  /**
   * The kernel preference for the document.
   */
  get kernelPreference(): IKernelPreference {
    return this._kernelPreference;
  }
  set kernelPreference(value: IKernelPreference) {
    this._kernelPreference = value;
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
    if (this._text === value) {
      return;
    }
    this._text = value;
    this.contentChanged.emit(value);
  }

  private _text = '';
  private _kernelPreference: IKernelPreference = null;
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
    return { type: 'file', format: 'text' };
  }

  /**
   * Create a new model.
   */
  createNew(kernelPreference?: IKernelPreference): IDocumentModel {
    kernelPreference = kernelPreference || { name: 'default', language: 'default' };
    return new DocumentModel(kernelPreference);
  }

  /**
   * Get the preferred kernel info given a path and specs.
   */
  getKernelPreference(path: string, specs: IKernelSpecId[]): IKernelPreference {
    // TODO
    return { primary: 'none', others: [] };
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
    let editor = this.editor;
    let doc = editor.getDoc();
    doc.setValue(model.serialize());
    loadModeByFileName(editor, context.path);
    this._context.pathChanged.connect((c, path) => {
      loadModeByFileName(editor, path);
    });
    model.contentChanged.connect((m, text) => {
      doc.setValue(text);
    });
    CodeMirror.on(doc, 'change', (instance, change) => {
      if (change.origin !== 'setValue') {
        model.deserialize(instance.getValue());
      }
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

  /**
   * Get the preferred kernel info given a model preference.
   */
  getKernelPreferences(modelPreference: IKernelPreference): IKernelPreference {
    let others [modelPreference.primary].concat(modelPreference.others);
    return { primary: 'none', others };
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
