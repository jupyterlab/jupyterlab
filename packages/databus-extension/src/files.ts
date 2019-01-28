/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import { JupyterLab, JupyterLabPlugin } from '@jupyterlab/application';
import {
  IConverterRegistry,
  IDataExplorer,
  IDataRegistry,
  IFileExtensionRegistry,
  IResolverRegistry,
  FileResolver,
  FileExtensionRegistry
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
  provides: IFileExtensionRegistry,
  autoStart: true
} as JupyterLabPlugin<IFileExtensionRegistry>;

function activate(
  app: JupyterLab,
  dataRegistry: IDataRegistry,
  converterRegistry: IConverterRegistry,
  dataExplorer: IDataExplorer,
  factory: IFileBrowserFactory,
  resolverRegistry: IResolverRegistry
): IFileExtensionRegistry {
  const fileExtensionRegistry = new FileExtensionRegistry();
  fileExtensionRegistry.register('.csv', 'text/csv');

  resolverRegistry.register(
    new FileResolver({
      fileExtensionRegistry,
      resolveURL: async (path: string) =>
        new URL(
          await factory.defaultBrowser.model.manager.services.contents.getDownloadUrl(
            path
          )
        )
    })
  );
  app.contextMenu.addItem({
    command: open,
    selector: selectorNotDir,
    rank: 2.1 // right after open with
  });

  function getPath(): string | null {
    const widget = factory.tracker.currentWidget;
    if (!widget) {
      return null;
    }
    return widget.selectedItems().next().path;
  }
  app.commands.addCommand(open, {
    execute: async () => {
      const path = getPath();
      if (path === null) {
        return;
      }
      const url = new URL('file:');
      url.pathname = path;
      const dataset = await resolverRegistry.resolve(url);
      if (dataset === null) {
        return;
      }
      dataRegistry.publish(dataset);
      app.shell.activateById(dataExplorer.id);
      dataExplorer.reveal(dataset);
    },
    isEnabled: () => {
      const path = getPath();
      return path && fileExtensionRegistry.whichMimeType(path) !== null;
    },
    label: 'Open as Dataset',
    iconClass: 'jp-MaterialIcon jp-??'
  });
  return fileExtensionRegistry;
}
