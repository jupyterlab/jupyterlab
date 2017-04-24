// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Token
} from '@phosphor/coreutils';

import {
  IInstanceTracker
} from '@jupyterlab/apputils';

import {
  ChatboxPanel
} from './';


/* tslint:disable */
/**
 * The chatbox tracker token.
 */
export
const IChatboxTracker = new Token<IChatboxTracker>('jupyter.services.chatbox');
/* tslint:enable */


/**
 * A class that tracks chatbox widgets.
 */
export
interface IChatboxTracker extends IInstanceTracker<ChatboxPanel> {}
