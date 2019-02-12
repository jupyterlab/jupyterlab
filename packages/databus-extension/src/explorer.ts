/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import { JupyterLab, JupyterLabPlugin } from '@jupyterlab/application';
import {
  createDataExplorer,
  IDataExplorer,
  IDataBus
} from '@jupyterlab/databus';

const id = '@jupyterlab/databus-extension:data-explorer';
/**
 * Adds a visual data explorer to the sidebar.
 */
export default {
  activate,
  id,
  requires: [IDataBus],
  provides: IDataExplorer,
  autoStart: true
} as JupyterLabPlugin<IDataExplorer>;

function activate(app: JupyterLab, dataBus: IDataBus): IDataExplorer {
  const widget = createDataExplorer(dataBus);
  app.shell.addToLeftArea(widget);
  return widget;
}
