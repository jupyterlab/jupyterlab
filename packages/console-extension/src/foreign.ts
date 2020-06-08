// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { ICommandPalette } from '@jupyterlab/apputils';

import {
  CodeConsole,
  ConsolePanel,
  IConsoleTracker,
  ForeignHandler
} from '@jupyterlab/console';

import { ISettingRegistry } from '@jupyterlab/settingregistry';

import { AttachedProperty } from '@lumino/properties';

import { ReadonlyPartialJSONObject } from '@lumino/coreutils';

/**
 * The console widget tracker provider.
 */
export const foreign: JupyterFrontEndPlugin<void> = {
  id: '@jupyterlab/console-extension:foreign',
  requires: [IConsoleTracker, ISettingRegistry],
  optional: [ICommandPalette],
  activate: activateForeign,
  autoStart: true
};

export default foreign;

function activateForeign(
  app: JupyterFrontEnd,
  tracker: IConsoleTracker,
  settingRegistry: ISettingRegistry,
  palette: ICommandPalette | null
) {
  const { shell } = app;
  tracker.widgetAdded.connect((sender, widget) => {
    const console = widget.console;

    const handler = new ForeignHandler({
      sessionContext: console.sessionContext,
      parent: console
    });
    Private.foreignHandlerProperty.set(console, handler);

    // Property showAllKernelActivity configures foreign handler enabled on start.
    void settingRegistry
      .get('@jupyterlab/console-extension:tracker', 'showAllKernelActivity')
      .then(({ composite }) => {
        const showAllKernelActivity = composite as boolean;
        handler.enabled = showAllKernelActivity;
      });

    console.disposed.connect(() => {
      handler.dispose();
    });
  });

  const { commands } = app;
  const category = 'Console';
  const toggleShowAllActivity = 'console:toggle-show-all-kernel-activity';

  // Get the current widget and activate unless the args specify otherwise.
  function getCurrent(args: ReadonlyPartialJSONObject): ConsolePanel | null {
    const widget = tracker.currentWidget;
    const activate = args['activate'] !== false;
    if (activate && widget) {
      shell.activateById(widget.id);
    }
    return widget;
  }

  commands.addCommand(toggleShowAllActivity, {
    label: args => 'Show All Kernel Activity',
    execute: args => {
      const current = getCurrent(args);
      if (!current) {
        return;
      }
      const handler = Private.foreignHandlerProperty.get(current.console);
      if (handler) {
        handler.enabled = !handler.enabled;
      }
    },
    isToggled: () =>
      tracker.currentWidget !== null &&
      !!Private.foreignHandlerProperty.get(tracker.currentWidget.console)
        ?.enabled,
    isEnabled: () =>
      tracker.currentWidget !== null &&
      tracker.currentWidget === shell.currentWidget
  });

  if (palette) {
    palette.addItem({
      command: toggleShowAllActivity,
      category,
      args: { isPalette: true }
    });
  }

  app.contextMenu.addItem({
    command: toggleShowAllActivity,
    selector: '.jp-CodeConsole'
  });
}

/*
 * A namespace for private data.
 */
namespace Private {
  /**
   * An attached property for a console's foreign handler.
   */
  export const foreignHandlerProperty = new AttachedProperty<
    CodeConsole,
    ForeignHandler | undefined
  >({
    name: 'foreignHandler',
    create: () => undefined
  });
}
