/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import {
  DataRegistry,
  IConverterRegistry,
  IDataRegistry,
  IDatasetRegistry
} from '@jupyterlab/dataregistry';

/**
 * The converter registry extension.
 */
export default {
  activate,
  id: '@jupyterlab/dataregistry-extension:data-registry',
  requires: [IConverterRegistry, IDatasetRegistry],
  provides: IDataRegistry,
  autoStart: true
} as JupyterFrontEndPlugin<IDataRegistry>;

function activate(
  app: JupyterFrontEnd,
  converters: IConverterRegistry,
  data: IDatasetRegistry
): IDataRegistry {
  return new DataRegistry({
    converters,
    data
  });
}
