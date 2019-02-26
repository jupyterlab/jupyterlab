// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Schema, Fields } from '@phosphor/datastore';

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
    let codeCellContentFactory = options.codeCellContentFactory;
    this.contentFactory =
      options.contentFactory ||
      new NotebookModel.ContentFactory({ codeCellContentFactory });
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
  createNew(languagePreference?: string, modelDB?: IModelDB): INotebookModel {
    let contentFactory = this.contentFactory;
    return new NotebookModel({ languagePreference, contentFactory, modelDB });
  }

  /**
   * Get the preferred kernel language given a path.
   */
  preferredLanguage(path: string): string {
    return '';
  }

  get schemas(): ReadonlyArray<Schema> {
    return [
      {
        id: 'NotebookModelSchema.v1',
        fields: {
          mimeType: Fields.String(),
          metadata: Fields.Map(),
          cellOrder: Fields.List<string>()
        }
      },
      {
        id: 'NotebookModelSchema.v1.cells',
        fields: {
          // General fields for cells:
          type: Fields.String(),
          metadata: Fields.Map(),
          trusted: Fields.Boolean(),

          // Fields for editable models:
          value: Fields.Text({
            description: 'The text value of the model'
          }),
          mimeType: Fields.String({
            value: 'text/plain',
            description: 'The MIME type of the text'
          }),
          selections: Fields.Map({
            description: 'A map of all text selections for all users'
          }),

          // Code cell specific:
          executionCount: Fields.Register<number | null>({ value: null }),
          outputs: Fields.String(),

          // Cells with attachments (md/raw):
          attachments: Fields.String()
        }
      }
    ];
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
