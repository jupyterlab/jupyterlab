/*-----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin,
  ILayoutRestorer
} from '@jupyterlab/application';

import {
  ICommandPalette,
  MainAreaWidget,
  WidgetTracker
} from '@jupyterlab/apputils';

import { IMainMenu } from '@jupyterlab/mainmenu';

import {
  IOutputLogRegistry,
  OutputLogRegistry
} from '@jupyterlab/outputconsole';
import { OutputLoggerView } from '@jupyterlab/outputconsole/src';
import { UUID } from '@phosphor/coreutils';
import { DocumentRegistry } from '@jupyterlab/docregistry';

/**
 * The Output Log extension.
 */
const outputLogPlugin: JupyterFrontEndPlugin<IOutputLogRegistry> = {
  activate: activateOutputLog,
  id: '@jupyterlab/outputconsole-extension:plugin',
  provides: IOutputLogRegistry,
  requires: [IOutputLogRegistry],
  optional: [IMainMenu, ICommandPalette, ILayoutRestorer],
  autoStart: true
};

/**
 * Activate the Output Log extension.
 */
function activateOutputLog(
  app: JupyterFrontEnd,
  mainMenu: IMainMenu | null,
  palette: ICommandPalette | null,
  restorer: ILayoutRestorer | null
): IOutputLogRegistry {
  const logRegistry = new OutputLogRegistry();

  // Track and restore the widget state
  let tracker = new WidgetTracker<MainAreaWidget<OutputLoggerView>>({
    namespace: 'output_logger'
  });

  const command = 'outputlogger:open';
  if (restorer) {
    void restorer.restore(tracker, {
      command,
      name: () => 'output_logger'
    });
  }

  // Add a command which shows a viewer for a particular source
  app.commands.addCommand(command, {
    label: 'Output Console',
    execute: (args: any) => {
      const {
        source,
        openOptions
      }: {
        source: string;
        openOptions?: DocumentRegistry.IOpenOptions;
      } = args;
      const logger = logRegistry.getLogger(source);
      // Create a new widget if one does not exist
      const content = new OutputLoggerView(logger);
      const widget = new MainAreaWidget({ content });
      widget.id = UUID.uuid4();
      widget.title.label = `Output Log for ${source}`;
      widget.title.closable = true;

      if (!tracker.has(widget)) {
        // Track the state of the widget for later restoration
        void tracker.add(widget);
      }

      // Attach the widget to the main work area if it's not there
      app.shell.add(widget, 'main', openOptions);
      widget.update();
    }
  });

  // In the notebook package, add a command which shows the viewer for the current notebook
  return logRegistry;
}

export default outputLogPlugin;
