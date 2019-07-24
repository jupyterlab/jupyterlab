// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ILayoutRestorer,
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { Debugger } from './debugger';

import { IDebugger } from './tokens';

/**
 * A plugin providing a UI for code debugging and environment inspection.
 */
const plugin: JupyterFrontEndPlugin<IDebugger> = {
  id: '@jupyterlab/debugger:plugin',
  optional: [ILayoutRestorer],
  provides: IDebugger,
  autoStart: true,
  activate: (
    app: JupyterFrontEnd,
    restorer: ILayoutRestorer | null
  ): IDebugger => {
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

    return widget;
  }
};

/**
 * Export the plugins as default.
 */
const plugins: JupyterFrontEndPlugin<any>[] = [plugin];
export default plugins;
