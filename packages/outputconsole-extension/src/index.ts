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
  MainAreaWidget,
  WidgetTracker,
  ICommandPalette
} from '@jupyterlab/apputils';

import { DocumentRegistry } from '@jupyterlab/docregistry';

import { INotebookTracker, NotebookPanel } from '@jupyterlab/notebook';

import {
  IOutputLogRegistry,
  OutputLoggerView,
  OutputLogRegistry
} from '@jupyterlab/outputconsole';
import { KernelMessage } from '@jupyterlab/services';
import { nbformat } from '@jupyterlab/coreutils';

/**
 * The Output Log extension.
 */
const outputLogPlugin: JupyterFrontEndPlugin<IOutputLogRegistry> = {
  activate: activateOutputLog,
  id: '@jupyterlab/outputconsole-extension:plugin',
  provides: IOutputLogRegistry,
  requires: [],
  optional: [ILayoutRestorer],
  autoStart: true
};

/**
 * Activate the Output Log extension.
 */
function activateOutputLog(
  app: JupyterFrontEnd,
  restorer: ILayoutRestorer | null
): IOutputLogRegistry {
  const logRegistry = new OutputLogRegistry();

  let command = 'outputconsole:open';

  let tracker = new WidgetTracker<MainAreaWidget<OutputLoggerView>>({
    namespace: 'outputlogger'
  });
  if (restorer) {
    void restorer.restore(tracker, {
      command,
      args: obj => ({ source: obj.content.logger.source }),
      name: () => 'outputLogger'
    });
  }

  app.commands.addCommand(command, {
    label: (args: any) => `Output Log for ${args.source}`,
    execute: (args: any) => {
      const source: string = args.source;
      const openOptions: DocumentRegistry.IOpenOptions = args.openOptions;
      let widget = tracker.find(w => w.content.logger.source === source);
      if (!widget) {
        const log = logRegistry.getLogger(source);
        if (!log) {
          console.error(`Could not find log for ${source}`);
          return;
        }
        const logview = new OutputLoggerView(log);
        widget = new MainAreaWidget({ content: logview });
        app.shell.add(widget, 'main', openOptions);
        void tracker.add(widget);
        widget.update();
      }
      app.shell.activateById(widget.id);
    }
  });

  return logRegistry;
  // The notebook can call this command.
  // When is the output model disposed?
}

/**
 * The Output Log extension.
 */
const nblogger: JupyterFrontEndPlugin<void> = {
  activate: (
    app: JupyterFrontEnd,
    logger: IOutputLogRegistry,
    nbtracker: INotebookTracker,
    palette: ICommandPalette
  ) => {
    nbtracker.widgetAdded.connect(
      (sender: INotebookTracker, nb: NotebookPanel) => {
        let disposer = palette.addItem({
          command: 'outputconsole:open',
          args: { source: nb.context.path },
          category: 'Output Log'
        });
        nb.context.disposed.connect(() => disposer.dispose());
        nb.context.session.iopubMessage.connect(
          (_, msg: KernelMessage.IIOPubMessage) => {
            if (
              KernelMessage.isDisplayDataMsg(msg) ||
              KernelMessage.isStreamMsg(msg) ||
              KernelMessage.isErrorMsg(msg)
            ) {
              const log = logger.getLogger(nb.context.path);
              log.log((msg as unknown) as nbformat.IOutput);
              log.rendermime = nb.content.rendermime;
            }
          }
        );
      }
    );
  },
  id: '@jupyterlab/outputconsole-extension:nblogger',
  requires: [IOutputLogRegistry, INotebookTracker, ICommandPalette],
  autoStart: true
};

export default [outputLogPlugin, nblogger];
