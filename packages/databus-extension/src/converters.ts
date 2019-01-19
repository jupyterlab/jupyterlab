/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import { JupyterLab, JupyterLabPlugin } from '@jupyterlab/application';
import { ConverterRegistry, IConverterRegistry } from '@jupyterlab/databus';

/**
 * The converter registry extension.
 */
export default {
  activate: activateConverterRegistry,
  id: '@jupyterlab/databus-extension:converter-registry',
  requires: [],
  provides: IConverterRegistry,
  autoStart: true
} as JupyterLabPlugin<IConverterRegistry>;

function activateConverterRegistry(app: JupyterLab): IConverterRegistry {
  return new ConverterRegistry();
}
