/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/
import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { ReactWidget } from '@jupyterlab/apputils';
import {
  createFileURL,
  fileURLConverter,
  IActiveDataset,
  IDataRegistry,
  IDataExplorer,
  resolveExtensionConverter,
  resolveFileConverter,
  URLDataType,
  widgetDataType
} from '@jupyterlab/dataregistry';
import { DirListing, IFileBrowserFactory } from '@jupyterlab/filebrowser';
import { MessageLoop } from '@phosphor/messaging';
import { PanelLayout, Widget } from '@phosphor/widgets';
import * as React from 'react';

// Copied from filebrowser because it isn't exposed there
// ./packages/filebrowser-extension/src/index.ts
const selectorNotDir = '.jp-DirListing-item[data-isdir="false"]';

const open = 'dataregistry:filebrowser-open';

/**
 * Integrates the dataregistry into the doc registry.
 */
export default {
  activate,
  id: '@jupyterlab/dataregistry-extension:files',
  requires: [IDataRegistry, IFileBrowserFactory, IDataExplorer, IActiveDataset],
  autoStart: true
} as JupyterFrontEndPlugin<void>;

function activate(
  app: JupyterFrontEnd,
  dataRegistry: IDataRegistry,
  fileBrowserFactory: IFileBrowserFactory,
  dataExplorer: IDataExplorer,
  active: IActiveDataset
) {
  // Add default converters
  dataRegistry.converters.register(resolveFileConverter);
  dataRegistry.converters.register(
    resolveExtensionConverter('.csv', 'text/csv')
  );
  dataRegistry.converters.register(
    resolveExtensionConverter('.png', 'image/png')
  );
  dataRegistry.converters.register(
    URLDataType.createSingleTypedConverter(widgetDataType, mimeType => {
      if (mimeType !== 'image/png') {
        return null;
      }
      return [
        'Image',
        async (url: URL | string) => async () =>
          ReactWidget.create(<img src={url.toString()} />)
      ];
    })
  );
  dataRegistry.converters.register(
    fileURLConverter(
      async (path: string) =>
        new URL(
          await fileBrowserFactory.defaultBrowser.model.manager.services.contents.getDownloadUrl(
            path
          )
        )
    )
  );

  // Register right click on file menu.
  app.contextMenu.addItem({
    command: open,
    selector: selectorNotDir,
    rank: 2.1 // right after open with
  });

  /**
   * Returns the URL of the first selected file, as a `file:///{path}`.
   */
  function getURL(): URL | null {
    const widget = fileBrowserFactory.tracker.currentWidget;
    if (!widget) {
      return null;
    }
    const model = widget.selectedItems().next();
    if (!model) {
      return null;
    }
    return createFileURL(model.path);
  }

  app.commands.addCommand(open, {
    execute: async () => {
      const url = getURL();
      if (url === null || !dataRegistry.hasConversions(url)) {
        return;
      }
      dataRegistry.registerURL(url);
      app.shell.activateById(dataExplorer.id);
      active.active = url;
    },
    isEnabled: () => {
      const url = getURL();
      return url !== null && dataRegistry.hasConversions(url);
    },
    label: 'Register Dataset',
    iconClass: 'jp-MaterialIcon jp-??'
  });

  const layout = fileBrowserFactory.defaultBrowser.layout;
  // If our default filebrowser has a panel layout
  if (layout && layout instanceof PanelLayout) {
    for (const widget of layout.widgets) {
      // And the panel layout has a `DirListing` as a child
      if (widget instanceof DirListing) {
        // Then listen to update request messages and change the active URL.
        MessageLoop.installMessageHook(widget, (sender, message) => {
          if (message === Widget.Msg.UpdateRequest) {
            active.active = getURL();
          }

          // Invoke other handlers
          return true;
        });
      }
    }
  }
}
