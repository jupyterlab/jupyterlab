// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ILayoutRestorer,
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { WidgetTracker, MainAreaWidget } from '@jupyterlab/apputils';

import { IConsoleTracker } from '@jupyterlab/console';

import { IStateDB } from '@jupyterlab/coreutils';

import { IEditorTracker } from '@jupyterlab/fileeditor';

import { INotebookTracker } from '@jupyterlab/notebook';

import { Debugger } from './debugger';

// import { DebuggerSidebar } from './sidebar';

import { IDebugger, IDebuggerSidebar } from './tokens';

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
  requires: [IDebugger],
  optional: [IConsoleTracker],
  activate: (_, debug, tracker: IConsoleTracker | null) => {
    if (!tracker) {
      console.log(`${consoles.id} load failed. There is no console tracker.`);
      return;
    }
    console.log(`${consoles.id} has not been implemented.`, debug);
  }
};

/**
 * A plugin that provides visual debugging support for file editors.
 */
const files: JupyterFrontEndPlugin<void> = {
  id: '@jupyterlab/debugger:files',
  autoStart: true,
  optional: [IEditorTracker],
  activate: (app: JupyterFrontEnd, tracker: IEditorTracker | null) => {
    app.commands.addCommand(CommandIDs.debugFile, {
      execute: async _ => {
        if (!tracker || !tracker.currentWidget) {
          return;
        }
        if (tracker.currentWidget) {
          // TODO: Find if the file is backed by a kernel or attach it to one.
          const widget = await app.commands.execute(CommandIDs.create);
          app.shell.add(widget, 'main');
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
  requires: [IDebugger],
  optional: [INotebookTracker],
  activate: (_, debug, tracker: INotebookTracker | null) => {
    if (!tracker) {
      console.log(`${notebooks.id} load failed. There is no notebook tracker.`);
      return;
    }
    console.log(`${notebooks.id} has not been implemented.`, debug);
  }
};

/**
 * A plugin providing a condensed sidebar UI for debugging.
 */
const sidebar: JupyterFrontEndPlugin<Debugger> = {
  id: '@jupyterlab/debugger:sidebar',
  optional: [ILayoutRestorer, INotebookTracker, IEditorTracker],
  autoStart: true,
  activate: (
    app: JupyterFrontEnd,
    restorer: ILayoutRestorer | null,
    notebookTracker: INotebookTracker,
    editorTracker: IEditorTracker
  ): Debugger => {
    const { shell } = app;
    const label = 'Environment';
    const namespace = 'jp-debugger-sidebar';
    const sidebar = new Debugger({
      notebook: notebookTracker,
      editor: editorTracker
    });

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
  optional: [ILayoutRestorer, IDebuggerSidebar, INotebookTracker],
  requires: [IStateDB],
  provides: IDebugger,
  autoStart: true,
  activate: (
    app: JupyterFrontEnd,
    state: IStateDB,
    restorer: ILayoutRestorer | null,
    sidebar: IDebuggerSidebar | null
  ): IDebugger => {
    const tracker = new WidgetTracker<MainAreaWidget<Debugger>>({
      namespace: 'debugger'
    });

    app.commands.addCommand(CommandIDs.create, {
      execute: args => {
        const id = (args.id as string) || '';
        console.log(id, 'hi');
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

    if (restorer) {
      // Handle state restoration.
      void restorer.restore(tracker, {
        command: CommandIDs.create,
        args: widget => ({ id: widget.content.model.id }),
        name: widget => widget.content.model.id
      });
    }

    if (sidebar) {
      tracker.currentChanged.connect((_, current) => {
        sidebar.model = current ? current.content.model : null;
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
const plugin: JupyterFrontEndPlugin<any> = plugins[3];
export default plugin;
