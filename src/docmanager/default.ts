// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import {
  IKernelSpecId
} from 'jupyter-js-services';

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

  constructor(path: string, kernelSpecs: IKernelSpecId[]) {
    // Use the path and the kernel specs to set the default
    // kernel and language.
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
   * Create a new model.
   */
   createNew(path: string, kernelSpecs: IKernelSpecId[]): IDocumentModel {
     return new DocumentModel(path, kernelSpecs);
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
   * Create a new widget given a document model and a context.
   */
  createNew(model: IDocumentModel, context: IDocumentContext): EditorWidget {
    return new EditorWidget(model, context);
  }

  /**
   * Get the default kernel name given a path and a list of specs.
   */
  getDefaultKernel(path: string, specs: IKernelSpecId[]): string {
    return 'default';
  }

  /**
   * Get the preferred kernel names given a path and a list of specs.
   */
  getPreferredKernels(path: string, specs: IKernelSpecId[]): string[] {
    return ['default'];
  }

  /**
   * Get the preferred widget title given a path.
   */
  getWidgetTitle(path: string): string {
    return path.split('/').pop();
  }
}

