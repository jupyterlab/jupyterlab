import { IRenderMimeRegistry } from '@jupyterlab/rendermime';

/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import {
  createRenderMimeFactory,
  IDatasetRegistry,
  Dataset,
  IDataExplorer,
  IActiveDataset
} from '@jupyterlab/dataregistry';

export default {
  activate,
  id: '@jupyterlab/dataregistry-extension:rendermime',
  requires: [
    IRenderMimeRegistry,
    IDatasetRegistry,
    IDataExplorer,
    IActiveDataset
  ],
  autoStart: true
} as JupyterFrontEndPlugin<void>;

function activate(
  app: JupyterFrontEnd,
  rendermime: IRenderMimeRegistry,
  data: IDatasetRegistry,
  dataExplorer: IDataExplorer,
  active: IActiveDataset
) {
  rendermime.addFactory(
    createRenderMimeFactory(async (datasets: Array<Dataset<any>>) => {
      for (const dataset of datasets) {
        data.publish(dataset);
        active.active = dataset.url;
      }
      app.shell.activateById(dataExplorer.id);
    })
  );
}
