// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import type { JupyterFrontEnd } from '@jupyterlab/application';
import type { ISessionContext, SessionContext } from '@jupyterlab/apputils';
import type { ConsolePanel } from '@jupyterlab/console';
import type { IChangedArgs } from '@jupyterlab/coreutils';
import type { DocumentWidget } from '@jupyterlab/docregistry';
import type { FileEditor } from '@jupyterlab/fileeditor';
import type { NotebookPanel } from '@jupyterlab/notebook';
import type { ISettingRegistry } from '@jupyterlab/settingregistry';
import type { Kernel, KernelMessage, Session } from '@jupyterlab/services';
import type { IAnyMessageArgs } from '@jupyterlab/services/src/kernel/kernel';
import type { ITranslator } from '@jupyterlab/translation';
import { nullTranslator } from '@jupyterlab/translation';
import { bugDotIcon, bugIcon, ToolbarButton } from '@jupyterlab/ui-components';
import { Debugger } from './debugger';
import { ConsoleHandler } from './handlers/console';
import { FileHandler } from './handlers/file';
import { NotebookHandler } from './handlers/notebook';
import type { IDebugger } from './tokens';
import type { CommandRegistry } from '@lumino/commands';
import type { ReadonlyJSONObject } from '@lumino/coreutils';
import type { IDisposable } from '@lumino/disposable';
import { Signal } from '@lumino/signaling';
import type { ISignal } from '@lumino/signaling';
import type { Widget } from '@lumino/widgets';

const TOOLBAR_DEBUGGER_ITEM = 'debugger-icon';

interface IDebuggerAvailability {
  kernelId: string;
  available: boolean;
}

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
export class DebuggerHandler implements DebuggerHandler.IHandler, IDisposable {
  private static _instances = new Set<DebuggerHandler>();

  /**
   * Find a DebuggerHandler that can handle the given widget (or the active widget).
   *
   * @param widget - The widget to check.
   */
  static findHandler(widget?: Widget | null): {
    handler: DebuggerHandler;
    widget: DebuggerHandler.SessionWidget[DebuggerHandler.SessionType];
  } | null {
    for (const handler of DebuggerHandler._instances) {
      if (widget) {
        const target = handler.getWidget(widget);
        if (target) {
          return { handler, widget: target };
        }
      } else if (handler.activeWidget) {
        return { handler, widget: handler.activeWidget };
      }
    }
    return null;
  }

  /**
   * Instantiate a new DebuggerHandler.
   *
   * @param options - The instantiation options for a DebuggerHandler.
   */
  constructor(options: DebuggerHandler.IOptions) {
    this._type = options.type;
    this._shell = options.shell;
    this._service = options.service;
    this._translator = options.translator || nullTranslator;
    this._commands = options.commands || null;
    this._executionDone = new Signal(this);
    DebuggerHandler._instances.add(this);
  }

  /**
   * Whether the handler is disposed.
   */
  get isDisposed(): boolean {
    return this._isDisposed;
  }

  /**
   * Dispose of the resources held by the handler.
   */
  dispose(): void {
    if (this._isDisposed) {
      return;
    }
    this._isDisposed = true;
    DebuggerHandler._instances.delete(this);
    Signal.clearData(this);
  }

  /**
   * Get the session widget tracked by this handler that matches or contains the given widget.
   *
   * @param widget - The widget to check.
   */
  getWidget(
    widget: Widget
  ): DebuggerHandler.SessionWidget[DebuggerHandler.SessionType] | null {
    if (this._widgets[widget.id]) {
      return this._widgets[widget.id];
    }
    for (const id in this._widgets) {
      const w = this._widgets[id];
      if (w && (w === widget || w.node.contains(widget.node))) {
        return w;
      }
    }
    return null;
  }

  /**
   * Whether the handler tracks the given widget.
   *
   * @param widget - The widget to check.
   */
  hasWidget(widget: Widget): boolean {
    return this.getWidget(widget) !== null;
  }

  /**
   * Whether debugging is on for the given widget (or the active widget).
   *
   * @param widget - The widget to check.
   */
  isDebuggerOn(
    widget?: DebuggerHandler.SessionWidget[DebuggerHandler.SessionType]
  ): boolean {
    const target = widget ?? this._activeWidget;
    if (!target) {
      return false;
    }
    const connection = this._connections[target.id];
    return (
      this._service.isStarted && this._previousConnection?.id === connection?.id
    );
  }

  /**
   * Whether debugging is available for the given widget (or the active widget).
   *
   * @param widget - The widget to check.
   */
  isAvailable(
    widget?: DebuggerHandler.SessionWidget[DebuggerHandler.SessionType]
  ): boolean {
    const target = widget ?? this._activeWidget;
    if (!target) {
      return false;
    }
    return this._debuggerAvailability[target.id]?.available ?? false;
  }

  /**
   * Enable debugging for the given widget (or the active widget).
   *
   * @param widget - The widget to enable debugging for.
   */
  async enable(
    widget?: DebuggerHandler.SessionWidget[DebuggerHandler.SessionType]
  ): Promise<void> {
    const target = widget ?? this._activeWidget;
    if (!target || target.isDisposed) {
      return;
    }
    const connection = this._connections[target.id];
    if (!connection || !this.isAvailable(target) || this.isDebuggerOn(target)) {
      return;
    }
    const debugButton = this._iconButtons[target.id];
    if (this._pendingToggle) {
      return;
    }
    this._pendingToggle = true;
    try {
      if (!this._service.session) {
        this._service.session = new Debugger.Session({
          connection,
          config: this._service.config
        });
      } else {
        this._previousConnection = this._service.session.connection?.kernel
          ? this._service.session.connection
          : null;
        this._service.session.connection = connection;
      }
      this._previousConnection = connection;
      await this._service.restoreState(true);
      await this._service.displayDefinedVariables();
      if (this._service.session?.capabilities?.supportsModulesRequest) {
        await this._service.displayModules();
      }
      this._createHandler(target);
      if (debugButton) {
        updateIconButtonState(debugButton, true);
      }
    } catch (error) {
      console.error(
        'Could not enable the debugger:',
        error instanceof Error ? error.message : String(error)
      );
      if (debugButton && !debugButton.isDisposed) {
        debugButton.pressed = this.isDebuggerOn(target);
      }
    } finally {
      this._pendingToggle = false;
      this._notifyCommands();
    }
  }

  /**
   * Disable debugging for the given widget (or the active widget).
   *
   * @param widget - The widget to disable debugging for.
   */
  async disable(
    widget?: DebuggerHandler.SessionWidget[DebuggerHandler.SessionType]
  ): Promise<void> {
    const target = widget ?? this._activeWidget;
    if (!target || target.isDisposed) {
      return;
    }
    const connection = this._connections[target.id];
    if (!connection || !this.isDebuggerOn(target)) {
      return;
    }
    const debugButton = this._iconButtons[target.id];
    if (this._pendingToggle) {
      return;
    }
    this._pendingToggle = true;
    try {
      this._service.session!.connection = connection;
      await this._service.stop();
      this._removeHandlers(target, connection);
      if (debugButton) {
        updateIconButtonState(debugButton, false);
      }
    } catch (error) {
      console.error(
        'Could not disable the debugger:',
        error instanceof Error ? error.message : String(error)
      );
      if (debugButton && !debugButton.isDisposed) {
        debugButton.pressed = this.isDebuggerOn(target);
      }
    } finally {
      this._pendingToggle = false;
      this._notifyCommands();
    }
  }

  /**
   * Toggle debugging for the given widget (or the active widget).
   *
   * @param widget - The widget to toggle debugging for.
   */
  async toggle(
    widget?: DebuggerHandler.SessionWidget[DebuggerHandler.SessionType]
  ): Promise<void> {
    const target = widget ?? this._activeWidget;
    if (!target) {
      return;
    }
    if (this.isDebuggerOn(target)) {
      await this.disable(target);
    } else {
      await this.enable(target);
    }
  }

  private _createHandler(
    widget: DebuggerHandler.SessionWidget[DebuggerHandler.SessionType]
  ): void {
    if (this._handlers[widget.id] || widget.isDisposed) {
      return;
    }

    switch (this._type) {
      case 'notebook':
        this._handlers[widget.id] = new NotebookHandler({
          debuggerService: this._service,
          widget: widget as NotebookPanel,
          translator: this._translator || undefined
        });
        break;
      case 'console':
        this._handlers[widget.id] = new ConsoleHandler({
          debuggerService: this._service,
          widget: widget as ConsolePanel,
          translator: this._translator || undefined
        });
        break;
      case 'file':
        this._handlers[widget.id] = new FileHandler({
          debuggerService: this._service,
          widget: widget as DocumentWidget<FileEditor>,
          translator: this._translator || undefined
        });
        break;
      default:
        throw Error(`No handler for the type ${this._type}`);
    }
    this._updateAttribute(widget);
  }

  private _removeHandlers(
    widget: DebuggerHandler.SessionWidget[DebuggerHandler.SessionType],
    connection?: Session.ISessionConnection | null,
    onStopped?: () => void
  ): void {
    if (onStopped) {
      this._service.stopped.disconnect(onStopped, widget);
    }

    const conn = connection ?? this._connections[widget.id];
    const handler = this._handlers[widget.id];
    if (!handler) {
      return;
    }

    if (conn) {
      Signal.disconnectBetween(conn, widget);
    }
    delete this._kernelChangedHandlers[widget.id];
    delete this._statusChangedHandlers[widget.id];
    delete this._iopubMessageHandlers[widget.id];
    delete this._shellMessageHandlers[widget.id];

    handler.dispose();
    delete this._handlers[widget.id];
    delete this._contextKernelChangedHandlers[widget.id];

    if (
      this._service.session?.connection?.path === conn?.path ||
      !this._service.session?.connection?.kernel
    ) {
      const model = this._service.model;
      model.clear();
    }

    this._updateAttribute(widget);
  }

  private _updateAttribute(
    widget: DebuggerHandler.SessionWidget[DebuggerHandler.SessionType]
  ): void {
    if (!this._handlers[widget.id]) {
      widget.node.removeAttribute('data-jp-debugger');
      return;
    }
    widget.node.setAttribute('data-jp-debugger', 'true');
  }

  private _notifyCommands(): void {
    if (this._commands) {
      Object.values(Debugger.CommandIDs).forEach(command => {
        if (this._commands!.hasCommand(command)) {
          this._commands!.notifyCommandChanged(command);
        }
      });
    }
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
   * Returns a signal when receiving the execute_reply message on the shell websocket.
   */
  get executionDone(): ISignal<this, void> {
    return this._executionDone;
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
    // The caller may reach this point after awaiting session readiness, by
    // which time the widget can already be disposed; connecting handlers for
    // it then would leave them on the session connection permanently.
    if (widget.isDisposed) {
      return;
    }
    this._widgets[widget.id] = widget;
    this._connections[widget.id] = connection;
    if (!connection) {
      delete this._kernelChangedHandlers[widget.id];
      delete this._statusChangedHandlers[widget.id];
      delete this._iopubMessageHandlers[widget.id];
      return this.updateWidget(widget, connection);
    }

    // All per-widget handlers below are connected with `widget` as receiver:
    // their senders (the session connection and the debugger service) outlive
    // the widget, and the receiver makes `Widget.dispose()` remove any
    // connection missed by the explicit disconnects via
    // `Signal.clearData(this)`.
    const kernelChanged = (): void => {
      void this.updateWidget(widget, connection);
    };
    const kernelChangedHandler = this._kernelChangedHandlers[widget.id];

    if (kernelChangedHandler) {
      connection.kernelChanged.disconnect(kernelChangedHandler, widget);
    }
    this._kernelChangedHandlers[widget.id] = kernelChanged;
    connection.kernelChanged.connect(kernelChanged, widget);

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
      connection.statusChanged.disconnect(statusChangedHandler, widget);
    }
    connection.statusChanged.connect(statusChanged, widget);
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
      connection.iopubMessage.disconnect(iopubMessageHandler, widget);
    }
    connection.iopubMessage.connect(iopubMessage, widget);
    this._iopubMessageHandlers[widget.id] = iopubMessage;
    this._activeWidget = widget;

    const shellMessage = (
      _: Session.ISessionConnection,
      args: IAnyMessageArgs
    ): void => {
      const { msg, direction } = args;
      if (direction === 'recv' && msg.header.msg_type === 'execute_reply') {
        this._executionDone.emit();
      }
    };
    const shellMessageHandler = this._shellMessageHandlers[widget.id];
    if (shellMessageHandler) {
      connection.anyMessage.disconnect(shellMessageHandler, widget);
    }

    connection.anyMessage.connect(shellMessage, widget);
    this._shellMessageHandlers[widget.id] = shellMessage;

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
    if (widget.isDisposed) {
      return;
    }
    const connectionChanged = (): void => {
      const { session: connection } = sessionContext;
      void this.update(widget, connection);
    };

    const contextKernelChangedHandlers =
      this._contextKernelChangedHandlers[widget.id];

    if (contextKernelChangedHandlers) {
      sessionContext.kernelChanged.disconnect(
        contextKernelChangedHandlers,
        widget
      );
    }
    const isFirstRegistration = !contextKernelChangedHandlers;
    this._contextKernelChangedHandlers[widget.id] = connectionChanged;
    sessionContext.kernelChanged.connect(connectionChanged, widget);
    if (isFirstRegistration) {
      // One hook per widget: this method runs on every focus switch. The
      // connection itself is removed by `Signal.clearData(widget)` during
      // disposal (the widget is the receiver); only the map entry on this
      // application-lifetime object needs explicit cleanup.
      widget.disposed.connect(() => {
        delete this._contextKernelChangedHandlers[widget.id];
      });
    }

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
    // Callers typically await session readiness first, and the widget can be
    // closed by the time that resolves; connecting handlers for it then
    // would leave them on the service and the connection permanently.
    if (widget.isDisposed || !this._service.model || !connection) {
      return;
    }
    this._widgets[widget.id] = widget;
    this._connections[widget.id] = connection;

    const onDebuggerStopped = (): void => {
      const debugButton = this._iconButtons[widget.id];

      this._removeHandlers(widget, connection, onDebuggerStopped);

      if (debugButton) {
        updateIconButtonState(debugButton, false, true);
      }
      this._notifyCommands();
    };

    this._service.stopped.connect(onDebuggerStopped, widget);

    const toggleDebugging = async (): Promise<void> => {
      // bail if the widget doesn't have focus
      if (this._shell.currentWidget !== widget) {
        return;
      }
      const debugButton = this._iconButtons[widget.id]!;
      if (this._pendingToggle) {
        debugButton.pressed = !debugButton.pressed;
        return;
      }
      if (this._commands) {
        const cmd = this.isDebuggerOn(widget)
          ? Debugger.CommandIDs.disable
          : Debugger.CommandIDs.enable;
        await this._commands.execute(cmd, {
          widget
        } as unknown as ReadonlyJSONObject);
      } else {
        await this.toggle(widget);
      }
    };

    const addToolbarButton = (enabled: boolean = true): void => {
      const debugButton = this._iconButtons[widget.id];
      if (!debugButton) {
        this._iconButtons[widget.id] = updateIconButton(
          widget,
          toggleDebugging,
          enabled,
          this._service.isStarted,
          this._translator || undefined
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

    /**
     * Restore the debugger state, and return whether it worked: a restart, a
     * kernel change or closing the document drops the requests it sends.
     */
    const restoreDebuggerState = async (
      autoStart: boolean
    ): Promise<boolean> => {
      try {
        await this._service.restoreState(autoStart);
        return true;
      } catch (error) {
        console.error(
          'Could not restore the debugger state:',
          error instanceof Error ? error.message : String(error)
        );
        return false;
      }
    };

    const kernelId = connection.kernel?.id ?? connection.id;
    const debuggingAvailable = this._debuggerAvailability[widget.id];
    addToolbarButton(
      debuggingAvailable?.kernelId === kernelId
        ? debuggingAvailable.available
        : false
    );

    // listen to the disposed signals
    widget.disposed.connect(async () => {
      if (this.isDebuggerOn(widget)) {
        this._service.session!.connection = connection;
        await this._service.stop();
      }
      this._removeHandlers(widget, connection, onDebuggerStopped);
      // The connections made by `update()` are removed by
      // `Signal.clearData(widget)` during widget disposal (every connect
      // passes the widget as receiver); the id-keyed entries on this
      // application-lifetime object have to be deleted explicitly.
      delete this._widgets[widget.id];
      delete this._connections[widget.id];
      delete this._kernelChangedHandlers[widget.id];
      delete this._statusChangedHandlers[widget.id];
      delete this._iopubMessageHandlers[widget.id];
      delete this._shellMessageHandlers[widget.id];
      delete this._iconButtons[widget.id];
      delete this._debuggerAvailability[widget.id];
      delete this._contextKernelChangedHandlers[widget.id];
      if (this._activeWidget === widget) {
        this._activeWidget = null;
      }
      this._notifyCommands();
    });

    const debuggingEnabled = await this._service.isAvailable(connection);
    if (widget.isDisposed) {
      // Disposed while `isAvailable` was pending: the disposal hook above
      // has already deleted the per-widget entries, so writing any of them
      // now would leave them behind for good.
      return;
    }
    this._debuggerAvailability[widget.id] = {
      kernelId,
      available: debuggingEnabled
    };
    if (!debuggingEnabled) {
      this._removeHandlers(widget, connection, onDebuggerStopped);
      updateIconButtonState(this._iconButtons[widget.id]!, false, false);
      this._notifyCommands();
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

    if (!(await restoreDebuggerState(this.isDebuggerOn(widget)))) {
      return;
    }

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
      this._removeHandlers(widget, connection, onDebuggerStopped);
      this._service.session.connection = this._previousConnection ?? connection;
      await restoreDebuggerState(false);
      return;
    }

    // if the debugger is started but there is no handler, create a new one
    this._createHandler(widget);
    this._previousConnection = connection;
    this._notifyCommands();
  }

  private _type: DebuggerHandler.SessionType;
  private _shell: JupyterFrontEnd.IShell;
  private _service: IDebugger;
  private _previousConnection: Session.ISessionConnection | null;
  private _pendingToggle = false;
  private _isDisposed = false;
  private _activeWidget:
    | DebuggerHandler.SessionWidget[DebuggerHandler.SessionType]
    | null;
  private _handlers: {
    [id: string]: DebuggerHandler.SessionHandler[DebuggerHandler.SessionType];
  } = {};
  private _widgets: {
    [id: string]: DebuggerHandler.SessionWidget[DebuggerHandler.SessionType];
  } = {};
  private _connections: {
    [id: string]: Session.ISessionConnection | null;
  } = {};
  private _commands: CommandRegistry | null = null;
  private _translator: ITranslator | null;

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
  private _debuggerAvailability: {
    [id: string]: IDebuggerAvailability | undefined;
  } = {};
  private _shellMessageHandlers: {
    [id: string]: (
      sender: Session.ISessionConnection,
      args: IAnyMessageArgs
    ) => void;
  } = {};
  private _executionDone: Signal<this, void>;
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
     * The debugger settings.
     */
    settings?: ISettingRegistry.ISettings;

    /**
     * The application language translator.
     */
    translator?: ITranslator;

    /**
     * The application command registry.
     */
    commands?: CommandRegistry;
  }

  /**
   * An interface for debugger handler.
   */
  export interface IHandler {
    /**
     * Dispose of the resources held by the handler.
     */
    dispose(): void;

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

    /**
     * Whether the handler tracks the given widget.
     *
     * @param widget - The widget to check.
     */
    hasWidget(widget: Widget): boolean;

    /**
     * Get the session widget tracked by this handler that matches or contains the given widget.
     *
     * @param widget - The widget to look for.
     */
    getWidget(
      widget: Widget
    ): DebuggerHandler.SessionWidget[DebuggerHandler.SessionType] | null;

    /**
     * Whether debugging is on for the given widget (or the active widget).
     *
     * @param widget - The widget to check.
     */
    isDebuggerOn(
      widget?: DebuggerHandler.SessionWidget[DebuggerHandler.SessionType]
    ): boolean;

    /**
     * Whether debugging is available for the given widget (or the active widget).
     *
     * @param widget - The widget to check.
     */
    isAvailable(
      widget?: DebuggerHandler.SessionWidget[DebuggerHandler.SessionType]
    ): boolean;

    /**
     * Enable debugging for the given widget (or the active widget).
     *
     * @param widget - The widget to enable debugging for.
     */
    enable(
      widget?: DebuggerHandler.SessionWidget[DebuggerHandler.SessionType]
    ): Promise<void>;

    /**
     * Disable debugging for the given widget (or the active widget).
     *
     * @param widget - The widget to disable debugging for.
     */
    disable(
      widget?: DebuggerHandler.SessionWidget[DebuggerHandler.SessionType]
    ): Promise<void>;

    /**
     * Toggle debugging for the given widget (or the active widget).
     *
     * @param widget - The widget to toggle debugging for.
     */
    toggle(
      widget?: DebuggerHandler.SessionWidget[DebuggerHandler.SessionType]
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
