/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { IActiveDataset, ActiveDataset } from '@jupyterlab/databus';

/**
 * The converter registry extension.
 */
export default {
  activate,
  id: '@jupyterlab/databus-extension:active-dataset',
  requires: [],
  provides: IActiveDataset,
  autoStart: true
} as JupyterFrontEndPlugin<IActiveDataset>;

function activate(app: JupyterFrontEnd): IActiveDataset {
  return new ActiveDataset();
}
