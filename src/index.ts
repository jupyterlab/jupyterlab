// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ILabShell,
  ILayoutRestorer,
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import {
  IClientSession,
  ICommandPalette,
  MainAreaWidget,
  WidgetTracker
} from '@jupyterlab/apputils';

import { IEditorServices } from '@jupyterlab/codeeditor';

import { ConsolePanel, IConsoleTracker } from '@jupyterlab/console';

import { IStateDB } from '@jupyterlab/coreutils';

import { FileEditor, IEditorTracker } from '@jupyterlab/fileeditor';

import { INotebookTracker, NotebookPanel } from '@jupyterlab/notebook';

import { Kernel } from '@jupyterlab/services';

import { UUID } from '@phosphor/coreutils';

import { Debugger } from './debugger';

import { DebuggerNotebookHandler } from './handlers/notebook';

import { DebuggerConsoleHandler } from './handlers/console';

import { DebugService } from './service';

import { DebugSession } from './session';

import { IDebugger } from './tokens';

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
  await debug.session.restoreState();
  app.commands.notifyCommandChanged();
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
    if (debug.model && !this.handlers[widget.id]) {
      const handler = new this.builder({
        tracker: tracker,
        debuggerService: debug
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
    const { commands, shell } = app;
    const editorFactory = editorServices.factoryService.newInlineEditor;

    const service = new DebugService();

    const tracker = new WidgetTracker<MainAreaWidget<Debugger>>({
      namespace: 'debugger'
    });

    let widget: MainAreaWidget<Debugger>;

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
        return service.isStarted();
      },
      execute: async () => {
        await service.session.stop();
        commands.notifyCommandChanged();
      }
    });

    commands.addCommand(CommandIDs.start, {
      label: 'Start',
      isEnabled: () => {
        return widget && service.canStart();
      },
      execute: async () => {
        await service.session.start();
        commands.notifyCommandChanged();
      }
    });

    commands.addCommand(CommandIDs.debugContinue, {
      label: 'Continue',
      isEnabled: () => {
        return service.isThreadStopped();
      },
      execute: async () => {
        await service.continue();
        commands.notifyCommandChanged();
      }
    });

    commands.addCommand(CommandIDs.next, {
      label: 'Next',
      isEnabled: () => {
        return service.isThreadStopped();
      },
      execute: async () => {
        await service.next();
      }
    });

    commands.addCommand(CommandIDs.stepIn, {
      label: 'StepIn',
      isEnabled: () => {
        return service.isThreadStopped();
      },
      execute: async () => {
        await service.stepIn();
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

        if (tracker.currentWidget) {
          widget = tracker.currentWidget;
        } else {
          widget = new MainAreaWidget({
            content: new Debugger({
              debugService: service,
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

        console.log('Debugger ID: ', widget.id);

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

    return service;
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
