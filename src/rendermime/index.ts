// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

export * from './output';
export * from './rendermime';

import {
  Token
} from 'phosphor/lib/core/token';

import {
  RenderMime
} from './rendermime';


/* tslint:disable */
/**
 * The rendermime token.
 */
export
const IRenderMime = new Token<IRenderMime>('jupyter.services.rendermime');
/* tslint:enable */


/**
 * The rendermime interface.
 */
export
interface IRenderMime extends RenderMime {}
