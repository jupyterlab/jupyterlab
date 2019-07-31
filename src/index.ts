// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ILayoutRestorer,
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { IStateDB } from '@jupyterlab/coreutils';

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
 * Export the plugins as default.
 */
const plugins: JupyterFrontEndPlugin<any>[] = [plugin];
export default plugins;
