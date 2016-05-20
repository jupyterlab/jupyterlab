// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import {
  IModelFactory
} from 'jupyter-js-ui/lib/docmanager';

import {
  INotebookModel, NotebookModel
} from './model';


/**
 * A model factory for notebooks.
 */
export
class NotebookModelFactory implements IModelFactory {
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
    return new NotebookModel(languagePreference);
  }

  /**
   * Get the preferred kernel language given a path.
   */
  preferredLanguage(path: string): string {
    return '';
  }

  private _disposed = false;
}
