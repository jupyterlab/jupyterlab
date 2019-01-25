/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import { JupyterLab, JupyterLabPlugin } from '@jupyterlab/application';
import {
  IConverterRegistry,
  IDataExplorer,
  IDataRegistry,
  IResolverRegistry,
  FileResolver
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
  requires: [
    IDataRegistry,
    IConverterRegistry,
    IDataExplorer,
    IFileBrowserFactory,
    IResolverRegistry
  ],
  autoStart: true
} as JupyterLabPlugin<void>;

function activate(
  app: JupyterLab,
  dataRegistry: IDataRegistry,
  converterRegistry: IConverterRegistry,
  dataExplorer: IDataExplorer,
  factory: IFileBrowserFactory,
  resolverRegistry: IResolverRegistry
): void {
  const fileResolver = new FileResolver((path: string) =>
    factory.defaultBrowser.model.manager.services.contents.getDownloadUrl(path)
  );
  fileResolver.register('.csv', 'text/csv');
  resolverRegistry.register(fileResolver);
  app.contextMenu.addItem({
    command: open,
    selector: selectorNotDir,
    rank: 2.1 // right after open with
  });

  app.commands.addCommand(open, {
    execute: async () => {
      const widget = factory.tracker.currentWidget;
      if (!widget) {
        return;
      }
      const path = widget.selectedItems().next().path;
      const dataset = await resolverRegistry.resolve(`file://${path}`);
      if (dataset === null) {
        return;
      }
      dataRegistry.publish(dataset);
      app.shell.activateById(dataExplorer.id);
      dataExplorer.reveal(dataset);
    },
    isEnabled: () => {
      const widget = factory.tracker.currentWidget;
      if (!widget) {
        return;
      }
      const path = widget.selectedItems().next().path;
      return fileResolver.whichMimeType(path) !== null;
    },
    label: 'Open as Dataset',
    iconClass: 'jp-MaterialIcon jp-??'
  });
}
