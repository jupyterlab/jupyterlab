/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/
import {
  DataStore, Table
} from '@phosphor/datastore';

import {
  nbformat
} from '@jupyterlab/coreutils';


/**
 * The type of an output item in an output area.
 */
export
type OutputItem = {
  /**
   * The nbformat type of the output.
   */
  type: nbformat.OutputType;

  /**
   * Whether the output is trusted.
   */
  readonly trusted: boolean;

  /**
   * The id of mime data bundle for the output.
   */
  readonly mimeDataId: string;

  /**
   * The id of the mime metadata bundle for the output.
   */
  readonly mimeMetadataId: string;

  /**
   * The stream type for 'stream' items.
   */
  readonly streamType: nbformat.StreamType | null;

  /**
   * The execution count of the output.
   */
  readonly executionCount: nbformat.ExecutionCount;
};


/**
 * The type of an output area.
 */
export
type OutputArea = {
  /**
   * Whether the output area is trusted.
   */
  readonly trusted: boolean;

  /**
   * The id for the area's output list.
   */
  readonly outputListId: string;
};


/**
 * The state type for an output area store.
 */
export
type OutputState = {
  /**
   * The table of output item mime data bundles.
   */
  readonly mimeBundleTable: Table.JSONTable<JSONObject>;

  /**
   * The table of output items.
   */
  readonly outputItemTable: Table.RecordTable<OutputItem>;

  /**
   * The table of output areas.
   */
  readonly outputAreaTable: Table.RecordTable<OutputArea>;

  /**
   * The table of output lists.
   */
  readonly outputListTable: Table.ListTable<string>;
};


/**
 * A type alias for an output store.
 */
export
type OutputStore = DataStore<OutputState>;
