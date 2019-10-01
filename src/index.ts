// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ILayoutRestorer,
  JupyterFrontEnd,
  JupyterFrontEndPlugin,
  LabShell
} from '@jupyterlab/application';

import { ICommandPalette } from '@jupyterlab/apputils';

import { WidgetTracker, MainAreaWidget } from '@jupyterlab/apputils';

import { IConsoleTracker, ConsolePanel } from '@jupyterlab/console';

import { IStateDB } from '@jupyterlab/coreutils';

import { IEditorTracker } from '@jupyterlab/fileeditor';

import { INotebookTracker, NotebookPanel } from '@jupyterlab/notebook';

import { Debugger } from './debugger';

import { IDebugger, IDebuggerSidebar } from './tokens';

import { DebuggerNotebookHandler } from './handlers/notebook';

import { DebuggerConsoleHandler } from './handlers/console';

import { DebuggerSidebar } from './sidebar';

import { SessionTypes } from './breakpoints';
import { DebugSession } from './session';

/**
 * The command IDs used by the debugger plugin.
 */
export namespace CommandIDs {
  export const create = 'debugger:create';

  export const debugConsole = 'debugger:debug-console';

  export const debugFile = 'debugger:debug-file';

  export const debugNotebook = 'debugger:debug-notebook';
}

/**
 * A plugin that provides visual debugging support for consoles.
 */
const consoles: JupyterFrontEndPlugin<void> = {
  id: '@jupyterlab/debugger:consoles',
  autoStart: true,
  requires: [IDebugger, IDebuggerSidebar, IConsoleTracker],
  activate: (
    _,
    debug: IDebugger,
    sidebar: IDebuggerSidebar,
    tracker: IConsoleTracker
  ) => {
    debug.currentChanged.connect((_, update) => {
      update.content.model.sidebar = sidebar;
      new DebuggerConsoleHandler({
        debuggerModel: update.content.model,
        consoleTracker: tracker
      });
    });
  }
};

/**
 * A plugin that provides visual debugging support for file editors.
 */
const files: JupyterFrontEndPlugin<void> = {
  id: '@jupyterlab/debugger:files',
  autoStart: true,
  requires: [IEditorTracker, IDebugger],
  activate: (
    app: JupyterFrontEnd,
    tracker: IEditorTracker | null,
    debug: IDebugger
  ) => {
    const shell = app.shell;
    (shell as LabShell).currentChanged.connect((sender, update) => {
      const newWidget = update.newValue;
      const session =
        newWidget && (newWidget as NotebookPanel | ConsolePanel).session
          ? (newWidget as NotebookPanel | ConsolePanel).session
          : false;
      if (session && debug.currentWidget) {
        const debugModel: Debugger.Model = debug.currentWidget.content.model;
        debugModel.session = new DebugSession({ client: session });
        debugModel.sidebar.breakpoints.model.type = session.type as SessionTypes;
      }
    });

    app.commands.addCommand(CommandIDs.debugFile, {
      execute: async _ => {
        if (!tracker || !tracker.currentWidget) {
          return;
        }
        if (tracker.currentWidget) {
          // TODO: Find if the file is backed by a kernel or attach it to one.
          // const widget = await app.commands.execute(CommandIDs.create);
          // app.shell.add(widget, 'main');
        }
      }
    });
  }
};

/**
 * A plugin that provides visual debugging support for notebooks.
 */
const notebooks: JupyterFrontEndPlugin<void> = {
  id: '@jupyterlab/debugger:notebooks',
  autoStart: true,
  requires: [IDebugger, IDebuggerSidebar],
  optional: [INotebookTracker, ICommandPalette],
  activate: (
    app: JupyterFrontEnd,
    debug: IDebugger,
    sidebar: IDebuggerSidebar,
    notebook: INotebookTracker,
    palette: ICommandPalette
  ) => {
    // 1. Keep track of any new notebook that is created.
    // 2. When the *active* notebook changes, hook it up to the debugger.
    // 3. If a notebook is closed, dispose the debugger session.

    debug.currentChanged.connect((_, update) => {
      update.content.model.sidebar = sidebar;
      new DebuggerNotebookHandler({
        debuggerModel: update.content.model,
        notebookTracker: notebook
      });
    });

    //   // Debugger model:
    //   // LIST of editors that it currently cares about.
    //   // Manages life cycle signal connections.
    //   // Manages variables
    // });

    // this exist only for my test in futre will be removed
    const command: string = CommandIDs.debugNotebook;
    app.commands.addCommand(command, {
      label: 'test',
      execute: () => {}
    });

    palette.addItem({ command, category: 'dev test' });
  }
};

/**
 * A plugin providing a condensed sidebar UI for debugging.
 */
const sidebar: JupyterFrontEndPlugin<IDebuggerSidebar> = {
  id: '@jupyterlab/debugger:sidebar',
  optional: [ILayoutRestorer],
  provides: IDebuggerSidebar,
  autoStart: true,
  activate: (
    app: JupyterFrontEnd,
    restorer: ILayoutRestorer | null
  ): DebuggerSidebar => {
    const { shell } = app;
    const label = 'Environment';
    const namespace = 'jp-debugger-sidebar';
    const sidebar = new DebuggerSidebar(null);
    sidebar.id = namespace;
    sidebar.title.label = label;
    shell.add(sidebar, 'right', { activate: false });
    if (restorer) {
      restorer.add(sidebar, sidebar.id);
    }

    return sidebar;
  }
};

/**
 * A plugin providing a tracker code debuggers.
 */
const tracker: JupyterFrontEndPlugin<IDebugger> = {
  id: '@jupyterlab/debugger:tracker',
  optional: [ILayoutRestorer, IDebuggerSidebar, ICommandPalette],
  requires: [IStateDB],
  provides: IDebugger,
  autoStart: true,
  activate: (
    app: JupyterFrontEnd,
    state: IStateDB,
    restorer: ILayoutRestorer | null,
    sidebar: IDebuggerSidebar | null,
    palette: ICommandPalette
  ): IDebugger => {
    const tracker = new WidgetTracker<MainAreaWidget<Debugger>>({
      namespace: 'debugger'
    });

    tracker.widgetUpdated.connect((_, update) => {
      update;
    });

    const command = CommandIDs.create;

    app.commands.addCommand(command, {
      label: 'Debugger',
      execute: args => {
        const id = (args.id as string) || '';
        if (id) {
          console.log('Debugger ID: ', id);
        }

        if (tracker.find(widget => id === widget.content.model.id)) {
          return;
        }

        const widget = new MainAreaWidget({
          content: new Debugger({
            connector: state,
            id: id
          })
        });

        void tracker.add(widget);

        return widget;
      }
    });

    palette.addItem({ command, category: 'Debugger' });

    if (restorer) {
      // Handle state restoration.
      void restorer.restore(tracker, {
        command: command,
        args: widget => ({ id: widget.content.model.id }),
        name: widget => widget.content.model.id
      });
    }

    return tracker;
  }
};

/**
 * Export the plugins as default.
 */

const plugins: JupyterFrontEndPlugin<any>[] = [
  consoles,
  files,
  notebooks,
  sidebar,
  tracker
];

export default plugins;
