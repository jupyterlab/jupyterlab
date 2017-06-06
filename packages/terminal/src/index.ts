// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  IInstanceTracker
} from '@jupyterlab/apputils';

import {
  Token
} from '@phosphor/coreutils';

import {
  Terminal
} from './widget';

import '../style/index.css';

export * from './widget';

/**
 * A class that tracks editor widgets.
 */
export
interface ITerminalTracker extends IInstanceTracker<Terminal> {}


/* tslint:disable */
/**
 * The editor tracker token.
 */
export
const ITerminalTracker = new Token<ITerminalTracker>('jupyter.services.terminal-tracker');
/* tslint:enable */
