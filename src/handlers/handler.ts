// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { JupyterFrontEnd } from '@jupyterlab/application';

import { IClientSession, Toolbar, ToolbarButton } from '@jupyterlab/apputils';

import { ConsolePanel } from '@jupyterlab/console';

import { DocumentWidget } from '@jupyterlab/docregistry';

import { NotebookPanel } from '@jupyterlab/notebook';

import { Session } from '@jupyterlab/services';

import { DebuggerModel } from '../model';

import { DebugSession } from '../session';

import { IDebugger } from '../tokens';

import { ConsoleHandler } from './console';

import { FileHandler } from './file';

import { NotebookHandler } from './notebook';

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
export class DebuggerHandler<
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
    shell: JupyterFrontEnd.IShell,
    debug: IDebugger,
    widget: W,
    client: IClientSession | Session.ISession
  ): Promise<void> {
    const updateHandler = async () => {
      return this._update(shell, debug, widget, client);
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
    shell: JupyterFrontEnd.IShell,
    debug: IDebugger,
    widget: W,
    client: IClientSession | Session.ISession
  ): Promise<void> {
    if (!debug.model) {
      return;
    }

    const hasFocus = () => {
      return shell.currentWidget && shell.currentWidget === widget;
    };

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
      // bail if the widget doesn't have focus
      if (!hasFocus()) {
        return;
      }

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
