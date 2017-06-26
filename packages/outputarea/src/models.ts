/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/
import {
  IMimeBundle
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
   * The id of the mime bundle for the item.
   */
  readonly mimeBundleId: string;
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
  readonly itemIds: ReadonlyArray<string>;
}


/**
 * The data type for an output area store.
 */
export
interface IOutputStoreState {
  /**
   * The mime bundles table.
   */
  readonly mimeBundles: {
    /**
     * The current maximum mime bundle id.
     */
    readonly maxId: number;

    /**
     * A mapping of id to mime bundle.
     */
    readonly byId: { readonly [id: number]: IMimeBundle };
  };

  /**
   * The output items table.
   */
  readonly outputItems: {
    /**
     * The current maximum output item id.
     */
    readonly maxId: number;

    /**
     * A mapping of id to output item.
     */
    readonly byId: { readonly [id: number]: IOutputItem };
  };

  /**
   * The output areas table.
   */
  readonly outputAreas: {
    /**
     * The current maximum output area id.
     */
    readonly maxId: number;

    /**
     * A mapping of id to output area.
     */
    readonly byId: { readonly [id: number]: IOutputArea };
  };
}


/**
 *
 */
export
type OutputStore = Store<IOutputStoreState>;
