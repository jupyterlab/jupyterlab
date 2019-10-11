// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ILayoutRestorer,
  JupyterFrontEnd,
  JupyterFrontEndPlugin,
  ILabShell
} from '@jupyterlab/application';

import { ICommandPalette } from '@jupyterlab/apputils';

import { WidgetTracker, MainAreaWidget } from '@jupyterlab/apputils';

import { IConsoleTracker, ConsolePanel } from '@jupyterlab/console';

import { IDebugger } from './tokens';

import { IStateDB } from '@jupyterlab/coreutils';

import { IEditorTracker, FileEditor } from '@jupyterlab/fileeditor';

import { INotebookTracker, NotebookPanel } from '@jupyterlab/notebook';

import { UUID } from '@phosphor/coreutils';

import { Debugger } from './debugger';

import { DebugSession } from './session';

import { DebuggerNotebookHandler } from './handlers/notebook';
import { DebuggerConsoleHandler } from './handlers/console';
import { IDisposable } from '@phosphor/disposable';

// import { Session } from '@jupyterlab/services';

/**
 * The command IDs used by the debugger plugin.
 */
export namespace CommandIDs {
  export const create = 'debugger:create';

  export const start = 'debugger:start';

  export const stop = 'debugger:stop';

  export const debugConsole = 'debugger:debug-console';

  export const debugFile = 'debugger:debug-file';

  export const debugNotebook = 'debugger:debug-notebook';

  export const mount = 'debugger:mount';

  export const changeMode = 'debugger:change-mode';
}

/**
 * A plugin that provides visual debugging support for consoles.
 */
const consoles: JupyterFrontEndPlugin<void> = {
  id: '@jupyterlab/debugger:consoles',
  autoStart: true,
  requires: [IDebugger, IConsoleTracker, ILabShell],
  activate: (
    _,
    debug: IDebugger,
    tracker: IConsoleTracker,
    labShell: ILabShell
  ) => {
    let oldhandler: {
      id: string;
      handler: DebuggerConsoleHandler;
    };

    labShell.currentChanged.connect((_, update) => {
      const widget = update.newValue;

      if (!(widget instanceof ConsolePanel)) {
        return;
      }

      if (!debug.session) {
        debug.session = new DebugSession({ client: widget.session });
      } else {
        debug.session.client = widget.session;
      }
      if (debug.tracker.currentWidget) {
        const handler = new DebuggerConsoleHandler({
          consoleTracker: tracker,
          debuggerModel: debug.tracker.currentWidget.content.model
        });
        if (!oldhandler) {
          oldhandler = {
            id: widget.id,
            handler: handler
          };
        } else if (oldhandler.id !== widget.id) {
          oldhandler.id = widget.id;
          oldhandler.handler.dispose();
          oldhandler.handler = handler;
        }
      }
    });
  }
};

/**
 * A plugin that provides visual debugging support for file editors.
 */
const files: JupyterFrontEndPlugin<void> = {
  id: '@jupyterlab/debugger:files',
  autoStart: true,
  requires: [IDebugger, IEditorTracker, ILabShell],
  activate: (
    app: JupyterFrontEnd,
    debug: IDebugger,
    tracker: IEditorTracker,
    labShell: ILabShell
  ) => {
    labShell.currentChanged.connect((_, update) => {
      const widget = update.newValue;
      if (!(widget instanceof FileEditor)) {
        return;
      }
      (widget as FileEditor).context.path;
      // const sessions = app.serviceManager.sessions;

      // sessions.runningChanged.connect((sender, models: Session.IModel[]) => {
      //   const model = models.find(
      //     model => model.path === (widget as FileEditor).context.path
      //   );

      //   const session = sessions.connectTo(model);
      //   console.log({ session });
      //   if (!debug.session) {
      //     debug.session = new DebugSession(session);
      //   } else {
      //     debug.session.client = session;
      //   }
      // });

      // TODO: Check @jupyterlab/completer-extension:files to see how to connect
      // a file editor's kernel session to the debugger. Update line below.
      debug.session = null;
    });

    app.commands.addCommand(CommandIDs.debugFile, {
      execute: async _ => {
        if (!tracker || !tracker.currentWidget) {
          return;
        }
        if (tracker.currentWidget) {
          // TODO: Find if the file is backed by a kernel or attach it to one.
          // const widget = await app.commands.execute(CommandIDs.create);
          // app.shell.add(widget, 'main');
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
  requires: [IDebugger, INotebookTracker, ILabShell],
  activate: (
    _,
    debug: IDebugger,
    tracker: INotebookTracker,
    labShell: ILabShell
  ) => {
    let oldhandler: {
      id: string;
      handler: DebuggerNotebookHandler;
    };

    labShell.currentChanged.connect((_, update) => {
      const widget = update.newValue;
      if (!(widget instanceof NotebookPanel)) {
        return;
      }
      if (!debug.session) {
        debug.session = new DebugSession({ client: widget.session });
      } else {
        debug.session.client = widget.session;
      }
      if (debug.tracker.currentWidget) {
        const handler = new DebuggerNotebookHandler({
          notebookTracker: tracker,
          debuggerModel: debug.tracker.currentWidget.content.model
        });
        if (!oldhandler) {
          oldhandler = {
            id: widget.id,
            handler: handler
          };
        } else if (oldhandler.id !== widget.id) {
          oldhandler.id = widget.id;
          oldhandler.handler.dispose();
          oldhandler.handler = handler;
        }
      }
    });
  }
};

/**
 * A plugin providing a tracker code debuggers.
 */
const main: JupyterFrontEndPlugin<IDebugger> = {
  id: '@jupyterlab/debugger:main',
  optional: [ILayoutRestorer, ICommandPalette],
  requires: [IStateDB],
  provides: IDebugger,
  autoStart: true,
  activate: (
    app: JupyterFrontEnd,
    state: IStateDB,
    restorer: ILayoutRestorer | null,
    palette: ICommandPalette | null
  ): IDebugger => {
    const tracker = new WidgetTracker<MainAreaWidget<Debugger>>({
      namespace: 'debugger'
    });
    const { commands, shell } = app;
    let widget: MainAreaWidget<Debugger>;
    let commandStop: IDisposable;

    const getModel = () => {
      return tracker.currentWidget ? tracker.currentWidget.content.model : null;
    };

    commands.addCommand(CommandIDs.mount, {
      execute: args => {
        if (!widget) {
          return;
        }
        const mode = (args.mode as IDebugger.Mode) || 'expanded';
        const { sidebar } = widget.content;
        if (!mode) {
          throw new Error(`Could not mount debugger in mode: "${mode}"`);
        }
        if (mode === 'expanded') {
          if (widget.isAttached) {
            return;
          }

          if (sidebar.isAttached) {
            sidebar.parent = null;
          }

          //edge case when realod page after set condensed mode
          widget.title.label = 'Debugger';
          shell.add(widget, 'main');
          return;
        }

        if (sidebar.isAttached) {
          return;
        }

        if (widget.isAttached) {
          widget.parent = null;
        }

        sidebar.id = 'jp-debugger-sidebar';
        sidebar.title.label = 'Environment';
        shell.add(sidebar, 'right', { activate: false });
      }
    });

    commands.addCommand(CommandIDs.stop, {
      label: 'Stop',
      execute: async () => {
        const debuggerModel = getModel();
        if (debuggerModel) {
          await debuggerModel.session.stop();
          commandStop.dispose();
        }
      }
    });

    commands.addCommand(CommandIDs.start, {
      label: 'Start',
      isEnabled: () => {
        const debuggerModel = getModel();
        return (debuggerModel &&
          debuggerModel.session !== undefined) as boolean;
      },
      execute: async () => {
        const debuggerModel = getModel();
        if (debuggerModel && debuggerModel.session) {
          await debuggerModel.session.start();
          commandStop = palette.addItem({
            command: CommandIDs.stop,
            category: 'Debugger'
          });
        }
      }
    });

    commands.addCommand(CommandIDs.changeMode, {
      label: 'Change Mode',
      isEnabled: () => {
        return !!tracker.currentWidget;
      },
      execute: () => {
        const currentMode = tracker.currentWidget.content.model.mode;
        tracker.currentWidget.content.model.mode =
          currentMode === 'expanded' ? 'condensed' : 'expanded';
        let mode = tracker.currentWidget.content.model.mode;

        if (mode === 'condensed') {
          commands.execute(CommandIDs.mount, { mode });
        } else if (mode === 'expanded') {
          widget.content.sidebar.close();
          commands.execute(CommandIDs.mount, { mode });
        }
      }
    });

    commands.addCommand(CommandIDs.create, {
      label: 'Debugger',
      execute: async args => {
        const id = (args.id as string) || UUID.uuid4();
        const mode = (args.mode as IDebugger.Mode) || 'expanded';

        if (id) {
          console.log('Debugger ID: ', id);
        }

        if (tracker.currentWidget) {
          widget = tracker.currentWidget;
        } else {
          widget = new MainAreaWidget({
            content: new Debugger({
              connector: state,
              id: id
            })
          });

          void tracker.add(widget);

          widget.content.model.mode = mode;
        }

        await commands.execute(CommandIDs.mount, { mode });

        return widget;
      }
    });

    if (palette) {
      palette.addItem({ command: CommandIDs.changeMode, category: 'Debugger' });
      palette.addItem({ command: CommandIDs.create, category: 'Debugger' });
      palette.addItem({ command: CommandIDs.start, category: 'Debugger' });
    }

    if (restorer) {
      // Handle state restoration.
      void restorer.restore(tracker, {
        command: CommandIDs.create,
        args: widget => ({
          id: widget.content.model.id,
          mode: widget.content.model.mode
        }),
        name: widget => widget.content.model.id
      });
    }

    // Create a proxy to pass the `session` and `mode` to the debugger.

    const proxy: IDebugger = Object.defineProperties(
      {},
      {
        mode: {
          get: (): IDebugger.Mode => {
            return widget.content.model.mode;
          },
          set: (mode: IDebugger.Mode) => {
            if (widget) {
              widget.content.model.mode = mode;
            }
          }
        },
        session: {
          get: (): IDebugger.ISession | null => {
            return null;
          },
          set: (src: IDebugger.ISession | null) => {
            if (widget) {
              widget.content.model.session = src;
            }
          }
        },
        tracker: {
          get: (): WidgetTracker<MainAreaWidget<Debugger>> => {
            return tracker;
          }
        }
      }
    );

    return proxy;
  }
};

/**
 * Export the plugins as default.
 */

const plugins: JupyterFrontEndPlugin<any>[] = [
  consoles,
  files,
  notebooks,
  main
];

export default plugins;
