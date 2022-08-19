// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { showErrorMessage } from '@jupyterlab/apputils';
import { ServerConnection, ServiceManager } from '@jupyterlab/services';
import { ITranslator, nullTranslator } from '@jupyterlab/translation';
import { IConnectionLost } from './tokens';

/**
 * A default connection lost handler, which brings up an error dialog.
 */
export const ConnectionLost: IConnectionLost = async function (
  manager: ServiceManager.IManager,
  err: ServerConnection.NetworkError,
  translator?: ITranslator
): Promise<void> {
  translator = translator || nullTranslator;
  const trans = translator.load('jupyterlab');
  const title = trans.__('Server Connection Error');
  const networkMsg = trans.__(
    'A connection to the Jupyter server could not be established.\n' +
      'JupyterLab will continue trying to reconnect.\n' +
      'Check your network connection or Jupyter server configuration.\n'
  );

  return showErrorMessage(title, { message: networkMsg });
};
