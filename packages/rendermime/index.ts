// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

export * from './mimemodel';
export * from './outputmodel';
export * from './rendermime';

import {
  Token
} from '@phosphor/application';

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
