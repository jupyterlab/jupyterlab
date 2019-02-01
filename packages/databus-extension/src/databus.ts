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
import { IFileBrowserFactory } from '@jupyterlab/filebrowser';
import { Widget } from '@phosphor/widgets';

/**
 * The converter registry extension.
 */
export default {
  activate,
  id: '@jupyterlab/databus-extension:databus',
  requires: [IConverterRegistry, IDataRegistry, IFileBrowserFactory],
  provides: IDataBus,
  autoStart: true
} as JupyterLabPlugin<IDataBus>;

function activate(
  app: JupyterLab,
  converters: IConverterRegistry,
  data: IDataRegistry,
  fileBrowserFactory: IFileBrowserFactory
): IDataBus {
  return new DataBus(
    converters,
    data,
    async (path: string) =>
      new URL(
        await fileBrowserFactory.defaultBrowser.model.manager.services.contents.getDownloadUrl(
          path
        )
      ),
    async (widget: Widget) => {
      app.shell.addToMainArea(widget);
      app.shell.activateById(widget.id);
    }
  );
}
