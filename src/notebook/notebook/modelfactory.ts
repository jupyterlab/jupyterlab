// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Contents
} from 'jupyter-js-services';

import {
  DocumentRegistry
} from '../../docregistry';

import {
  INotebookModel, NotebookModel
} from './model';


/**
 * A model factory for notebooks.
 */
export
class NotebookModelFactory implements DocumentRegistry.IModelFactory<INotebookModel> {
  /**
   * The name of the model.
   *
   * #### Notes
   * This is a read-only property.
   */
  get name(): string {
    return 'notebook';
  }

  /**
   * The content type of the file.
   *
   * #### Notes
   * This is a read-only property.
   */
  get contentType(): Contents.ContentType {
    return 'notebook';
  }

  /**
   * The format of the file.
   *
   * This is a read-only property.
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
    return new NotebookModel({ languagePreference });
  }

  /**
   * Get the preferred kernel language given a path.
   */
  preferredLanguage(path: string): string {
    return '';
  }

  private _disposed = false;
}
