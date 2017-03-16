// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Contents
} from '@jupyterlab/services';

import {
  DocumentRegistry
} from '@jupyterlab/docregistry';

import {
  CodeCellModel
} from '@jupyterlab/cells';

import {
  INotebookModel, NotebookModel
} from './model';


/**
 * A model factory for notebooks.
 */
export
class NotebookModelFactory implements DocumentRegistry.IModelFactory<INotebookModel> {
  /**
   * Construct a new notebook model factory.
   */
  constructor(options: NotebookModelFactory.IOptions) {
    let codeCellContentFactory = options.codeCellContentFactory;
    this.contentFactory = (options.contentFactory ||
      new NotebookModel.ContentFactory({ codeCellContentFactory })
    );
  }

  /**
   * The content model factory used by the NotebookModelFactory.
   */
  readonly contentFactory: NotebookModel.IContentFactory;

  /**
   * The name of the model.
   */
  get name(): string {
    return 'notebook';
  }

  /**
   * The content type of the file.
   */
  get contentType(): Contents.ContentType {
    return 'notebook';
  }

  /**
   * The format of the file.
   */
  get fileFormat(): Contents.FileFormat {
    return 'json';
  }

  /**
   * Get whether the model factory has been disposed.
   */
  get isDisposed(): boolean {
    return this._disposed;
  }

  /**
   * Dispose of the model factory.
   */
  dispose(): void {
    this._disposed = true;
  }

  /**
   * Create a new model for a given path.
   *
   * @param languagePreference - An optional kernel language preference.
   *
   * @returns A new document model.
   */
  createNew(languagePreference?: string): INotebookModel {
    let contentFactory = this.contentFactory;
    return new NotebookModel({ languagePreference, contentFactory });
  }

  /**
   * Get the preferred kernel language given a path.
   */
  preferredLanguage(path: string): string {
    return '';
  }

  private _disposed = false;
}


/**
 * The namespace for notebook model factory statics.
 */
export
namespace NotebookModelFactory {
  /**
   * The options used to initialize a NotebookModelFactory.
   */
  export
  interface IOptions {
    /**
     * The factory for code cell content.
     */
    codeCellContentFactory?: CodeCellModel.IContentFactory;

    /**
     * The content factory used by the NotebookModelFactory.  If
     * given, it will supercede the `codeCellContentFactory`.
     */
    contentFactory?: NotebookModel.IContentFactory;
  }
}
