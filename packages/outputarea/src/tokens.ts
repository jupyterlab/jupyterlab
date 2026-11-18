// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Token } from '@lumino/coreutils';
import type { ReadonlyJSONObject } from '@lumino/coreutils';

/**
 * The page handler token.
 */
export const IPageHandler = new Token<IPageHandler>(
  '@jupyterlab/outputarea:IPageHandler',
  'A service to handle pager output display.'
);

/**
 * A service to handle pager payload display.
 */
export interface IPageHandler {
  /**
   * Handle a `source: page` payload.
   *
   * Return `true` when the payload has been handled and the output area
   * should skip default inline rendering.
   */
  handlePage(payload: ReadonlyJSONObject): boolean;
}
