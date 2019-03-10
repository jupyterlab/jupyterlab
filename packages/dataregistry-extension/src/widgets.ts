/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import {
  ILayoutRestorer,
  JupyterFrontEnd,
  JupyterFrontEndPlugin,
  ILabShell
} from '@jupyterlab/application';
import { InstanceTracker } from '@jupyterlab/apputils';
import {
  extractWidgetArgs,
  IDataRegistry,
  widgetViewerConverter,
  wrapWidgetConverter
} from '@jupyterlab/dataregistry';
import { Widget } from '@phosphor/widgets';

const tracker = new InstanceTracker({ namespace: 'dataregistry' });
const commandID = 'dataregistry:view-url';

export default {
  activate,
  id: '@jupyterlab/dataregistry-extension:widgets',
  requires: [ILabShell, IDataRegistry, ILayoutRestorer],
  autoStart: true
} as JupyterFrontEndPlugin<void>;

function activate(
  app: JupyterFrontEnd,
  labShell: ILabShell,
  dataRegistry: IDataRegistry,
  restorer: ILayoutRestorer
) {
  dataRegistry.converters.register(wrapWidgetConverter);
  dataRegistry.converters.register(
    widgetViewerConverter(async (widget: Widget) => {
      if (!tracker.has(widget)) {
        await tracker.add(widget);
      }
      if (!widget.isAttached) {
        labShell.add(widget, 'main');
      }
      app.shell.activateById(widget.id);
    })
  );

  app.commands.addCommand(commandID, {
    execute: async args => {
      const url = new URL(args.url as string);
      const disposable = dataRegistry.registerURL(url);
      try {
        await dataRegistry.viewURL(url, args.label as string);
      } catch (e) {
        console.warn(`Could not load dataset ${url}`, e);
        if (disposable) {
          disposable.dispose();
        }
      }
    },
    label: args => `${args.label} ${args.url}`
  });

  restorer.restore(tracker, {
    name: (widget: Widget) => widget.id,
    command: commandID,
    args: extractWidgetArgs
  });
}
