/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import { JupyterLab, JupyterLabPlugin } from '@jupyterlab/application';
import {
  ConverterRegistry,
  IConverterRegistry,
  fetchConverter
} from '@jupyterlab/databus';

/**
 * The converter registry extension.
 */
export default {
  activate,
  id: '@jupyterlab/databus-extension:converter-registry',
  requires: [],
  provides: IConverterRegistry,
  autoStart: true
} as JupyterLabPlugin<IConverterRegistry>;

function activate(app: JupyterLab): IConverterRegistry {
  const registry = new ConverterRegistry();
  registry.register(fetchConverter);
  return registry;
}
