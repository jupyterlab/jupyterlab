// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { DatastoreExt } from '@jupyterlab/datastore';

import { ICellData, CellData } from '@jupyterlab/cells';

import { IOutputData, OutputData } from '@jupyterlab/rendermime';

import { ReadonlyJSONValue } from '@phosphor/coreutils';

import {
  Datastore,
  Fields,
  ListField,
  MapField,
  RegisterField
} from '@phosphor/datastore';

/**
 * Interfaces for specifying how notebooks store data in datastores.
 */
export namespace INotebookData {
  /**
   * A specification for where notebook data is stored in a datastore.
   */
  export type DataLocation = DatastoreExt.DataLocation & {
    /**
     * The top-level record for the notebook data.
     */
    record: DatastoreExt.RecordLocation<Schema>;

    /**
     * The table holding cell data.
     */
    cells: DatastoreExt.TableLocation<ICellData.Schema>;

    /**
     * The table holding output data.
     */
    outputs: DatastoreExt.TableLocation<IOutputData.Schema>;
  };

  /**
   * An type alias for a notebook data schema.
   */
  export type Schema = {
    /**
     * The schema id.
     */
    id: string;

    /**
     * The schema fields.
     */
    fields: {
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
    };
  };
}

/**
 * Utilities for working with notebook data.
 */
export namespace NotebookData {
  /**
   * Create an in-memory datastore capable of holding the data for an output area.
   */
  export function createStore(id: number = 1): Datastore {
    return Datastore.create({
      id,
      schemas: [SCHEMA, CellData.SCHEMA, OutputData.SCHEMA]
    });
  }

  /**
   * A concrete notebook schema, available at runtime.
   */
  export const SCHEMA: INotebookData.Schema = {
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
