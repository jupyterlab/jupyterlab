/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import {
  DataBus,
  IConverterRegistry,
  IDataBus,
  IDataRegistry
} from '@jupyterlab/databus';

/**
 * The converter registry extension.
 */
export default {
  activate,
  id: '@jupyterlab/databus-extension:databus',
  requires: [IConverterRegistry, IDataRegistry],
  provides: IDataBus,
  autoStart: true
} as JupyterFrontEndPlugin<IDataBus>;

function activate(
  app: JupyterFrontEnd,
  converters: IConverterRegistry,
  data: IDataRegistry
): IDataBus {
  return new DataBus({
    converters,
    data
  });
}
