/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import { JupyterLab, JupyterLabPlugin } from '@jupyterlab/application';
import {
  IDataExplorer,
  IDataBus,
  createFileDataSet,
  Dataset
} from '@jupyterlab/databus';
import { IFileBrowserFactory } from '@jupyterlab/filebrowser';

// Copied from filebrowser because it isn't exposed there
// ./packages/filebrowser-extension/src/index.ts
const selectorNotDir = '.jp-DirListing-item[data-isdir="false"]';

const open = 'databus:filebrowser-open';

/**
 * Integrates the databus into the doc registry.
 */
export default {
  activate,
  id: '@jupyterlab/databus-extension:files',
  requires: [IDataBus, IFileBrowserFactory, IDataExplorer],
  autoStart: true
} as JupyterLabPlugin<void>;

function activate(
  app: JupyterLab,
  dataBus: IDataBus,
  fileBrowserFactory: IFileBrowserFactory,
  dataExplorer: IDataExplorer
) {
  dataBus.registerFileResolver('.csv', 'text/csv');

  app.contextMenu.addItem({
    command: open,
    selector: selectorNotDir,
    rank: 2.1 // right after open with
  });

  function getDataSet(): Dataset<null> | null {
    const widget = fileBrowserFactory.tracker.currentWidget;
    if (!widget) {
      return null;
    }
    const path = widget.selectedItems().next().path;
    const dataset = createFileDataSet(path);
    if (!dataBus.validFileDataSet(dataset)) {
      return null;
    }
    return dataset;
  }
  app.commands.addCommand(open, {
    execute: async () => {
      const dataset = getDataSet();
      if (dataset === null) {
        return;
      }
      dataBus.data.publish(dataset);
      app.shell.activateById(dataExplorer.id);
      dataExplorer.reveal(dataset);
    },
    isEnabled: () => {
      return getDataSet() !== null;
    },
    label: 'Open as Dataset',
    iconClass: 'jp-MaterialIcon jp-??'
  });
}
