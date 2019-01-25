/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import { JupyterLab, JupyterLabPlugin } from '@jupyterlab/application';
import {
  createDataExplorer,
  IConverterRegistry,
  IDataExplorer,
  IDataRegistry
} from '@jupyterlab/databus';

const id = '@jupyterlab/databus-extension:data-explorer';
/**
 * Adds a visual data explorer to the sidebar.
 */
export default {
  activate,
  id,
  requires: [IDataRegistry, IConverterRegistry],
  provides: IDataExplorer,
  autoStart: true
} as JupyterLabPlugin<IDataExplorer>;

function activate(
  app: JupyterLab,
  dataRegistry: IDataRegistry,
  converterRegistry: IConverterRegistry
): IDataExplorer {
  const widget = createDataExplorer({ dataRegistry, converterRegistry });
  app.shell.addToLeftArea(widget);
  return widget;
}
