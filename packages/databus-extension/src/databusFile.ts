/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { IDataBus, IDataExplorer } from '@jupyterlab/databus';
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
  id: '@jupyterlab/databus-extension:databus-file',
  requires: [IDataBus, IDocumentManager, IDataExplorer],
  autoStart: true
} as JupyterFrontEndPlugin<void>;

function activate(
  app: JupyterFrontEnd,
  dataBus: IDataBus,
  docManager: IDocumentManager,
  explorer: IDataExplorer
) {
  docManager.registry.addWidgetFactory(
    new DataBusFileFactory(dataBus, explorer)
  );
}

// TODO: Move this out of extension
type DataBusFile = {
  version: string;
  datasets: Array<{ url: string }>;
};

class DataBusFileFactory extends ABCWidgetFactory<IDocumentWidget<Widget>> {
  constructor(private dataBus: IDataBus, private explorer: IDataExplorer) {
    super({
      name: 'DataBus',
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
      const file: DataBusFile = yaml.safeLoad(text);
      if (file.version !== '1') {
        throw `Version "${file.version}" not supported in databus.yml file`;
      }
      for (const { url } of file.datasets) {
        this.dataBus.registerURL(new URL(url));
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
