// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  IContentsOpts
} from 'jupyter-js-services';

import {
  IModelFactory
} from '../../docregistry';

import {
  INotebookModel, NotebookModel
} from './model';


/**
 * A model factory for notebooks.
 */
export
class NotebookModelFactory implements IModelFactory {
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
   * The contents options used to fetch/save files.
   *
   * #### Notes
   * This is a read-only property.
   */
  get contentsOptions(): IContentsOpts {
    return { type: 'notebook' };
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
    let model = new NotebookModel(languagePreference);
    let cell = model.createCodeCell();
    model.cells.add(cell);
    return model;
  }

  /**
   * Get the preferred kernel language given a path.
   */
  preferredLanguage(path: string): string {
    return '';
  }

  private _disposed = false;
}
