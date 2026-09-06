// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import type { JupyterFrontEndPlugin } from '@jupyterlab/application';
import { IConsoleCellExecutor, runCell } from '@jupyterlab/console';

/**
 * Console cell executor plugin.
 */
export const cellExecutor: JupyterFrontEndPlugin<IConsoleCellExecutor> = {
  id: '@jupyterlab/console-extension:cell-executor',
  description: 'Provides the console cell executor.',
  autoStart: true,
  provides: IConsoleCellExecutor,
  activate: (): IConsoleCellExecutor => {
    return Object.freeze({ runCell });
  }
};
