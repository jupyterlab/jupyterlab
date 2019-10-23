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

import { Kernel } from '@jupyterlab/services';
import { IEditorServices } from '@jupyterlab/codeeditor';

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
    app: JupyterFrontEnd,
    debug: IDebugger,
    tracker: IConsoleTracker,
    labShell: ILabShell
  ) => {
    let oldhandler: {
      id: string;
      handler: DebuggerConsoleHandler;
    };

    labShell.currentChanged.connect(async (_, update) => {
      const widget = update.newValue;

      if (!(widget instanceof ConsolePanel)) {
        return;
      }

      if (!debug.session) {
        debug.session = new DebugSession({ client: widget.session });
      } else {
        debug.session.client = widget.session;
      }
      if (debug.session) {
        await debug.session.restoreState();
        app.commands.notifyCommandChanged();
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
    let _model: any;
    labShell.currentChanged.connect((_, update) => {
      const widget = update.newValue;
      if (!(widget instanceof FileEditor)) {
        return;
      }

      //  Finding if the file is backed by a kernel or attach it to one.

      const sessions = app.serviceManager.sessions;

      void sessions.findByPath(widget.context.path).then(model => {
        _model = model;
        const session = sessions.connectTo(model);
        debug.session.client = session;
      });
    });

    app.commands.addCommand(CommandIDs.debugFile, {
      execute: async _ => {
        if (!tracker || !tracker.currentWidget) {
          return;
        }
        if (tracker.currentWidget) {
          const idKernel = debug.session.client.kernel.id;
          void Kernel.findById(idKernel).catch(() => {
            if (_model) {
              Kernel.connectTo(_model);
            }
          });
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
    app: JupyterFrontEnd,
    debug: IDebugger,
    tracker: INotebookTracker,
    labShell: ILabShell
  ) => {
    let oldhandler: {
      id: string;
      handler: DebuggerNotebookHandler;
    };

    labShell.currentChanged.connect(async (_, update) => {
      const widget = update.newValue;
      if (!(widget instanceof NotebookPanel)) {
        return;
      }
      if (!debug.session) {
        debug.session = new DebugSession({ client: widget.session });
      } else {
        debug.session.client = widget.session;
      }
      if (debug.session) {
        await debug.session.restoreState();
        app.commands.notifyCommandChanged();
      }
      if (debug.tracker.currentWidget) {
        if (!oldhandler) {
          oldhandler = {
            id: widget.id,
            handler: new DebuggerNotebookHandler({
              notebookTracker: tracker,
              debuggerModel: debug.tracker.currentWidget.content.model
            })
          };
        } else if (oldhandler.id !== widget.id) {
          oldhandler.id = widget.id;
          oldhandler.handler.dispose();
          oldhandler.handler = new DebuggerNotebookHandler({
            notebookTracker: tracker,
            debuggerModel: debug.tracker.currentWidget.content.model
          });
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
  requires: [IStateDB, IEditorServices],
  provides: IDebugger,
  autoStart: true,
  activate: (
    app: JupyterFrontEnd,
    state: IStateDB,
    editorServices: IEditorServices,
    restorer: ILayoutRestorer | null,
    palette: ICommandPalette | null
  ): IDebugger => {
    const tracker = new WidgetTracker<MainAreaWidget<Debugger>>({
      namespace: 'debugger'
    });

    const { commands, shell } = app;
    const editorFactory = editorServices.factoryService.newInlineEditor;

    let widget: MainAreaWidget<Debugger>;

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

          // edge case when reload page after set condensed mode
          widget.title.label = 'Debugger';
          shell.add(widget, 'main');
          return;
        }

        // mode = 'condensed'
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
      isEnabled: () => {
        const debuggerModel = getModel();
        return (debuggerModel &&
          debuggerModel.session !== null &&
          debuggerModel.session.isStarted) as boolean;
      },
      execute: async () => {
        const debuggerModel = getModel();
        await debuggerModel.session.stop();
        commands.notifyCommandChanged();
      }
    });

    commands.addCommand(CommandIDs.start, {
      label: 'Start',
      isEnabled: () => {
        const debuggerModel = getModel();
        return (debuggerModel &&
          debuggerModel.session !== null &&
          !debuggerModel.session.isStarted) as boolean;
      },
      execute: async () => {
        const debuggerModel = getModel();
        await debuggerModel.session.start();
        commands.notifyCommandChanged();
      }
    });

    commands.addCommand(CommandIDs.debugNotebook, {
      label: 'Launch',
      isEnabled: () => {
        const debuggerModel = getModel();
        return (debuggerModel &&
          debuggerModel.session !== null &&
          debuggerModel.session.isStarted) as boolean;
      },
      execute: async () => {
        const debuggerModel = getModel();
        await debuggerModel.service.launch(debuggerModel.codeValue.text);
      }
    });

    commands.addCommand(CommandIDs.changeMode, {
      label: 'Change Mode',
      isEnabled: () => {
        return !!tracker.currentWidget;
      },
      execute: () => {
        const currentMode = tracker.currentWidget.content.model.mode;
        const mode = currentMode === 'expanded' ? 'condensed' : 'expanded';
        tracker.currentWidget.content.model.mode = mode;
        void commands.execute(CommandIDs.mount, { mode });
      }
    });

    commands.addCommand(CommandIDs.create, {
      label: 'Debugger',
      execute: async args => {
        const id = (args.id as string) || UUID.uuid4();
        const savedMode = (await state.fetch('mode')) as IDebugger.Mode;
        const mode = savedMode ? savedMode : 'expanded';

        if (id) {
          console.log('Debugger ID: ', id);
        }

        if (tracker.currentWidget) {
          widget = tracker.currentWidget;
        } else {
          widget = new MainAreaWidget({
            content: new Debugger({
              connector: state,
              editorFactory,
              id
            })
          });

          void tracker.add(widget);

          widget.content.model.mode = mode;

          widget.content.model.modeChanged.connect((_, mode) => {
            void state.save('mode', mode);
          });
        }

        await commands.execute(CommandIDs.mount, { mode });
        return widget;
      }
    });

    if (palette) {
      const category = 'Debugger';
      palette.addItem({ command: CommandIDs.changeMode, category });
      palette.addItem({ command: CommandIDs.create, category });
      palette.addItem({ command: CommandIDs.start, category });
      palette.addItem({ command: CommandIDs.stop, category });
      palette.addItem({ command: CommandIDs.debugNotebook, category });
    }

    if (restorer) {
      // Handle state restoration.
      void restorer.restore(tracker, {
        command: CommandIDs.create,
        args: widget => ({
          id: widget.content.model.id
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
            return widget ? widget.content.model.session : null;
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
