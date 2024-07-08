// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ConnectionStatus, IConnectionStatus } from '@jupyterlab/application';
import type { IPlugin } from '@lumino/coreutils';

/**
 * The default JupyterLab application status provider.
 */
export const connectionStatus: IPlugin<null, IConnectionStatus> = {
  id: '@jupyterlab/application-extension:connection-status',
  description: 'Provides the application connection status.',
  activate: () => {
    return new ConnectionStatus();
  },
  autoStart: true,
  provides: IConnectionStatus
};
