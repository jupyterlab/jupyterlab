/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import { JupyterLab, JupyterLabPlugin } from '@jupyterlab/application';
import {
  IDataExplorer,
  IDataBus,
  createFileURL,
  resolveFileConverter,
  fileURLConverter,
  resolveMimeType
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
  dataBus.converters.register(resolveFileConverter('.csv', 'text/csv'));
  dataBus.converters.register(
    fileURLConverter(
      async (path: string) =>
        new URL(
          await fileBrowserFactory.defaultBrowser.model.manager.services.contents.getDownloadUrl(
            path
          )
        )
    )
  );

  /**
   * Register right click on file menu.
   */
  app.contextMenu.addItem({
    command: open,
    selector: selectorNotDir,
    rank: 2.1 // right after open with
  });

  function getURL(): URL | null {
    const widget = fileBrowserFactory.tracker.currentWidget;
    if (!widget) {
      return null;
    }
    const path = widget.selectedItems().next()!.path;
    const url = createFileURL(path);
    if (
      dataBus.converters.listTargetMimeTypes([resolveMimeType(url)]).size <= 1
    ) {
      return null;
    }

    return url;
  }
  app.commands.addCommand(open, {
    execute: async () => {
      const url = getURL();
      if (url === null) {
        return;
      }
      dataBus.registerURL(url);
      app.shell.activateById(dataExplorer.id);
      dataExplorer.reveal(url);
    },
    isEnabled: () => {
      return getURL() !== null;
    },
    label: 'Open as Dataset',
    iconClass: 'jp-MaterialIcon jp-??'
  });
}
