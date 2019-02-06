/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import {
  JupyterLab,
  JupyterLabPlugin,
  ILayoutRestorer
} from '@jupyterlab/application';
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
  requires: [IDataBus, ILayoutRestorer],
  provides: IDataExplorer,
  autoStart: true
} as JupyterLabPlugin<IDataExplorer>;

function activate(
  app: JupyterLab,
  dataBus: IDataBus,
  restorer: ILayoutRestorer
): IDataExplorer {
  const widget = createDataExplorer(dataBus);
  restorer.add(widget, widget.id);
  app.shell.addToLeftArea(widget);
  return widget;
}
