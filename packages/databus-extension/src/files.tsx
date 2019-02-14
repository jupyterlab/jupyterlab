/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/
import * as React from 'react';

import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import {
  IDataExplorer,
  IDataBus,
  createFileURL,
  resolveExtensionConverter,
  fileURLConverter,
  resolveMimeType,
  IActiveDataset,
  staticWidgetConverter,
  URLMimeType,
  resolveFileConverter
} from '@jupyterlab/databus';
import { IFileBrowserFactory } from '@jupyterlab/filebrowser';
import { ReactWidget } from '@jupyterlab/apputils';

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
  requires: [IDataBus, IFileBrowserFactory, IDataExplorer, IActiveDataset],
  autoStart: true
} as JupyterFrontEndPlugin<void>;

function activate(
  app: JupyterFrontEnd,
  dataBus: IDataBus,
  fileBrowserFactory: IFileBrowserFactory,
  dataExplorer: IDataExplorer,
  active: IActiveDataset
) {
  dataBus.converters.register(resolveFileConverter);
  dataBus.converters.register(resolveExtensionConverter('.csv', 'text/csv'));
  dataBus.converters.register(resolveExtensionConverter('.png', 'image/png'));
  dataBus.converters.register(
    staticWidgetConverter({
      mimeType: URLMimeType('image/png'),
      label: 'Image',
      convert: async (url: URL | string) =>
        ReactWidget.create(<img src={url.toString()} />)
    })
  );
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
      dataBus.converters.listTargetMimeTypes(url, [resolveMimeType]).size <= 1
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
      active.active = url;
    },
    isEnabled: () => {
      return getURL() !== null;
    },
    label: 'Open as Dataset',
    iconClass: 'jp-MaterialIcon jp-??'
  });
}
