/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import { JupyterLab, JupyterLabPlugin } from '@jupyterlab/application';
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
} as JupyterLabPlugin<IDataBus>;

function activate(
  app: JupyterLab,
  converters: IConverterRegistry,
  data: IDataRegistry
): IDataBus {
  return new DataBus({
    converters,
    data
  });
}
