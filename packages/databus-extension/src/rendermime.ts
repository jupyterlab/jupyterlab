import { IRenderMimeRegistry } from '@jupyterlab/rendermime';

/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import { JupyterLab, JupyterLabPlugin } from '@jupyterlab/application';
import {
  createRenderMimeFactory,
  IDataRegistry,
  Dataset,
  IDataExplorer
} from '@jupyterlab/databus';

export default {
  activate,
  id: '@jupyterlab/databus-extension:rendermime',
  requires: [IRenderMimeRegistry, IDataRegistry, IDataExplorer],
  autoStart: true
} as JupyterLabPlugin<void>;

function activate(
  app: JupyterLab,
  rendermime: IRenderMimeRegistry,
  data: IDataRegistry,
  dataExplorer: IDataExplorer
) {
  rendermime.addFactory(
    createRenderMimeFactory(async (dataset: Dataset<any>) => {
      data.publish(dataset);
      app.shell.activateById(dataExplorer.id);
      dataExplorer.reveal(dataset.url);
    })
  );
}
