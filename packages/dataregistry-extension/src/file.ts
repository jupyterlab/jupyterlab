/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { IDataRegistry, IDataExplorer } from '@jupyterlab/dataregistry';
import { IDocumentManager } from '@jupyterlab/docmanager';
import {
  ABCWidgetFactory,
  DocumentRegistry,
  DocumentWidget,
  IDocumentWidget
} from '@jupyterlab/docregistry';
import { Widget } from '@phosphor/widgets';
import * as yaml from 'js-yaml';

export default {
  activate,
  id: '@jupyterlab/dataregistry-extension:file',
  requires: [IDataRegistry, IDocumentManager, IDataExplorer],
  autoStart: true
} as JupyterFrontEndPlugin<void>;

function activate(
  app: JupyterFrontEnd,
  dataRegistry: IDataRegistry,
  docManager: IDocumentManager,
  explorer: IDataExplorer
) {
  docManager.registry.addWidgetFactory(
    new DataRegistryFileFactory(dataRegistry, explorer)
  );
}

// TODO: Move this out of extension
type DataRegistryFile = {
  version: string;
  datasets: Array<{ url: string }>;
};

class DataRegistryFileFactory extends ABCWidgetFactory<
  IDocumentWidget<Widget>
> {
  constructor(
    private dataRegistry: IDataRegistry,
    private explorer: IDataExplorer
  ) {
    super({
      name: 'DataRegistry',
      fileTypes: ['yaml'],
      defaultFor: ['yaml']
    });
  }
  protected createNewWidget(
    context: DocumentRegistry.IContext<DocumentRegistry.IModel>
  ): IDocumentWidget<Widget> {
    context.model.contentChanged.connect(() => {
      const text = context.model.toString();
      if (!text) {
        // Not loaded yet.
        return;
      }
      const file: DataRegistryFile = yaml.safeLoad(text);
      if (file.version !== '1') {
        throw `Version "${
          file.version
        }" not supported in dataregistry.yml file`;
      }
      for (const { url } of file.datasets) {
        this.dataRegistry.registerURL(new URL(url));
      }
    });

    const widget = new DocumentWidget({ content: new Widget(), context });

    widget.revealed.then(() => {
      // Close widget opening
      widget.dispose();
      this.explorer.show();
    });

    return widget;
  }
}
