/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import {
  ConverterRegistry,
  IConverterRegistry
} from '@jupyterlab/dataregistry';

/**
 * The converter registry extension.
 */
export default {
  activate,
  id: '@jupyterlab/dataregistry-extension:converter-registry',
  requires: [],
  provides: IConverterRegistry,
  autoStart: true
} as JupyterFrontEndPlugin<IConverterRegistry>;

function activate(app: JupyterFrontEnd): IConverterRegistry {
  return new ConverterRegistry();
}
