// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { CodeCellModel } from '@jupyterlab/cells';
import { DocumentRegistry } from '@jupyterlab/docregistry';
import { IModelDB } from '@jupyterlab/observables';
import { Contents } from '@jupyterlab/services';
import { INotebookModel, NotebookModel } from './model';

/**
 * A model factory for notebooks.
 */
export class NotebookModelFactory
  implements DocumentRegistry.IModelFactory<INotebookModel> {
  /**
   * Construct a new notebook model factory.
   */
  constructor(options: NotebookModelFactory.IOptions) {
    this._collaborative = options.collaborative ?? true;
    this._disableDocumentWideUndoRedo =
      options.disableDocumentWideUndoRedo || false;
    const codeCellContentFactory = options.codeCellContentFactory;
    this.contentFactory =
      options.contentFactory ||
      new NotebookModel.ContentFactory({ codeCellContentFactory });
  }

  /**
   * The content model factory used by the NotebookModelFactory.
   */
  readonly contentFactory: NotebookModel.IContentFactory;

  /**
   * Define the disableDocumentWideUndoRedo property.
   */
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
   * @param languagePreference - An optional kernel language preference.
   * @param modelDB - An optional model storage.
   * @param isInitialized - Whether the model is initialized or not.
   * @param collaborationEnabled - Whether collaboration is enabled at the application level or not (default `false`).
   *
   * @returns A new document model.
   */
  createNew(
    languagePreference?: string,
    modelDB?: IModelDB,
    isInitialized?: boolean,
    collaborationEnabled?: boolean
  ): INotebookModel {
    const contentFactory = this.contentFactory;
    return new NotebookModel({
      languagePreference,
      contentFactory,
      collaborationEnabled: collaborationEnabled && this.collaborative,
      modelDB,
      isInitialized,
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
     */
    disableDocumentWideUndoRedo?: boolean;

    /**
     * The factory for code cell content.
     */
    codeCellContentFactory?: CodeCellModel.IContentFactory;

    /**
     * The content factory used by the NotebookModelFactory.  If
     * given, it will supersede the `codeCellContentFactory`.
     */
    contentFactory?: NotebookModel.IContentFactory;
  }
}
