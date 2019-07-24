// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ILayoutRestorer,
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { ILauncher } from '@jupyterlab/launcher';

import { Debugger } from './debugger';

import { IDebugger } from './tokens';

/**
 * The command IDs used by the debugger plugin.
 */
namespace CommandIDs {
  export const open = 'debugger:open';
}

/**
 * A plugin providing a UI for code debugging and environment inspection.
 */
const plugin: JupyterFrontEndPlugin<IDebugger> = {
  id: '@jupyterlab/debugger:plugin',
  optional: [ILauncher, ILayoutRestorer],
  provides: IDebugger,
  autoStart: true,
  activate: (
    app: JupyterFrontEnd,
    launcher: ILauncher | null,
    restorer: ILayoutRestorer | null
  ): IDebugger => {
    console.log(plugin.id, 'Hello, world.');
    const { shell } = app;
    const command = CommandIDs.open;
    const label = 'Environment';
    const widget = new Debugger();

    widget.id = 'jp-debugger';
    widget.title.label = label;
    shell.add(widget, 'right', { activate: false });

    if (launcher) {
      launcher.add({ command, args: { isLauncher: true } });
    }

    if (restorer) {
      restorer.add(widget, widget.id);
    }

    return widget;
  }
};

/**
 * Export the plugins as default.
 */
const plugins: JupyterFrontEndPlugin<any>[] = [plugin];
export default plugins;
