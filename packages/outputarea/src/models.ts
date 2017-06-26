/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/
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
   *
   */
  mimeModelId: string;
}


/**
 * The model for an output area.
 */
export
interface IOutputArea {
  /**
   *
   */
  readonly isExecuting: boolean;

  /**
   * The ids for the output items.
   */
  readonly outputItemIds: ReadonlyArray<string>;
}


/**
 *
 */
export
interface IByIdMap<T> {
  /**
   *
   */
  readonly [id: number]: T;
}


/**
 *
 */
export
interface ITable<T> {
  /**
   *
   */
  readonly maxId: number;

  /**
   *
   */
  readonly byId: IByIdMap<T>;
}



export
interface IMimeStoreState {
  /**
   * The mime models table.
   */
  readonly mimeModels: ITable<IMimeModel>;

    /**
   * The mime models table.
   */
  readonly mimeBundles: ITable<IMimeBundle>;
}


/**
 * The data type for an output area store.
 */
export
interface IOutputStoreState extends IMimeStoreState {
  /**
   * The mime models table.
   */
  readonly mimeModels: ITable<IMimeModel>;

  /**
   * The output items table.
   */
  readonly outputItems: ITable<IOutputItem>;

  /**
   * The output areas table.
   */
  readonly outputAreas: ITable<IOutputArea>;
}


/**
 *
 */
export
type OutputStore = DataStore<IOutputStoreState>;
