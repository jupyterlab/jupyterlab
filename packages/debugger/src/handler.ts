// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { JupyterFrontEnd } from '@jupyterlab/application';
import { ISessionContext, SessionContext } from '@jupyterlab/apputils';
import { ConsolePanel } from '@jupyterlab/console';
import { IChangedArgs } from '@jupyterlab/coreutils';
import { DocumentWidget } from '@jupyterlab/docregistry';
import { FileEditor } from '@jupyterlab/fileeditor';
import { NotebookPanel } from '@jupyterlab/notebook';
import { Kernel, KernelMessage, Session } from '@jupyterlab/services';
import { ITranslator, nullTranslator } from '@jupyterlab/translation';
import { bugDotIcon, bugIcon, ToolbarButton } from '@jupyterlab/ui-components';
import { Debugger } from './debugger';
import { ConsoleHandler } from './handlers/console';
import { FileHandler } from './handlers/file';
import { NotebookHandler } from './handlers/notebook';
import { IDebugger } from './tokens';

const TOOLBAR_DEBUGGER_ITEM = 'debugger-icon';

/**
 * Add a bug icon to the widget toolbar to enable and disable debugging.
 *
 * @param widget The widget to add the debug toolbar button to.
 * @param onClick The callback when the toolbar button is clicked.
 */
function updateIconButton(
  widget: DebuggerHandler.SessionWidget[DebuggerHandler.SessionType],
  onClick: () => void,
  enabled?: boolean,
  pressed?: boolean,
  translator: ITranslator = nullTranslator
): ToolbarButton {
  const trans = translator.load('jupyterlab');
  const icon = new ToolbarButton({
    className: 'jp-DebuggerBugButton',
    icon: bugIcon,
    tooltip: trans.__('Enable Debugger'),
    pressedIcon: bugDotIcon,
    pressedTooltip: trans.__('Disable Debugger'),
    disabledTooltip: trans.__(
      'Select a kernel that supports debugging to enable debugger'
    ),
    enabled,
    pressed,
    onClick
  });
  if (!widget.toolbar.insertBefore('kernelName', TOOLBAR_DEBUGGER_ITEM, icon)) {
    widget.toolbar.addItem(TOOLBAR_DEBUGGER_ITEM, icon);
  }

  return icon;
}

/**
 * Updates button state to on/off,
 * adds/removes css class to update styling
 *
 * @param widget the debug button widget
 * @param pressed true if pressed, false otherwise
 * @param enabled true if widget enabled, false otherwise
 * @param onClick click handler
 */
function updateIconButtonState(
  widget: ToolbarButton,
  pressed: boolean,
  enabled: boolean = true,
  onClick?: () => void
) {
  if (widget) {
    widget.enabled = enabled;
    widget.pressed = pressed;
    if (onClick) {
      widget.onClick = onClick;
    }
  }
}

/**
 * A handler for debugging a widget.
 */
export class DebuggerHandler implements DebuggerHandler.IHandler {
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
   * Get the active widget.
   */
  get activeWidget():
    | DebuggerHandler.SessionWidget[DebuggerHandler.SessionType]
    | null {
    return this._activeWidget;
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
      delete this._iopubMessageHandlers[widget.id];
      return this.updateWidget(widget, connection);
    }

    const kernelChanged = (): void => {
      void this.updateWidget(widget, connection);
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
        void this.updateWidget(widget, connection);
      }
    };
    const statusChangedHandler = this._statusChangedHandlers[widget.id];
    if (statusChangedHandler) {
      connection.statusChanged.disconnect(statusChangedHandler);
    }
    connection.statusChanged.connect(statusChanged);
    this._statusChangedHandlers[widget.id] = statusChanged;

    const iopubMessage = (
      _: Session.ISessionConnection,
      msg: KernelMessage.IIOPubMessage
    ): void => {
      if (
        this._service.isStarted &&
        !this._service.hasStoppedThreads() &&
        (msg.parent_header as KernelMessage.IHeader).msg_type ===
          'execute_request'
      ) {
        void this._service.displayDefinedVariables();
      }
    };
    const iopubMessageHandler = this._iopubMessageHandlers[widget.id];
    if (iopubMessageHandler) {
      connection.iopubMessage.disconnect(iopubMessageHandler);
    }
    connection.iopubMessage.connect(iopubMessage);
    this._iopubMessageHandlers[widget.id] = iopubMessage;
    this._activeWidget = widget;

    return this.updateWidget(widget, connection);
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

    const contextKernelChangedHandlers =
      this._contextKernelChangedHandlers[widget.id];

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
  async updateWidget(
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
      delete this._iopubMessageHandlers[widget.id];
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

    const addToolbarButton = (enabled: boolean = true): void => {
      const debugButton = this._iconButtons[widget.id];
      if (!debugButton) {
        this._iconButtons[widget.id] = updateIconButton(
          widget,
          toggleDebugging,
          this._service.isStarted,
          enabled
        );
      } else {
        updateIconButtonState(
          debugButton,
          this._service.isStarted,
          enabled,
          toggleDebugging
        );
      }
    };

    const isDebuggerOn = (): boolean => {
      return (
        this._service.isStarted &&
        this._previousConnection?.id === connection?.id
      );
    };

    const stopDebugger = async (): Promise<void> => {
      this._service.session!.connection = connection;
      await this._service.stop();
    };

    const startDebugger = async (): Promise<void> => {
      this._service.session!.connection = connection;
      this._previousConnection = connection;
      await this._service.restoreState(true);
      await this._service.displayDefinedVariables();
      if (this._service.session?.capabilities?.supportsModulesRequest) {
        await this._service.displayModules();
      }
    };

    const toggleDebugging = async (): Promise<void> => {
      // bail if the widget doesn't have focus
      if (!hasFocus()) {
        return;
      }
      const debugButton = this._iconButtons[widget.id]!;
      if (isDebuggerOn()) {
        await stopDebugger();
        removeHandlers();
        updateIconButtonState(debugButton, false);
      } else {
        await startDebugger();
        createHandler();
        updateIconButtonState(debugButton, true);
      }
    };

    addToolbarButton(false);

    // listen to the disposed signals
    widget.disposed.connect(async () => {
      if (isDebuggerOn()) {
        await stopDebugger();
      }
      removeHandlers();
      delete this._iconButtons[widget.id];
      delete this._contextKernelChangedHandlers[widget.id];
    });

    const debuggingEnabled = await this._service.isAvailable(connection);
    if (!debuggingEnabled) {
      removeHandlers();
      updateIconButtonState(this._iconButtons[widget.id]!, false, false);
      return;
    }

    // update the active debug session
    if (!this._service.session) {
      this._service.session = new Debugger.Session({
        connection,
        config: this._service.config
      });
    } else {
      this._previousConnection = this._service.session!.connection?.kernel
        ? this._service.session.connection
        : null;
      this._service.session.connection = connection;
    }
    await this._service.restoreState(false);
    if (this._service.isStarted && !this._service.hasStoppedThreads()) {
      await this._service.displayDefinedVariables();
      if (this._service.session?.capabilities?.supportsModulesRequest) {
        await this._service.displayModules();
      }
    }

    updateIconButtonState(
      this._iconButtons[widget.id]!,
      this._service.isStarted,
      true
    );

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
  }

  private _type: DebuggerHandler.SessionType;
  private _shell: JupyterFrontEnd.IShell;
  private _service: IDebugger;
  private _previousConnection: Session.ISessionConnection | null;
  private _activeWidget:
    | DebuggerHandler.SessionWidget[DebuggerHandler.SessionType]
    | null;
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
  private _iopubMessageHandlers: {
    [id: string]: (
      sender: Session.ISessionConnection,
      msg: KernelMessage.IIOPubMessage
    ) => void;
  } = {};
  private _iconButtons: {
    [id: string]: ToolbarButton | undefined;
  } = {};
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
   * An interface for debugger handler.
   */
  export interface IHandler {
    /**
     * Get the active widget.
     */
    activeWidget:
      | DebuggerHandler.SessionWidget[DebuggerHandler.SessionType]
      | null;

    /**
     * Update a debug handler for the given widget, and
     * handle kernel changed events.
     *
     * @param widget The widget to update.
     * @param connection The session connection.
     */
    update(
      widget: DebuggerHandler.SessionWidget[DebuggerHandler.SessionType],
      connection: Session.ISessionConnection | null
    ): Promise<void>;

    /**
     * Update a debug handler for the given widget, and
     * handle connection kernel changed events.
     *
     * @param widget The widget to update.
     * @param sessionContext The session context.
     */
    updateContext(
      widget: DebuggerHandler.SessionWidget[DebuggerHandler.SessionType],
      sessionContext: ISessionContext
    ): Promise<void>;
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
