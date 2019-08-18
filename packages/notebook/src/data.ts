// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { DatastoreExt, SchemaFields } from '@jupyterlab/datastore';

import { ICellData } from '@jupyterlab/cells';

import { IOutputData } from '@jupyterlab/rendermime';

import { ReadonlyJSONValue } from '@phosphor/coreutils';

import {
  Fields,
  ListField,
  MapField,
  RegisterField,
  Schema
} from '@phosphor/datastore';

/**
 * Interfaces for specifying how notebooks store data in datastores.
 */
export namespace INotebookData {
  /**
   * A specification for where notebook data is stored in a datastore.
   */
  export type DataLocation = {
    /**
     * The top-level record for the notebook data.
     */
    record: DatastoreExt.RecordLocation<ISchema>;

    /**
     * The table holding cell data.
     */
    cells: DatastoreExt.TableLocation<ICellData.ISchema>;

    /**
     * The table holding output data.
     */
    outputs: DatastoreExt.TableLocation<IOutputData.ISchema>;
  };

  /**
   * Fields in a notebook schema.
   */
  export interface IFields extends SchemaFields {
    /**
     * The major nbformat version number.
     */
    readonly nbformat: RegisterField<number>;

    /**
     * The minor nbformat version number.
     */
    readonly nbformatMinor: RegisterField<number>;

    /**
     * The list of cell IDs in the notebook.
     */
    readonly cells: ListField<string>;

    /**
     * The metadata for the notebook.
     */
    readonly metadata: MapField<ReadonlyJSONValue>;
  }

  /**
   * An interface for a notebook schema.
   */
  export interface ISchema extends Schema {
    /**
     * The schema fields.
     */
    fields: IFields;
  }
}

/**
 * Utilities for working with notebook data.
 */
export namespace NotebookData {
  /**
   * A concrete notebook schema, available at runtime.
   */
  export const SCHEMA: INotebookData.ISchema = {
    /**
     * The schema id.
     */
    id: '@jupyterlab/notebook:notebookmodel.v1',

    /**
     * Concrete realizations of the schema fields, available at runtime.
     */
    fields: {
      nbformat: Fields.Number(),
      nbformatMinor: Fields.Number(),
      cells: Fields.List<string>(),
      metadata: Fields.Map<ReadonlyJSONValue>()
    }
  };
}
