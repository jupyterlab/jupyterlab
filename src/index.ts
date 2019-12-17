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
  Toolbar,
  ToolbarButton
} from '@jupyterlab/apputils';

import { IEditorServices } from '@jupyterlab/codeeditor';

import { ConsolePanel, IConsoleTracker } from '@jupyterlab/console';

import { IStateDB } from '@jupyterlab/coreutils';

import { DocumentWidget } from '@jupyterlab/docregistry';

import { FileEditor, IEditorTracker } from '@jupyterlab/fileeditor';

import { INotebookTracker, NotebookPanel } from '@jupyterlab/notebook';

import { Session } from '@jupyterlab/services';

import { Debugger } from './debugger';

import { ConsoleHandler } from './handlers/console';

import { FileHandler } from './handlers/file';

import { NotebookHandler } from './handlers/notebook';

import { TrackerHandler } from './handlers/tracker';

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

  export const close = 'debugger:close';
}

/**
 * Add a button to the widget toolbar to enable and disable debugging.
 * @param debug The debug service.
 * @param widget The widget to add the debug toolbar button to.
 */
function updateToolbar(
  widget: NotebookPanel | ConsolePanel | DocumentWidget,
  onClick: () => void
) {
  const button = new ToolbarButton({
    className: 'jp-DebuggerSwitchButton',
    iconClassName: 'jp-ToggleSwitch',
    onClick,
    tooltip: 'Enable / Disable Debugger'
  });

  const getToolbar = (): Toolbar => {
    if (!(widget instanceof ConsolePanel)) {
      return widget.toolbar;
    }
    const toolbar = widget.widgets.find(w => w instanceof Toolbar) as Toolbar;
    return toolbar ?? new Toolbar();
  };

  const toolbar = getToolbar();
  const itemAdded = toolbar.addItem('debugger-button', button);
  if (itemAdded && widget instanceof ConsolePanel) {
    widget.insertWidget(0, toolbar);
  }
}

/**
 * A handler for debugging a widget.
 */
class DebuggerHandler<
  H extends ConsoleHandler | NotebookHandler | FileHandler
> {
  /**
   * Instantiate a new DebuggerHandler.
   * @param builder The debug handler builder.
   */
  constructor(builder: new (option: any) => H) {
    this._builder = builder;
  }

  /**
   * Dispose all the handlers.
   * @param debug The debug service.
   */
  disposeAll(debug: IDebugger) {
    const handlerIds = Object.keys(this._handlers);
    if (handlerIds.length === 0) {
      return;
    }
    debug.session.dispose();
    debug.session = null;
    handlerIds.forEach(id => {
      this._handlers[id].dispose();
    });
    this._handlers = {};
  }

  /**
   * Update a debug handler for the given widget.
   * @param debug The debug service.
   * @param widget The widget to update.
   */
  async update<W extends ConsolePanel | NotebookPanel | DocumentWidget>(
    debug: IDebugger,
    widget: W,
    client: IClientSession | Session.ISession
  ): Promise<void> {
    const debuggingEnabled = await debug.isAvailable(client);
    if (!debug.model || !debuggingEnabled) {
      return;
    }

    // update the active debug session
    if (!debug.session) {
      debug.session = new DebugSession({ client: client });
    } else {
      debug.session.client = client;
    }

    const updateAttribute = () => {
      if (!debug.isStarted) {
        widget.node.removeAttribute('data-jp-debugger');
        return;
      }
      widget.node.setAttribute('data-jp-debugger', 'true');
    };

    const createHandler = async () => {
      if (this._handlers[widget.id]) {
        return;
      }
      this._handlers[widget.id] = new this._builder({
        debuggerService: debug,
        widget
      });
      updateAttribute();
    };

    const removeHandler = () => {
      const handler = this._handlers[widget.id];
      if (!handler) {
        return;
      }
      handler.dispose();
      delete this._handlers[widget.id];
      updateAttribute();
    };

    const toggleDebugging = async () => {
      if (debug.isStarted) {
        await debug.stop();
        removeHandler();
      } else {
        await debug.restoreState(true);
        await createHandler();
      }
    };

    await debug.restoreState(false);
    updateToolbar(widget, toggleDebugging);

    // check the state of the debug session
    if (!debug.isStarted) {
      removeHandler();
      return;
    }

    // if the debugger is started but there is no handler, create a new one
    await createHandler();

    // listen to the disposed signals
    widget.disposed.connect(removeHandler);
    debug.model.disposed.connect(removeHandler);
  }

  private _handlers: { [id: string]: H } = {};
  private _builder: new (option: any) => H;
}

/**
 * A plugin that provides visual debugging support for consoles.
 */
const consoles: JupyterFrontEndPlugin<void> = {
  id: '@jupyterlab/debugger:consoles',
  autoStart: true,
  requires: [IDebugger, ILabShell],
  activate: (app: JupyterFrontEnd, debug: IDebugger, labShell: ILabShell) => {
    const handler = new DebuggerHandler<ConsoleHandler>(ConsoleHandler);
    debug.model.disposed.connect(() => {
      handler.disposeAll(debug);
    });

    labShell.currentChanged.connect(async (_, update) => {
      const widget = update.newValue;
      if (!(widget instanceof ConsolePanel)) {
        return;
      }
      await handler.update(debug, widget, widget.session);
      app.commands.notifyCommandChanged();
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
    const handler = new DebuggerHandler<FileHandler>(FileHandler);
    debug.model.disposed.connect(() => {
      handler.disposeAll(debug);
    });

    const activeSessions: {
      [id: string]: Session.ISession;
    } = {};

    labShell.currentChanged.connect(async (_, update) => {
      const widget = update.newValue;
      if (!(widget instanceof DocumentWidget)) {
        return;
      }

      const content = widget.content;
      if (!(content instanceof FileEditor)) {
        return;
      }

      const sessions = app.serviceManager.sessions;
      try {
        const model = await sessions.findByPath(widget.context.path);
        let session = activeSessions[model.id];
        if (!session) {
          // Use `connectTo` only if the session does not exist.
          // `connectTo` sends a kernel_info_request on the shell
          // channel, which blocks the debug session restore when waiting
          // for the kernel to be ready
          session = sessions.connectTo(model);
          activeSessions[model.id] = session;
        }
        await handler.update(debug, widget, session);
        app.commands.notifyCommandChanged();
      } catch {
        return;
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
  requires: [IDebugger, ILabShell],
  activate: (app: JupyterFrontEnd, debug: IDebugger, labShell: ILabShell) => {
    const handler = new DebuggerHandler<NotebookHandler>(NotebookHandler);
    debug.model.disposed.connect(() => {
      handler.disposeAll(debug);
    });

    labShell.currentChanged.connect(async (_, update) => {
      const widget = update.newValue;
      if (!(widget instanceof NotebookPanel)) {
        return;
      }
      await handler.update(debug, widget, widget.session);
      app.commands.notifyCommandChanged();
    });
  }
};

/**
 * A plugin that tracks notebook, console and file editors used for debugging.
 */
const tracker: JupyterFrontEndPlugin<void> = {
  id: '@jupyterlab/debugger:tracker',
  autoStart: true,
  requires: [IDebugger, IEditorServices],
  optional: [INotebookTracker, IConsoleTracker, IEditorTracker],
  activate: (
    app: JupyterFrontEnd,
    debug: IDebugger,
    editorServices: IEditorServices,
    notebookTracker: INotebookTracker,
    consoleTracker: IConsoleTracker,
    editorTracker: IEditorTracker
  ) => {
    new TrackerHandler({
      shell: app.shell,
      editorServices,
      debuggerService: debug,
      notebookTracker,
      consoleTracker,
      editorTracker
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

    const service = new DebugService();

    let sidebar: Debugger.Sidebar;

    commands.addCommand(CommandIDs.close, {
      label: 'Close Debugger',
      isEnabled: () => {
        return !!sidebar;
      },
      execute: () => {
        if (!sidebar) {
          return;
        }
        sidebar.close();
        sidebar.dispose();
        sidebar = null;
        commands.notifyCommandChanged();
      }
    });

    app.contextMenu.addItem({
      command: CommandIDs.close,
      selector: '.jp-DebuggerSidebar'
    });

    commands.addCommand(CommandIDs.debugContinue, {
      label: 'Continue',
      caption: 'Continue',
      iconClass: 'jp-MaterialIcon jp-RunIcon',
      isEnabled: () => {
        return service.hasStoppedThreads();
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
        return service.hasStoppedThreads();
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
        return service.hasStoppedThreads();
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
        return service.hasStoppedThreads();
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
        return service.hasStoppedThreads();
      },
      execute: async () => {
        await service.stepOut();
      }
    });

    commands.addCommand(CommandIDs.create, {
      label: 'Debugger',
      execute: async () => {
        if (sidebar) {
          return;
        }

        const callstackCommands = {
          registry: commands,
          continue: CommandIDs.debugContinue,
          terminate: CommandIDs.terminate,
          next: CommandIDs.next,
          stepIn: CommandIDs.stepIn,
          stepOut: CommandIDs.stepOut
        };

        sidebar = new Debugger.Sidebar({
          service,
          callstackCommands,
          editorServices
        });

        sidebar.service.eventMessage.connect(_ => {
          commands.notifyCommandChanged();
        });

        sidebar.service.sessionChanged.connect(_ => {
          commands.notifyCommandChanged();
        });

        if (labShell.currentWidget) {
          labShell.currentWidget.activate();
        }

        if (restorer) {
          restorer.add(sidebar, 'debugger-sidebar');
        }

        shell.add(sidebar, 'right');
      }
    });

    if (palette) {
      const category = 'Debugger';
      [
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

    void commands.execute(CommandIDs.create);

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
  tracker,
  main
];

export default plugins;
