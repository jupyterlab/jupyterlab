// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ILayoutRestorer,
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import {
  ICommandPalette,
  MainAreaWidget,
  WidgetTracker
} from '@jupyterlab/apputils';

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
  optional: [ICommandPalette, ILauncher, ILayoutRestorer],
  provides: IDebugger,
  autoStart: true,
  activate: (
    app: JupyterFrontEnd,
    palette: ICommandPalette | null,
    launcher: ILauncher | null,
    restorer: ILayoutRestorer | null
  ): IDebugger => {
    console.log(plugin.id, 'Hello, world.');
    const { commands, shell } = app;
    const command = CommandIDs.open;
    const label = 'Environment';
    const namespace = 'debugger';
    const tracker = new WidgetTracker<MainAreaWidget<Debugger>>({
      namespace
    });

    let widget: MainAreaWidget<Debugger>;
    function openDebugger(): MainAreaWidget<Debugger> {
      if (!widget || widget.isDisposed) {
        widget = new MainAreaWidget({
          content: new Debugger()
        });
        widget.id = 'jp-debugger';
        widget.title.label = label;
        void tracker.add(widget);
      }
      if (!widget.isAttached) {
        shell.add(widget, 'right', { activate: false });
      }
      shell.activateById(widget.id);
      return widget;
    }

    // Add command to registry.
    commands.addCommand(command, {
      caption: 'Environment inspector and code debugger',
      isEnabled: () =>
        !widget || widget.isDisposed || !widget.isAttached || !widget.isVisible,
      label,
      execute: () => openDebugger()
    });

    // Add command to UI where possible.
    if (palette) {
      palette.addItem({ command, category: label });
    }
    if (launcher) {
      launcher.add({ command, args: { isLauncher: true } });
    }

    // Handle state restoration.
    if (restorer) {
      void restorer.restore(tracker, { command, name: () => namespace });
    }

    return {} as IDebugger;
  }
};

/**
 * Export the plugins as default.
 */
const plugins: JupyterFrontEndPlugin<any>[] = [plugin];
export default plugins;
