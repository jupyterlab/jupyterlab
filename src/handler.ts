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

import { bugIcon } from '@jupyterlab/ui-components';

import { DisposableSet } from '@lumino/disposable';

import { DebuggerModel } from './model';

import { DebugSession } from './session';

import { IDebugger } from './tokens';

import { IDebuggerEditorFinder } from './editor-finder';

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
  onClick: () => void
): DisposableSet {
  const icon = new ToolbarButton({
    className: 'jp-DebuggerBugButton',
    icon: bugIcon,
    tooltip: 'Enable / Disable Debugger',
    onClick
  });
  widget.toolbar.addItem('debugger-icon', icon);

  const button = new ToolbarButton({
    iconClass: 'jp-ToggleSwitch',
    tooltip: 'Enable / Disable Debugger',
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
    this._editorFinder = options.editorFinder;
  }

  /**
   * Dispose all the handlers.
   *
   * @param debug The debug service.
   */
  disposeAll(debug: IDebugger): void {
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
   *
   * @param widget The widget to update.
   * @param connection The session connection.
   */
  async update(
    widget: DebuggerHandler.SessionWidget[DebuggerHandler.SessionType],
    connection: Session.ISessionConnection
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
    connection: Session.ISessionConnection
  ): Promise<void> {
    if (!this._service.model) {
      return;
    }

    const hasFocus = (): boolean => {
      return this._shell.currentWidget && this._shell.currentWidget === widget;
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

      // clear the model if the handler being removed corresponds
      // to the current active debug session
      if (this._service.session?.connection?.path === connection?.path) {
        const model = this._service.model as DebuggerModel;
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
        this._previousConnection.id === connection.id
      ) {
        this._service.session.connection = connection;
        await this._service.stop();
        removeHandlers();
      } else {
        this._service.session.connection = connection;
        this._previousConnection = connection;
        await this._service.restoreState(true, this._editorFinder);
        await createHandler();
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
      this._service.session = new DebugSession({ connection });
    } else {
      this._previousConnection = this._service.session.connection.kernel
        ? this._service.session.connection
        : null;
      this._service.session.connection = connection;
    }

    await this._service.restoreState(false, this._editorFinder);
    addToolbarButton();

    // check the state of the debug session
    if (!this._service.isStarted) {
      removeHandlers();
      this._service.session.connection = this._previousConnection ?? connection;
      await this._service.restoreState(false, this._editorFinder);
      return;
    }

    // if the debugger is started but there is no handler, create a new one
    createHandler();
    this._previousConnection = connection;

    // listen to the disposed signals
    widget.disposed.connect(removeHandlers);
    this._service.model.disposed.connect(removeHandlers);
  }

  private _type: DebuggerHandler.SessionType;
  private _shell: JupyterFrontEnd.IShell;
  private _service: IDebugger;
  private _editorFinder: IDebuggerEditorFinder;
  private _previousConnection: Session.ISessionConnection;
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

    /**
     * The editor finder.
     */
    editorFinder?: IDebuggerEditorFinder;
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
