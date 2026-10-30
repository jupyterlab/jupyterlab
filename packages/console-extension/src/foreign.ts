// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import type {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { Dialog, ICommandPalette, showDialog } from '@jupyterlab/apputils';
import type { CodeConsole, ConsolePanel } from '@jupyterlab/console';
import { ForeignHandler, IConsoleTracker } from '@jupyterlab/console';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import type { TranslationBundle } from '@jupyterlab/translation';
import { ITranslator } from '@jupyterlab/translation';
import type { ReadonlyPartialJSONObject } from '@lumino/coreutils';
import { AttachedProperty } from '@lumino/properties';
import { Widget } from '@lumino/widgets';

/**
 * The console foreign handler.
 */
export const foreign: JupyterFrontEndPlugin<void> = {
  id: '@jupyterlab/console-extension:foreign',
  description: 'Add foreign handler of IOPub messages to the console.',
  requires: [IConsoleTracker, ISettingRegistry, ITranslator],
  optional: [ICommandPalette],
  activate: activateForeign,
  autoStart: true
};

export default foreign;

function activateForeign(
  app: JupyterFrontEnd,
  tracker: IConsoleTracker,
  settingRegistry: ISettingRegistry,
  translator: ITranslator,
  palette: ICommandPalette | null
): void {
  const trans = translator.load('jupyterlab');
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
      .get(Private.TRACKER_PLUGIN_ID, 'showAllKernelActivity')
      .then(({ composite }) => {
        const showAllKernelActivity = composite as boolean;
        handler.enabled = showAllKernelActivity;
      });

    console.disposed.connect(() => {
      handler.dispose();
    });
  });

  const { commands } = app;
  const category = trans.__('Console');
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
    label: args => trans.__('Show All Kernel Activity'),
    execute: async args => {
      const current = getCurrent(args);
      if (!current) {
        return;
      }
      const handler = Private.foreignHandlerProperty.get(current.console);
      if (!handler) {
        return;
      }
      if (handler.enabled) {
        handler.enabled = false;
        return;
      }
      const { composite: snoozedUntil } = await settingRegistry.get(
        Private.TRACKER_PLUGIN_ID,
        Private.SNOOZE_SETTING
      );
      if (!Private.isSnoozed(snoozedUntil)) {
        const result = await showDialog({
          title: trans.__('Show activity from other kernel clients?'),
          body: new Private.ShowAllActivityBody(trans),
          buttons: [
            Dialog.cancelButton(),
            Dialog.warnButton({ label: trans.__('Show All Activity') })
          ],
          defaultButton: 0,
          checkbox: {
            label: trans.__('Do not ask me again today'),
            caption: trans.__(
              'You can change this in the Settings Editor under Code Console.'
            )
          }
        });
        if (!result.button.accept) {
          return;
        }
        if (result.isChecked) {
          await settingRegistry.set(
            Private.TRACKER_PLUGIN_ID,
            Private.SNOOZE_SETTING,
            Private.tomorrow()
          );
        }
      }
      if (!handler.isDisposed) {
        handler.enabled = true;
      }
    },
    isToggled: () =>
      tracker.currentWidget !== null &&
      !!Private.foreignHandlerProperty.get(tracker.currentWidget.console)
        ?.enabled,
    isEnabled: () =>
      tracker.currentWidget !== null &&
      tracker.currentWidget === shell.currentWidget,
    describedBy: {
      args: {
        type: 'object',
        properties: {
          activate: {
            type: 'boolean',
            description: trans.__('Whether to activate the widget')
          }
        }
      }
    }
  });

  const notify = () => {
    commands.notifyCommandChanged(toggleShowAllActivity);
  };
  tracker.currentChanged.connect(notify);
  shell.currentChanged?.connect(notify);

  if (palette) {
    palette.addItem({
      command: toggleShowAllActivity,
      category,
      args: { isPalette: true }
    });
  }
}

/*
 * A namespace for private data.
 */
namespace Private {
  /**
   * The plugin holding the console tracker settings.
   */
  export const TRACKER_PLUGIN_ID = '@jupyterlab/console-extension:tracker';

  /**
   * The setting holding the date until which the warning is skipped.
   */
  export const SNOOZE_SETTING = 'showAllKernelActivityWarningSnoozedUntil';

  /**
   * Whether a `YYYY-MM-DD` snooze date is still in the future, in local time.
   */
  export function isSnoozed(value: unknown): boolean {
    if (typeof value !== 'string') {
      return false;
    }
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) {
      return false;
    }
    const [, year, month, day] = match.map(Number);
    return Date.now() < new Date(year, month - 1, day).getTime();
  }

  /**
   * Tomorrow's date as `YYYY-MM-DD` in local time.
   */
  export function tomorrow(): string {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
      date.getDate()
    )}`;
  }

  /**
   * The body of the dialog shown before showing all kernel activity.
   */
  export class ShowAllActivityBody extends Widget {
    constructor(trans: TranslationBundle) {
      super();
      const paragraphs = trans
        .__(
          'This console will also show code that other clients run on the same kernel, such as collaborators or other notebooks and consoles, together with its output.\n\nThat output is treated as trusted. If it contains JavaScript or HTML, it will run in your browser with the same access as your own code, without asking you first.\n\nOnly continue if you trust everyone who can run code on this kernel.'
        )
        .split('\n\n');
      for (const text of paragraphs) {
        const p = document.createElement('p');
        p.textContent = text;
        this.node.appendChild(p);
      }
    }
  }

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
