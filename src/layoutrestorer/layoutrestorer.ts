/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import {
  Token
} from 'phosphor/lib/core/token';


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
  await(promise: Promise<any>): void;
}


/**
 * The default implementation of a layout restorer.
 *
 * #### Notes
 * The layout restorer requires all of the tabs that will be rearranged and
 * focused to already exist, it does not rehydrate them.
 */
export
class LayoutRestorer implements ILayoutRestorer {
  constructor(first: Promise<any>) {
    first.then(() => Promise.all(this._promises))
      .then(() => { this.restore(); });
  }

  await(promise: Promise<any>): void {
    this._promises.push(promise);
  }

  restore(): void {
    /* */
  }

  private _promises: Promise<any>[] = [];
}
