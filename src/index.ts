// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ILayoutRestorer,
  JupyterFrontEnd,
  JupyterFrontEndPlugin,
  ILabShell
} from '@jupyterlab/application';

import { IClientSession, ICommandPalette } from '@jupyterlab/apputils';

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

  export const debugContinue = 'debugger:continue';

  export const next = 'debugger:next';

  export const stepIn = 'debugger:stepIn';

  export const debugConsole = 'debugger:debug-console';

  export const debugFile = 'debugger:debug-file';

  export const debugNotebook = 'debugger:debug-notebook';

  export const mount = 'debugger:mount';

  export const changeMode = 'debugger:change-mode';
}

async function setDebugSession(
  app: JupyterFrontEnd,
  debug: IDebugger,
  client: IClientSession
) {
  if (!debug.session) {
    debug.session = new DebugSession({ client: client });
  } else {
    debug.session.client = client;
  }
  if (debug.session) {
    await debug.session.restoreState();
    app.commands.notifyCommandChanged();
  }
}

class HandlerTracker<
  H extends DebuggerConsoleHandler | DebuggerNotebookHandler
> {
  constructor(builder: new (option: any) => H) {
    this.builder = builder;
  }

  update<
    T extends IConsoleTracker | INotebookTracker,
    W extends ConsolePanel | NotebookPanel
  >(debug: IDebugger, tracker: T, widget: W): void {
    if (debug.tracker.currentWidget && !this.handlers[widget.id]) {
      const handler = new this.builder({
        tracker: tracker,
        debuggerModel: debug.tracker.currentWidget.content.model,
        debuggerService: debug.tracker.currentWidget.content.service
      });
      this.handlers[widget.id] = handler;
      widget.disposed.connect(() => {
        delete this.handlers[widget.id];
        handler.dispose();
      });
    }
  }

  private handlers: { [id: string]: H } = {};
  private builder: new (option: any) => H;
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
    const handlerTracker = new HandlerTracker<DebuggerConsoleHandler>(
      DebuggerConsoleHandler
    );

    labShell.currentChanged.connect(async (_, update) => {
      const widget = update.newValue;
      if (!(widget instanceof ConsolePanel)) {
        return;
      }
      await setDebugSession(app, debug, widget.session);
      handlerTracker.update(debug, tracker, widget);
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
    const handlerTracker = new HandlerTracker<DebuggerNotebookHandler>(
      DebuggerNotebookHandler
    );

    labShell.currentChanged.connect(async (_, update) => {
      const widget = update.newValue;
      if (!(widget instanceof NotebookPanel)) {
        return;
      }
      await setDebugSession(app, debug, widget.session);
      handlerTracker.update(debug, tracker, widget);
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

    const getService = () => {
      return tracker.currentWidget
        ? tracker.currentWidget.content.service
        : null;
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
        const service = getService();
        return service && service.isStarted();
      },
      execute: async () => {
        await getService().session.stop();
        commands.notifyCommandChanged();
      }
    });

    commands.addCommand(CommandIDs.start, {
      label: 'Start',
      isEnabled: () => {
        const service = getService();
        return service && service.canStart();
      },
      execute: async () => {
        await getService().session.start();
        commands.notifyCommandChanged();
      }
    });

    commands.addCommand(CommandIDs.debugContinue, {
      label: 'Continue',
      isEnabled: () => {
        const service = getService();
        return service && service.isThreadStopped();
      },
      execute: async () => {
        await getService().continue();
        commands.notifyCommandChanged();
      }
    });

    commands.addCommand(CommandIDs.next, {
      label: 'Next',
      isEnabled: () => {
        const service = getService();
        return service && service.isThreadStopped();
      },
      execute: async () => {
        await getService().next();
      }
    });

    commands.addCommand(CommandIDs.stepIn, {
      label: 'StepIn',
      isEnabled: () => {
        const service = getService();
        return service && service.isThreadStopped();
      },
      execute: async () => {
        await getService().stepIn();
      }
    });

    commands.addCommand(CommandIDs.debugNotebook, {
      label: 'Launch',
      isEnabled: () => {
        const service = getService();
        return service && service.isStarted();
      },
      execute: async () => {
        await tracker.currentWidget.content.service.launch(
          getModel().codeValue.text
        );
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
              editorFactory
            })
          });
          widget.id = id;

          void tracker.add(widget);

          widget.content.model.mode = mode;

          widget.content.model.modeChanged.connect((_, mode) => {
            void state.save('mode', mode);
          });
        }

        widget.content.service.eventMessage.connect(_ => {
          commands.notifyCommandChanged();
        });

        widget.content.service.sessionChanged.connect(_ => {
          commands.notifyCommandChanged();
        });

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
      palette.addItem({ command: CommandIDs.debugContinue, category });
      palette.addItem({ command: CommandIDs.next, category });
      palette.addItem({ command: CommandIDs.stepIn, category });
      palette.addItem({ command: CommandIDs.debugNotebook, category });
    }

    if (restorer) {
      // Handle state restoration.
      void restorer.restore(tracker, {
        command: CommandIDs.create,
        args: widget => ({
          id: widget.id
        }),
        name: widget => widget.id
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
            return widget ? widget.content.service.session : null;
          },
          set: (src: IDebugger.ISession | null) => {
            if (widget) {
              widget.content.service.session = src;
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
