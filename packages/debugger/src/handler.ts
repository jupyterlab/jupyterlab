// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { JupyterFrontEnd } from '@jupyterlab/application';

import {
  ISessionContext,
  SessionContext,
  ToolbarButton
} from '@jupyterlab/apputils';

import { ConsolePanel } from '@jupyterlab/console';

import { IChangedArgs } from '@jupyterlab/coreutils';

import { DocumentWidget } from '@jupyterlab/docregistry';

import { FileEditor } from '@jupyterlab/fileeditor';

import { NotebookPanel } from '@jupyterlab/notebook';

import { Kernel, Session } from '@jupyterlab/services';

import { nullTranslator, ITranslator } from '@jupyterlab/translation';

import { bugIcon } from '@jupyterlab/ui-components';

import { DisposableSet } from '@lumino/disposable';

import { Debugger } from './debugger';

import { IDebugger } from './tokens';

import { ConsoleHandler } from './handlers/console';

import { FileHandler } from './handlers/file';

import { NotebookHandler } from './handlers/notebook';

/**
 * Add a button to the widget toolbar to enable and disable debugging.
 *
 * @param widget The widget to add the debug toolbar button to.
 * @param onClick The callback when the toolbar button is clicked.
 */
function updateToolbar(
  widget: DebuggerHandler.SessionWidget[DebuggerHandler.SessionType],
  onClick: () => void,
  translator?: ITranslator
): DisposableSet {
  translator = translator || nullTranslator;
  const trans = translator.load('jupyterlab');
  const icon = new ToolbarButton({
    className: 'jp-DebuggerBugButton',
    icon: bugIcon,
    tooltip: trans.__('Enable / Disable Debugger'),
    onClick
  });
  widget.toolbar.addItem('debugger-icon', icon);

  const button = new ToolbarButton({
    iconClass: 'jp-ToggleSwitch',
    tooltip: trans.__('Enable / Disable Debugger'),
    onClick
  });
  widget.toolbar.addItem('debugger-button', button);

  const elements = new DisposableSet();
  elements.add(icon);
  elements.add(button);
  return elements;
}

/**
 * A handler for debugging a widget.
 */
export class DebuggerHandler {
  /**
   * Instantiate a new DebuggerHandler.
   *
   * @param options The instantiation options for a DebuggerHandler.
   */
  constructor(options: DebuggerHandler.IOptions) {
    this._type = options.type;
    this._shell = options.shell;
    this._service = options.service;
  }

  /**
   * Update a debug handler for the given widget, and
   * handle kernel changed events.
   *
   * @param widget The widget to update.
   * @param connection The session connection.
   */
  async update(
    widget: DebuggerHandler.SessionWidget[DebuggerHandler.SessionType],
    connection: Session.ISessionConnection | null
  ): Promise<void> {
    if (!connection) {
      delete this._kernelChangedHandlers[widget.id];
      delete this._statusChangedHandlers[widget.id];
      return this._update(widget, connection);
    }

    const kernelChanged = (): void => {
      void this._update(widget, connection);
    };
    const kernelChangedHandler = this._kernelChangedHandlers[widget.id];

    if (kernelChangedHandler) {
      connection.kernelChanged.disconnect(kernelChangedHandler);
    }
    this._kernelChangedHandlers[widget.id] = kernelChanged;
    connection.kernelChanged.connect(kernelChanged);

    const statusChanged = (
      _: Session.ISessionConnection,
      status: Kernel.Status
    ): void => {
      // FIXME-TRANS: Localizable?
      if (status.endsWith('restarting')) {
        void this._update(widget, connection);
      }
    };
    const statusChangedHandler = this._statusChangedHandlers[widget.id];
    if (statusChangedHandler) {
      connection.statusChanged.disconnect(statusChangedHandler);
    }
    connection.statusChanged.connect(statusChanged);
    this._statusChangedHandlers[widget.id] = statusChanged;

    return this._update(widget, connection);
  }

  /**
   * Update a debug handler for the given widget, and
   * handle connection kernel changed events.
   *
   * @param widget The widget to update.
   * @param sessionContext The session context.
   */
  async updateContext(
    widget: DebuggerHandler.SessionWidget[DebuggerHandler.SessionType],
    sessionContext: ISessionContext
  ): Promise<void> {
    const connectionChanged = (): void => {
      const { session: connection } = sessionContext;
      void this.update(widget, connection);
    };

    const contextKernelChangedHandlers = this._contextKernelChangedHandlers[
      widget.id
    ];

    if (contextKernelChangedHandlers) {
      sessionContext.kernelChanged.disconnect(contextKernelChangedHandlers);
    }
    this._contextKernelChangedHandlers[widget.id] = connectionChanged;
    sessionContext.kernelChanged.connect(connectionChanged);

    return this.update(widget, sessionContext.session);
  }

  /**
   * Update a debug handler for the given widget.
   *
   * @param widget The widget to update.
   * @param connection The session connection.
   */
  private async _update(
    widget: DebuggerHandler.SessionWidget[DebuggerHandler.SessionType],
    connection: Session.ISessionConnection | null
  ): Promise<void> {
    if (!this._service.model || !connection) {
      return;
    }

    const hasFocus = (): boolean => {
      return this._shell.currentWidget === widget;
    };

    const updateAttribute = (): void => {
      if (!this._handlers[widget.id]) {
        widget.node.removeAttribute('data-jp-debugger');
        return;
      }
      widget.node.setAttribute('data-jp-debugger', 'true');
    };

    const createHandler = (): void => {
      if (this._handlers[widget.id]) {
        return;
      }

      switch (this._type) {
        case 'notebook':
          this._handlers[widget.id] = new NotebookHandler({
            debuggerService: this._service,
            widget: widget as NotebookPanel
          });
          break;
        case 'console':
          this._handlers[widget.id] = new ConsoleHandler({
            debuggerService: this._service,
            widget: widget as ConsolePanel
          });
          break;
        case 'file':
          this._handlers[widget.id] = new FileHandler({
            debuggerService: this._service,
            widget: widget as DocumentWidget<FileEditor>
          });
          break;
        default:
          throw Error(`No handler for the type ${this._type}`);
      }
      updateAttribute();
    };

    const removeHandlers = (): void => {
      const handler = this._handlers[widget.id];
      if (!handler) {
        return;
      }
      handler.dispose();
      delete this._handlers[widget.id];
      delete this._kernelChangedHandlers[widget.id];
      delete this._statusChangedHandlers[widget.id];
      delete this._contextKernelChangedHandlers[widget.id];

      // Clear the model if the handler being removed corresponds
      // to the current active debug session, or if the connection
      // does not have a kernel.
      if (
        this._service.session?.connection?.path === connection?.path ||
        !this._service.session?.connection?.kernel
      ) {
        const model = this._service.model;
        model.clear();
      }

      updateAttribute();
    };

    const addToolbarButton = (): void => {
      const button = this._buttons[widget.id];
      if (button) {
        return;
      }
      const newButton = updateToolbar(widget, toggleDebugging);
      this._buttons[widget.id] = newButton;
    };

    const removeToolbarButton = (): void => {
      const button = this._buttons[widget.id];
      if (!button) {
        return;
      }
      button.dispose();
      delete this._buttons[widget.id];
    };

    const toggleDebugging = async (): Promise<void> => {
      // bail if the widget doesn't have focus
      if (!hasFocus()) {
        return;
      }

      if (
        this._service.isStarted &&
        this._previousConnection?.id === connection?.id
      ) {
        this._service.session!.connection = connection;
        await this._service.stop();
        removeHandlers();
      } else {
        this._service.session!.connection = connection;
        this._previousConnection = connection;
        await this._service.restoreState(true);
        createHandler();
      }
    };

    const debuggingEnabled = await this._service.isAvailable(connection);
    if (!debuggingEnabled) {
      removeHandlers();
      removeToolbarButton();
      return;
    }

    // update the active debug session
    if (!this._service.session) {
      this._service.session = new Debugger.Session({ connection });
    } else {
      this._previousConnection = this._service.session!.connection?.kernel
        ? this._service.session.connection
        : null;
      this._service.session.connection = connection;
    }
    await this._service.restoreState(false);
    addToolbarButton();

    // check the state of the debug session
    if (!this._service.isStarted) {
      removeHandlers();
      this._service.session.connection = this._previousConnection ?? connection;
      await this._service.restoreState(false);
      return;
    }

    // if the debugger is started but there is no handler, create a new one
    createHandler();
    this._previousConnection = connection;

    // listen to the disposed signals
    widget.disposed.connect(removeHandlers);
  }

  private _type: DebuggerHandler.SessionType;
  private _shell: JupyterFrontEnd.IShell;
  private _service: IDebugger;
  private _previousConnection: Session.ISessionConnection | null;
  private _handlers: {
    [id: string]: DebuggerHandler.SessionHandler[DebuggerHandler.SessionType];
  } = {};

  private _contextKernelChangedHandlers: {
    [id: string]: (
      sender: SessionContext,
      args: IChangedArgs<
        Kernel.IKernelConnection,
        Kernel.IKernelConnection,
        'kernel'
      >
    ) => void;
  } = {};
  private _kernelChangedHandlers: {
    [id: string]: (
      sender: Session.ISessionConnection,
      args: IChangedArgs<
        Kernel.IKernelConnection,
        Kernel.IKernelConnection,
        'kernel'
      >
    ) => void;
  } = {};
  private _statusChangedHandlers: {
    [id: string]: (
      sender: Session.ISessionConnection,
      status: Kernel.Status
    ) => void;
  } = {};
  private _buttons: { [id: string]: DisposableSet } = {};
}

/**
 * A namespace for DebuggerHandler `statics`
 */
export namespace DebuggerHandler {
  /**
   * Instantiation options for a DebuggerHandler.
   */
  export interface IOptions {
    /**
     * The type of session.
     */
    type: SessionType;

    /**
     * The application shell.
     */
    shell: JupyterFrontEnd.IShell;

    /**
     * The debugger service.
     */
    service: IDebugger;
  }

  /**
   * The types of sessions that can be debugged.
   */
  export type SessionType = keyof SessionHandler;

  /**
   * The types of handlers.
   */
  export type SessionHandler = {
    notebook: NotebookHandler;
    console: ConsoleHandler;
    file: FileHandler;
  };

  /**
   * The types of widgets that can be debugged.
   */
  export type SessionWidget = {
    notebook: NotebookPanel;
    console: ConsolePanel;
    file: DocumentWidget;
  };
}
