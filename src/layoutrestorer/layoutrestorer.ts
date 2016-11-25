/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import {
  JSONObject
} from 'phosphor/lib/algorithm/json';

import {
  Token
} from 'phosphor/lib/core/token';

import {
  IStateDB
} from '../statedb';


/* tslint:disable */
/**
 * The layout restorer token.
 */
export
const ILayoutRestorer = new Token<ILayoutRestorer>('jupyter.services.layout-restorer');
/* tslint:enable */


/**
 * A static class that restores the layout of the application when it reloads.
 */
export
interface ILayoutRestorer {
  /**
   * Wait for the given promise to resolve before restoring layout.
   *
   * #### Notes
   * This function should only be called before the `first` promise passed in
   * at instantiation has resolved. See the notes for `LayoutRestorer.IOptions`.
   */
  await(promise: Promise<any>): void;
}


/**
 * The state database key for restorer data.
 */
const KEY = 'layout-restorer:data';


/**
 * The default implementation of a layout restorer.
 *
 * #### Notes
 * The layout restorer requires all of the tabs that will be rearranged and
 * focused to already exist, it does not rehydrate them.
 */
export
class LayoutRestorer implements ILayoutRestorer {
  /**
   * Create a layout restorer.
   */
  constructor(options: LayoutRestorer.IOptions) {
    this._state = options.state;
    options.first.then(() => Promise.all(this._promises))
      .then(() => { this.restore(); });
  }

  /**
   * Wait for the given promise to resolve before restoring layout.
   *
   * #### Notes
   * This function should only be called before the `first` promise passed in
   * at instantiation has resolved. See the notes for `LayoutRestorer.IOptions`.
   */
  await(promise: Promise<any>): void {
    this._promises.push(promise);
  }

  restore(): void {
    /* */
  }

  save(data: JSONObject): Promise<void> {
    return this._state.save(KEY, data);
  }

  private _promises: Promise<any>[] = [];
  private _state: IStateDB = null;
}


/**
 * A namespace for `LayoutRestorer` statics.
 */
export
namespace LayoutRestorer {
  /**
   * The configuration options for layout restorer instantiation.
   */
  export
  interface IOptions {
    /**
     * The initial promise that has to be resolved before layout restoration.
     *
     * #### Notes
     * The lifecycle for state and layout restoration is subtle. This promise
     * is intended to equal the JupyterLab application `started` notifier.
     * The sequence of events is as follows:
     *
     * 1. The layout restorer plugin is instantiated.
     *
     * 2. Other plugins that care about state and layout restoration require
     *    the layout restorer as a dependency.
     *
     * 3. As each load-time plugin initializes (which happens before the lab
     *    application has `started`), it instructs the layout restorer whether
     *    the restorer ought to `await` its state restoration.
     *
     * 4. After all the load-time plugins have finished initializing, the lab
     *    application `started` promise will resolve. This is the `first`
     *    promise that the layout restorer waits for. By this point, all of the
     *    plugins that care about layout restoration will have instructed the
     *    layout restorer to `await` their restoration.
     *
     * 5. Each plugin will then proceed to restore its state and reinstantiate
     *    whichever widgets it wants to restore.
     *
     * 6. As each plugin finishes restoring, it resolves the promise that it
     *    instructed the layout restorer to `await` (in step 3).
     *
     * 7. After all of the promises that the restorer is awaiting have resolved,
     *    the restorer then proceeds to reconstruct the saved layout.
     */
    first: Promise<any>;

    /**
     * The state database instance.
     */
    state: IStateDB;
  }
}
