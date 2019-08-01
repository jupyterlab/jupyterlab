// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ILayoutRestorer,
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { IConsoleTracker } from '@jupyterlab/console';

import { IStateDB, IRestorable } from '@jupyterlab/coreutils';

import { IEditorTracker } from '@jupyterlab/fileeditor';

import { INotebookTracker } from '@jupyterlab/notebook';

import { Debugger } from './debugger';

import { IDebugger } from './tokens';

/**
 * A plugin providing a UI for code debugging and environment inspection.
 */
const plugin: JupyterFrontEndPlugin<IDebugger> = {
  id: '@jupyterlab/debugger:plugin',
  optional: [ILayoutRestorer],
  requires: [IStateDB],
  provides: IDebugger,
  autoStart: true,
  activate: async (
    app: JupyterFrontEnd,
    state: IStateDB,
    restorer: ILayoutRestorer | null
  ): Promise<IDebugger> => {
    const { shell } = app;
    const label = 'Environment';
    const namespace = 'jp-debugger';
    const restore: IRestorable.IOptions<IDebugger.ISession> = {
      command: 'debugger:restore',
      connector: state,
      name: _ => namespace,
      registry: app.commands
    };
    const debug = new Debugger({ namespace, restore });

    debug.id = namespace;
    debug.title.label = label;
    shell.add(debug, 'right', { activate: false });

    const command = app.commands.addCommand(restore.command, {
      execute: _ => {
        console.log('Disposing restore command');
        command.dispose();
      }
    });

    window.requestAnimationFrame(async () => {
      await debug.model.restored;
      console.log('WAITED FOR RESTORATION OF MODEL.');
    });

    if (restorer) {
      restorer.add(debug, debug.id);
    }

    return debug.model;
  }
};

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
 * Export the plugins as default.
 */
const plugins: JupyterFrontEndPlugin<any>[] = [
  consoles,
  files,
  notebooks,
  plugin
];
export default plugins;
