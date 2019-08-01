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

import { DebuggerSidebar } from './sidebar';

import { IDebugger } from './tokens';

/**
 * The command IDs used by the debugger plugin.
 */
export namespace CommandIDs {
  export const create = 'debugger:create';
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
  requires: [IDebugger],
  optional: [IEditorTracker],
  activate: (_, debug, tracker: IEditorTracker | null) => {
    if (!tracker) {
      console.log(`${files.id} load failed. There is no files tracker.`);
      return;
    }
    console.log(`${files.id} has not been implemented.`, debug);
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
const sidebar: JupyterFrontEndPlugin<void> = {
  id: '@jupyterlab/debugger:plugin',
  optional: [ILayoutRestorer],
  autoStart: true,
  activate: (app: JupyterFrontEnd, restorer: ILayoutRestorer | null) => {
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
  }
};

/**
 * A plugin providing a tracker code debuggers.
 */
const tracker: JupyterFrontEndPlugin<IDebugger> = {
  id: '@jupyterlab/debugger:plugin',
  optional: [ILayoutRestorer],
  requires: [IStateDB],
  provides: IDebugger,
  autoStart: true,
  activate: (
    app: JupyterFrontEnd,
    state: IStateDB,
    restorer: ILayoutRestorer | null
  ): IDebugger => {
    const tracker = new WidgetTracker<MainAreaWidget<Debugger>>({
      namespace: 'debugger'
    });

    app.commands.addCommand(CommandIDs.create, {
      execute: args => {
        const id = (args.id as string) || '';

        if (tracker.find(widget => id === widget.content.model.id)) {
          return;
        }

        const widget = new Debugger({ connector: state, id });

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
