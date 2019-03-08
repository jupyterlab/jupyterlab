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
  IDataRegistry,
  IActiveDataset
} from '@jupyterlab/dataregistry';

const id = '@jupyterlab/dataregistry-extension:data-explorer';
/**
 * Adds a visual data explorer to the sidebar.
 */
export default {
  activate,
  id,
  requires: [ILabShell, IDataRegistry, ILayoutRestorer, IActiveDataset],
  provides: IDataExplorer,
  autoStart: true
} as JupyterFrontEndPlugin<IDataExplorer>;

function activate(
  app: JupyterFrontEnd,
  labShell: ILabShell,
  dataRegistry: IDataRegistry,
  restorer: ILayoutRestorer,
  active: IActiveDataset
): IDataExplorer {
  const widget = createDataExplorer(dataRegistry, active);
  restorer.add(widget, widget.id);
  labShell.add(widget, 'left');
  return widget;
}
