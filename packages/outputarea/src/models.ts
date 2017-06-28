/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/
import {
  DataStore, Table
} from '@phosphor/datastore';

import {
  IMimeModel
} from '@jupyterlab/rendermime';


/**
 * The model for a single item in an output area.
 */
export
interface IOutputItem {
  /**
   * The output type.
   */
  readonly type: string;

  /**
   * The execution count of the item.
   */
  readonly executionCount: nbformat.ExecutionCount;

  /**
   * The id of the item's mime model.
   */
  readonly mimeModelId: string;
}


/**
 * The model for an output area.
 */
export
interface IOutputArea {
  /**
   * Whether code is currently executing for the area.
   */
  readonly isExecuting: boolean;

  /**
   * The id for the area's output list.
   */
  readonly outputListId: string;
}


/**
 * The data type for an output area store.
 */
export
interface IOutputStoreState {
  /**
   * The table of mime models.
   */
  readonly mimeModelTable: Table.RecordTable<IMimeModel>;

  /**
   * The table of output items.
   */
  readonly outputItemTable: Table.RecordTable<IOutputItem>;

  /**
   * The table of output areas.
   */
  readonly outputAreaTable: Table.RecordTable<IOutputArea>;

  /**
   * The table of output lists.
   */
  readonly outputListTable: Table.ListTable<string>;
}


/**
 * A type alias for an output store.
 */
export
type OutputStore = DataStore<IOutputStoreState>;
