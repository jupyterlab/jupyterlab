/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import {
  JupyterLab,
  JupyterLabPlugin,
  ILayoutRestorer
} from '@jupyterlab/application';
import {
  DataBus,
  IConverterRegistry,
  IDataBus,
  IDataRegistry,
  extractArgs
} from '@jupyterlab/databus';
import { IFileBrowserFactory } from '@jupyterlab/filebrowser';
import { Widget } from '@phosphor/widgets';
import { InstanceTracker } from '@jupyterlab/apputils';

/**
 * The converter registry extension.
 */
export default {
  activate,
  id: '@jupyterlab/databus-extension:databus',
  requires: [
    IConverterRegistry,
    IDataRegistry,
    IFileBrowserFactory,
    ILayoutRestorer
  ],
  provides: IDataBus,
  autoStart: true
} as JupyterLabPlugin<IDataBus>;

function activate(
  app: JupyterLab,
  converters: IConverterRegistry,
  data: IDataRegistry,
  fileBrowserFactory: IFileBrowserFactory,
  restorer: ILayoutRestorer
): IDataBus {
  const tracker = new InstanceTracker({ namespace: 'databus' });
  const databus = new DataBus(
    converters,
    data,
    async (path: string) =>
      new URL(
        await fileBrowserFactory.defaultBrowser.model.manager.services.contents.getDownloadUrl(
          path
        )
      ),
    async (widget: Widget) => {
      if (!tracker.has(widget)) {
        await tracker.add(widget);
      }
      if (!widget.isAttached) {
        app.shell.addToMainArea(widget);
      }
      app.shell.activateById(widget.id);
    }
  );

  const commandID = 'databus:view-url';
  app.commands.addCommand(commandID, {
    execute: async args => {
      await databus.viewURL(new URL(args.url as string), args.label as string);
    },
    label: args => `${args.label} ${args.url}`
  });

  restorer.restore(tracker, {
    name: (widget: Widget) => widget.id,
    command: commandID,
    args: extractArgs
  });

  return databus;
}
