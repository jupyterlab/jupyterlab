/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin,
  ILabShell,
  ILayoutRestorer
} from '@jupyterlab/application';
import {
  createDataExplorer,
  IDataExplorer,
  IDataBus,
  IActiveDataset
} from '@jupyterlab/databus';

const id = '@jupyterlab/databus-extension:data-explorer';
/**
 * Adds a visual data explorer to the sidebar.
 */
export default {
  activate,
  id,
  requires: [ILabShell, IDataBus, ILayoutRestorer, IActiveDataset],
  provides: IDataExplorer,
  autoStart: true
} as JupyterFrontEndPlugin<IDataExplorer>;

function activate(
  app: JupyterFrontEnd,
  labShell: ILabShell,
  dataBus: IDataBus,
  restorer: ILayoutRestorer,
  active: IActiveDataset
): IDataExplorer {
  const widget = createDataExplorer(dataBus, active);
  restorer.add(widget, widget.id);
  labShell.add(widget, 'left');
  return widget;
}
