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

import { DocumentWidget } from '@jupyterlab/docregistry';

import { FileEditor, IEditorTracker } from '@jupyterlab/fileeditor';

import { INotebookTracker, NotebookPanel } from '@jupyterlab/notebook';

import { Session } from '@jupyterlab/services';

import { Debugger } from './debugger';

import { ConsoleHandler } from './handlers/console';

import { FileHandler } from './handlers/file';

import { NotebookHandler } from './handlers/notebook';

import { TrackerHandler } from './handlers/tracker';

import { DebuggerModel } from './model';

import { DebuggerService } from './service';

import { DebugSession } from './session';

import { IDebugger } from './tokens';

/**
 * The command IDs used by the debugger plugin.
 */
export namespace CommandIDs {
  export const start = 'debugger:start';

  export const stop = 'debugger:stop';

  export const debugContinue = 'debugger:continue';

  export const terminate = 'debugger:terminate';

  export const next = 'debugger:next';

  export const stepIn = 'debugger:stepIn';

  export const stepOut = 'debugger:stepOut';
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
  return button;
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
   * Update a debug handler for the given widget, and
   * handle kernel changed events.
   * @param debug The debug service.
   * @param widget The widget to update.
   */
  async update<W extends ConsolePanel | NotebookPanel | DocumentWidget>(
    debug: IDebugger,
    widget: W,
    client: IClientSession | Session.ISession
  ): Promise<void> {
    const updateHandler = async () => {
      return this._update(debug, widget, client);
    };

    // setup handler when the kernel changes
    const kernelChangedHandler = this._kernelChangedHandlers[client.path];
    if (kernelChangedHandler) {
      client.kernelChanged.disconnect(kernelChangedHandler);
    }
    client.kernelChanged.connect(updateHandler);
    this._kernelChangedHandlers[client.path] = updateHandler;

    // setup handler when the status of the kernel changes (restart)
    // TODO: is there a better way to handle restarts?
    let restarted = false;
    const statusChanged = async () => {
      // wait for the first `idle` status after a restart
      if (restarted && client.status === 'idle') {
        restarted = false;
        return updateHandler();
      }
      // handle `starting`, `restarting` and `autorestarting`
      if (client.status.endsWith('starting')) {
        restarted = true;
      }
    };

    const statusChangedHandler = this._statusChangedHandlers[client.path];
    if (statusChangedHandler) {
      client.statusChanged.disconnect(statusChangedHandler);
    }
    client.statusChanged.connect(statusChanged);
    this._statusChangedHandlers[client.path] = statusChanged;

    return updateHandler();
  }

  /**
   * Update a debug handler for the given widget.
   * @param debug The debug service.
   * @param widget The widget to update.
   */
  private async _update<
    W extends ConsolePanel | NotebookPanel | DocumentWidget
  >(
    debug: IDebugger,
    widget: W,
    client: IClientSession | Session.ISession
  ): Promise<void> {
    if (!debug.model) {
      return;
    }

    const updateAttribute = () => {
      if (!this._handlers[widget.id]) {
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

    const removeHandlers = () => {
      const handler = this._handlers[widget.id];
      if (!handler) {
        return;
      }
      handler.dispose();
      delete this._handlers[widget.id];
      delete this._kernelChangedHandlers[widget.id];
      delete this._statusChangedHandlers[widget.id];

      // clear the model if the handler being removed corresponds
      // to the current active debug session
      if (debug.session?.client?.path === client.path) {
        const model = debug.model as DebuggerModel;
        model.clear();
      }

      updateAttribute();
    };

    const addToolbarButton = () => {
      const button = this._buttons[widget.id];
      if (button) {
        return;
      }
      const newButton = updateToolbar(widget, toggleDebugging);
      this._buttons[widget.id] = newButton;
    };

    const removeToolbarButton = () => {
      const button = this._buttons[widget.id];
      if (!button) {
        return;
      }
      button.parent = null;
      button.dispose();
      delete this._buttons[widget.id];
    };

    const toggleDebugging = async () => {
      if (debug.isStarted) {
        await debug.stop();
        removeHandlers();
      } else {
        await debug.restoreState(true);
        await createHandler();
      }
    };

    const debuggingEnabled = await debug.isAvailable(client);
    if (!debuggingEnabled) {
      removeHandlers();
      removeToolbarButton();
      return;
    }

    // update the active debug session
    if (!debug.session) {
      debug.session = new DebugSession({ client: client });
    } else {
      debug.session.client = client;
    }

    await debug.restoreState(false);
    addToolbarButton();

    // check the state of the debug session
    if (!debug.isStarted) {
      removeHandlers();
      return;
    }

    // if the debugger is started but there is no handler, create a new one
    await createHandler();

    // listen to the disposed signals
    widget.disposed.connect(removeHandlers);
    debug.model.disposed.connect(removeHandlers);
  }

  private _handlers: { [id: string]: H } = {};
  private _kernelChangedHandlers: { [id: string]: () => void } = {};
  private _statusChangedHandlers: { [id: string]: () => void } = {};
  private _buttons: { [id: string]: ToolbarButton } = {};
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
  requires: [IDebugger, ILabShell],
  activate: (app: JupyterFrontEnd, debug: IDebugger, labShell: ILabShell) => {
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
  requires: [IEditorServices],
  optional: [ILayoutRestorer, ICommandPalette],
  provides: IDebugger,
  autoStart: true,
  activate: (
    app: JupyterFrontEnd,
    editorServices: IEditorServices,
    restorer: ILayoutRestorer | null,
    palette: ICommandPalette | null
  ): IDebugger => {
    const { commands, shell } = app;

    const service = new DebuggerService();

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

    const callstackCommands = {
      registry: commands,
      continue: CommandIDs.debugContinue,
      terminate: CommandIDs.terminate,
      next: CommandIDs.next,
      stepIn: CommandIDs.stepIn,
      stepOut: CommandIDs.stepOut
    };

    const sidebar = new Debugger.Sidebar({
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

    if (restorer) {
      restorer.add(sidebar, 'debugger-sidebar');
    }

    shell.add(sidebar, 'right');

    if (palette) {
      const category = 'Debugger';
      [
        CommandIDs.debugContinue,
        CommandIDs.terminate,
        CommandIDs.next,
        CommandIDs.stepIn,
        CommandIDs.stepOut
      ].forEach(command => {
        palette.addItem({ command, category });
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
  tracker,
  main
];

export default plugins;
