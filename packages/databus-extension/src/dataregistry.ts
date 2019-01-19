/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import { JupyterLab, JupyterLabPlugin } from '@jupyterlab/application';
import { DataRegistry, IDataRegistry } from '@jupyterlab/databus';

/**
 * The data registry extension.
 */
export default {
  activate: activateDataRegistry,
  id: '@jupyterlab/databus-extension:data-registry',
  requires: [],
  provides: IDataRegistry,
  autoStart: true
} as JupyterLabPlugin<IDataRegistry>;

function activateDataRegistry(app: JupyterLab): IDataRegistry {
  return new DataRegistry();
}
