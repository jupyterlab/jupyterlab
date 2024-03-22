// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import type { JupyterFrontEndPlugin } from '@jupyterlab/application';
import { INotebookCellExecutor } from '@jupyterlab/notebook';
import { runCell } from '@jupyterlab/notebook';

/**
 * Notebook cell executor plugin.
 */
export const cellExecutor: JupyterFrontEndPlugin<INotebookCellExecutor> = {
  id: '@jupyterlab/notebook-extension:cell-executor',
  description: 'Provides the notebook cell executor.',
  autoStart: true,
  provides: ICellExecutor,
  activate: (): INotebookCellExecutor => {
    return Object.freeze({ runCell });
  }
};
