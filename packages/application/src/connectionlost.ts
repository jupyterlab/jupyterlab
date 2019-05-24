// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { showErrorMessage } from '@jupyterlab/apputils';

import { ServerConnection, SessionManager } from '@jupyterlab/services';

import { IConnectionLost } from './tokens';

export const ConnectionLost: IConnectionLost = async function(
  manager: SessionManager,
  err: ServerConnection.NetworkError
): Promise<void> {
  if (Private.showingError) {
    return;
  }
  Private.showingError = true;

  const title = 'Server Connection Error';
  const networkMsg =
    'A connection to the Jupyter server could not be established.\n' +
    'JupyterLab will continue trying to reconnect.\n' +
    'Check your network connection or Jupyter server configuration.\n';

  return showErrorMessage(title, { message: networkMsg }).then(() => {
    Private.showingError = false;
  });
};

/**
 * A namespace for module private functionality.
 */
namespace Private {
  /**
   * Whether the connection lost error is currently being shown.
   */
  export let showingError = false;
}
