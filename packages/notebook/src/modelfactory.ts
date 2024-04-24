// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import type { ISharedNotebook } from '@jupyter/ydoc';
import { DocumentRegistry } from '@jupyterlab/docregistry';
import { Contents } from '@jupyterlab/services';
import { INotebookModel, NotebookModel } from './model';

/**
 * A model factory for notebooks.
 */
export class NotebookModelFactory
  implements DocumentRegistry.IModelFactory<INotebookModel>
{
  /**
   * Construct a new notebook model factory.
   */
  constructor(options: NotebookModelFactory.IOptions = {}) {
    this._disableDocumentWideUndoRedo =
      options.disableDocumentWideUndoRedo ?? true;
    this._collaborative = options.collaborative ?? true;
  }

  /**
   * Define the disableDocumentWideUndoRedo property.
   *
   * @experimental
   * @alpha
   */
  get disableDocumentWideUndoRedo(): boolean {
    return this._disableDocumentWideUndoRedo;
  }
  set disableDocumentWideUndoRedo(disableDocumentWideUndoRedo: boolean) {
    this._disableDocumentWideUndoRedo = disableDocumentWideUndoRedo;
  }

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
   * Whether the model is collaborative or not.
   */
  get collaborative(): boolean {
    return this._collaborative;
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
   * @param options Model options.
   *
   * @returns A new document model.
   */
  createNew(
    options: DocumentRegistry.IModelOptions<ISharedNotebook> = {}
  ): INotebookModel {
    return new NotebookModel({
      languagePreference: options.languagePreference,
      sharedModel: options.sharedModel,
      collaborationEnabled: options.collaborationEnabled && this.collaborative,
      disableDocumentWideUndoRedo: this._disableDocumentWideUndoRedo
    });
  }

  /**
   * Get the preferred kernel language given a path.
   */
  preferredLanguage(path: string): string {
    return '';
  }

  /**
   * Defines if the document can be undo/redo.
   */
  private _disableDocumentWideUndoRedo: boolean;
  private _disposed = false;
  private _collaborative: boolean;
}

/**
 * The namespace for notebook model factory statics.
 */
export namespace NotebookModelFactory {
  /**
   * The options used to initialize a NotebookModelFactory.
   */
  export interface IOptions {
    /**
     * Whether the model is collaborative or not.
     */
    collaborative?: boolean;

    /**
     * Defines if the document can be undo/redo.
     *
     * Default: true
     *
     * @experimental
     * @alpha
     */
    disableDocumentWideUndoRedo?: boolean;
  }
}
