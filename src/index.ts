// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ILayoutRestorer,
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { IStateDB } from '@jupyterlab/coreutils';

import { IEditorTracker } from '@jupyterlab/fileeditor';

import { INotebookTracker } from '@jupyterlab/notebook';

import { Debugger } from './debugger';

import { IDebugger } from './tokens';

/**
 * A plugin providing a UI for code debugging and environment inspection.
 */
const plugin: JupyterFrontEndPlugin<IDebugger> = {
  id: '@jupyterlab/debugger:plugin',
  optional: [ILayoutRestorer, IStateDB],
  provides: IDebugger,
  autoStart: true,
  activate: async (
    app: JupyterFrontEnd,
    restorer: ILayoutRestorer | null,
    state: IStateDB | null
  ): Promise<IDebugger> => {
    console.log(plugin.id, 'Hello, world.');
    const { shell } = app;
    const label = 'Environment';
    const widget = new Debugger();

    widget.id = 'jp-debugger';
    widget.title.label = label;
    shell.add(widget, 'right', { activate: false });

    if (restorer) {
      restorer.add(widget, widget.id);
    }

    if (state) {
      const command = 'debugger:restore';
      const restore = app.commands.addCommand(command, {
        execute: _ => {
          console.log('Disposing restore command');
          restore.dispose();
        }
      });
      const restored = widget.model.restore({
        connector: state,
        registry: app.commands,
        command: '',
        name: () => widget.id
      });
      window.requestAnimationFrame(async () => {
        await restored;
        console.log('WAITED FOR RESTORATION OF MODEL.');
      });
    }

    return widget.model;
  }
};

/**
 * A plugin that provides visual debugging support for file editors.
 */
const files: JupyterFrontEndPlugin<void> = {
  id: '@jupyterlab/debugger:notebooks',
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
const plugins: JupyterFrontEndPlugin<any>[] = [plugin, notebooks, files];
export default plugins;
