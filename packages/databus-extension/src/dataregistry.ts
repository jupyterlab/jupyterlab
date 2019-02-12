/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { DataRegistry, IDataRegistry } from '@jupyterlab/databus';

const id = '@jupyterlab/databus-extension:data-registry';
/**
 * The data registry extension.
 */
export default {
  activate,
  id,
  requires: [],
  provides: IDataRegistry,
  autoStart: true
} as JupyterFrontEndPlugin<IDataRegistry>;

function activate(app: JupyterFrontEnd): IDataRegistry {
  return new DataRegistry();
}
