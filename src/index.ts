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

import { ConsoleHandler } from './handlers/console';

import { NotebookHandler } from './handlers/notebook';

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

  export const terminate = 'debugger:terminate';

  export const next = 'debugger:next';

  export const stepIn = 'debugger:stepIn';

  export const stepOut = 'debugger:stepOut';

  export const debugConsole = 'debugger:debug-console';

  export const debugFile = 'debugger:debug-file';

  export const mount = 'debugger:mount';

  export const changeMode = 'debugger:change-mode';

  export const closeDebugger = 'debugger:close';
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
  if (debug.isDebuggingEnabled) {
    await debug.restoreState(true);
  }
  app.commands.notifyCommandChanged();
}

class DebuggerHandler<H extends ConsoleHandler | NotebookHandler> {
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
        debuggerService: debug,
        id: widget.id
      });
      this.handlers[widget.id] = handler;
      widget.disposed.connect(() => {
        handler.dispose();
        delete this.handlers[widget.id];
      });

      debug.model.disposed.connect(async () => {
        await debug.stop();
        Object.keys(this.handlers).forEach(id => {
          this.handlers[id].dispose();
        });
        this.handlers = {};
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
    const handler = new DebuggerHandler<ConsoleHandler>(ConsoleHandler);

    labShell.currentChanged.connect(async (_, update) => {
      const widget = update.newValue;
      if (!(widget instanceof ConsolePanel)) {
        return;
      }
      await setDebugSession(app, debug, widget.session);
      handler.update(debug, tracker, widget);
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
    const handler = new DebuggerHandler<NotebookHandler>(NotebookHandler);

    labShell.activeChanged.connect(async (_, update) => {
      const widget = update.newValue;
      if (!(widget instanceof NotebookPanel)) {
        return;
      }
      await setDebugSession(app, debug, widget.session);
      handler.update(debug, tracker, widget);
    });
  }
};

/**
 * A plugin providing a tracker code debuggers.
 */
const main: JupyterFrontEndPlugin<IDebugger> = {
  id: '@jupyterlab/debugger:main',
  optional: [ILayoutRestorer, ICommandPalette],
  requires: [IStateDB, IEditorServices, ILabShell],
  provides: IDebugger,
  autoStart: true,
  activate: (
    app: JupyterFrontEnd,
    state: IStateDB,
    editorServices: IEditorServices,
    labShell: ILabShell,
    restorer: ILayoutRestorer | null,
    palette: ICommandPalette | null
  ): IDebugger => {
    const { commands, shell } = app;
    const editorFactory = editorServices.factoryService.newInlineEditor;

    const service = new DebugService();

    const tracker = new WidgetTracker<MainAreaWidget<Debugger>>({
      namespace: 'debugger'
    });

    const defaultMode = 'condensed';

    let widget: MainAreaWidget<Debugger>;

    commands.addCommand(CommandIDs.closeDebugger, {
      label: 'Close Debugger',
      execute: args => {
        if (!widget) {
          return;
        }
        widget.content.sidebar.close();
        widget.dispose();
      }
    });

    app.contextMenu.addItem({
      command: CommandIDs.closeDebugger,
      selector: '.jp-DebuggerSidebar'
    });

    commands.addCommand(CommandIDs.mount, {
      execute: async args => {
        if (!widget) {
          return;
        }

        const mode = (args.mode as IDebugger.Mode) || defaultMode;

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
        if (labShell.currentWidget) {
          labShell.currentWidget.activate();
        }

        if (restorer) {
          restorer.add(sidebar, 'debugger-sidebar');
        }

        await service.restoreState(true);
      }
    });

    commands.addCommand(CommandIDs.debugContinue, {
      label: 'Continue',
      caption: 'Continue',
      iconClass: 'jp-MaterialIcon jp-RunIcon',
      isEnabled: () => {
        return service.isThreadStopped();
      },
      execute: async () => {
        await service.continue();
        commands.notifyCommandChanged();
      }
    });

    commands.addCommand(CommandIDs.terminate, {
      label: 'Terminate',
      caption: 'Terminate',
      iconClass: 'jp-MaterialIcon jp-StopIcon',
      isEnabled: () => {
        return service.isThreadStopped();
      },
      execute: async () => {
        await service.restart();
        commands.notifyCommandChanged();
      }
    });

    commands.addCommand(CommandIDs.next, {
      label: 'Next',
      caption: 'Next',
      iconClass: 'jp-MaterialIcon jp-StepOverIcon',
      isEnabled: () => {
        return service.isThreadStopped();
      },
      execute: async () => {
        await service.next();
      }
    });

    commands.addCommand(CommandIDs.stepIn, {
      label: 'StepIn',
      caption: 'Step In',
      iconClass: 'jp-MaterialIcon jp-StepInIcon',
      isEnabled: () => {
        return service.isThreadStopped();
      },
      execute: async () => {
        await service.stepIn();
      }
    });

    commands.addCommand(CommandIDs.stepOut, {
      label: 'StepOut',
      caption: 'Step Out',
      iconClass: 'jp-MaterialIcon jp-StepOutIcon',
      isEnabled: () => {
        return service.isThreadStopped();
      },
      execute: async () => {
        await service.stepOut();
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
        const mode = savedMode ? savedMode : defaultMode;

        const callstackCommands = {
          registry: commands,
          continue: CommandIDs.debugContinue,
          terminate: CommandIDs.terminate,
          next: CommandIDs.next,
          stepIn: CommandIDs.stepIn,
          stepOut: CommandIDs.stepOut
        };

        if (tracker.currentWidget) {
          widget = tracker.currentWidget;
        } else {
          widget = new MainAreaWidget({
            content: new Debugger({
              debugService: service,
              connector: state,
              callstackCommands,
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
      [
        CommandIDs.changeMode,
        CommandIDs.create,
        CommandIDs.debugContinue,
        CommandIDs.terminate,
        CommandIDs.next,
        CommandIDs.stepIn,
        CommandIDs.stepOut
      ].forEach(command => {
        palette.addItem({ command, category });
      });
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
