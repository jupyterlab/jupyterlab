// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { CellData } from '@jupyterlab/cells';

import { createDatastore } from '@jupyterlab/datastore';

import { DocumentRegistry } from '@jupyterlab/docregistry';

import { OutputData } from '@jupyterlab/rendermime';

import { Contents } from '@jupyterlab/services';

import { NotebookData } from './data';

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
    this.contentFactory =
      options.contentFactory || new NotebookModel.ContentFactory({});
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
  async createNew(
    options: DocumentRegistry.IModelFactory.IOptions = {}
  ): Promise<INotebookModel> {
    const contentFactory = this.contentFactory;
    const { languagePreference, path } = options;
    if (path) {
      const datastore = await createDatastore(path, [
        NotebookData.SCHEMA,
        OutputData.SCHEMA,
        CellData.SCHEMA
      ]);
      const data = {
        datastore,
        record: { schema: NotebookData.SCHEMA, record: 'data' },
        cells: { schema: CellData.SCHEMA },
        outputs: { schema: OutputData.SCHEMA }
      };
      return new NotebookModel({ data, languagePreference, contentFactory });
    }
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
export namespace NotebookModelFactory {
  /**
   * The options used to initialize a NotebookModelFactory.
   */
  export interface IOptions {
    /**
     * The content factory used by the NotebookModelFactory.  If
     * given, it will supersede the `codeCellContentFactory`.
     */
    contentFactory?: NotebookModel.IContentFactory;
  }
}
