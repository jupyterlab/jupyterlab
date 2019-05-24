// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ServerConnection, SessionManager } from '@jupyterlab/services';

import { Token } from '@phosphor/coreutils';

/**
 * A token for which a plugin can provide to respond to connection failures
 * to the application server.
 */
export const IConnectionLost = new Token<IConnectionLost>(
  '@jupyterlab/apputils:IConnectionLost'
);

export type IConnectionLost = (
  manager: SessionManager,
  err: ServerConnection.NetworkError
) => Promise<void>;
