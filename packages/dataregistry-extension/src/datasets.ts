/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { DatasetRegistry, IDatasetRegistry } from '@jupyterlab/dataregistry';

const id = '@jupyterlab/dataregistry-extension:datasets';
/**
 * The data registry extension.
 */
export default {
  activate,
  id,
  requires: [],
  provides: IDatasetRegistry,
  autoStart: true
} as JupyterFrontEndPlugin<IDatasetRegistry>;

function activate(app: JupyterFrontEnd): IDatasetRegistry {
  return new DatasetRegistry();
}
