// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ISignal, Signal } from '@lumino/signaling';

import { Kernel, KernelMessage } from '../kernel';

import { ServerConnection } from '..';

import * as Session from './session';

import { UUID } from '@lumino/coreutils';

import { DeepPartial, SessionAPIClient } from './restapi';

/**
 * Session object for accessing the session REST api. The session
 * should be used to start kernels and then shut them down -- for
 * all other kernel operations, the kernel object should be used.
 */
export class SessionConnection implements Session.ISessionConnection {
  /**
   * Construct a new session.
   */
  constructor(options: Session.ISessionConnection.IOptions) {
    this._id = options.model.id;
    this._name = options.model.name;
    this._path = options.model.path;
    this._type = options.model.type;
    this._username = options.username ?? '';
    this._clientId = options.clientId ?? UUID.uuid4();
    this._connectToKernel = options.connectToKernel;
    this._kernelConnectionOptions = options.kernelConnectionOptions ?? {};
    this.serverSettings =
      options.serverSettings ?? ServerConnection.makeSettings();
    this._sessionAPIClient =
      options.sessionAPIClient ??
      new SessionAPIClient({ serverSettings: this.serverSettings });
    this.setupKernel(options.model.kernel);
  }

  /**
   * A signal emitted when the session is disposed.
   */
  get disposed(): ISignal<this, void> {
    return this._disposed;
  }

  /**
   * A signal emitted when the kernel changes.
   */
  get kernelChanged(): ISignal<
    this,
    Session.ISessionConnection.IKernelChangedArgs
  > {
    return this._kernelChanged;
  }

  /**
   * A signal proxied from the connection about the kernel status.
   */
  get statusChanged(): ISignal<this, Kernel.Status> {
    return this._statusChanged;
  }

  /**
   * A signal proxied from the kernel about the connection status.
   */
  get connectionStatusChanged(): ISignal<this, Kernel.ConnectionStatus> {
    return this._connectionStatusChanged;
  }

  /**
   * A signal proxied from the kernel pending input.
   */
  get pendingInput(): ISignal<this, boolean> {
    return this._pendingInput;
  }

  /**
   * A signal proxied from the kernel about iopub kernel messages.
   */
  get iopubMessage(): ISignal<this, KernelMessage.IIOPubMessage> {
    return this._iopubMessage;
  }

  /**
   * A signal proxied from the kernel for an unhandled kernel message.
   */
  get unhandledMessage(): ISignal<this, KernelMessage.IMessage> {
    return this._unhandledMessage;
  }

  /**
   * A signal proxied from the kernel emitted for any kernel message.
   *
   * #### Notes
   * The behavior is undefined if the message is modified during message
   * handling. As such, it should be treated as read-only.
   */
  get anyMessage(): ISignal<this, Kernel.IAnyMessageArgs> {
    return this._anyMessage;
  }

  /**
   * A signal emitted when a session property changes.
   */
  get propertyChanged(): ISignal<this, 'path' | 'name' | 'type'> {
    return this._propertyChanged;
  }

  /**
   * Get the session id.
   */
  get id(): string {
    return this._id;
  }

  /**
   * Get the session kernel connection object.
   *
   * #### Notes
   * This is a read-only property, and can be altered by [changeKernel].
   */
  get kernel(): Kernel.IKernelConnection | null {
    return this._kernel;
  }

  /**
   * Get the session path.
   */
  get path(): string {
    return this._path;
  }

  /**
   * Get the session type.
   */
  get type(): string {
    return this._type;
  }

  /**
   * Get the session name.
   */
  get name(): string {
    return this._name;
  }

  /**
   * Get the model associated with the session.
   */
  get model(): Session.IModel {
    return {
      id: this.id,
      kernel: this.kernel && { id: this.kernel.id, name: this.kernel.name },
      path: this._path,
      type: this._type,
      name: this._name
    };
  }

  /**
   * The server settings of the session.
   */
  readonly serverSettings: ServerConnection.ISettings;

  /**
   * Test whether the session has been disposed.
   */
  get isDisposed(): boolean {
    return this._isDisposed;
  }

  /**
   * Update the session based on a session model from the server.
   *
   * #### Notes
   * This only updates this session connection instance. Use `setPath`,
   * `setName`, `setType`, and `changeKernel` to change the session values on
   * the server.
   */
  update(model: Session.IModel): void {
    const oldModel = this.model;
    this._path = model.path;
    this._name = model.name;
    this._type = model.type;

    if (
      (this._kernel === null && model.kernel !== null) ||
      (this._kernel !== null && model.kernel === null) ||
      (this._kernel !== null &&
        model.kernel !== null &&
        this._kernel.id !== model.kernel.id)
    ) {
      if (this._kernel !== null) {
        this._kernel.dispose();
      }
      const oldValue = this._kernel || null;
      this.setupKernel(model.kernel);
      const newValue = this._kernel || null;
      this._kernelChanged.emit({ name: 'kernel', oldValue, newValue });
    }

    this._handleModelChange(oldModel);
  }

  /**
   * Dispose of the resources held by the session.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this._isDisposed = true;
    this._disposed.emit();

    if (this._kernel) {
      this._kernel.dispose();
      const oldValue = this._kernel;
      this._kernel = null;
      const newValue = this._kernel;
      this._kernelChanged.emit({ name: 'kernel', oldValue, newValue });
    }

    Signal.clearData(this);
  }

  /**
   * Change the session path.
   *
   * @param path - The new session path.
   *
   * @returns A promise that resolves when the session has renamed.
   *
   * #### Notes
   * This uses the Jupyter REST API, and the response is validated.
   * The promise is fulfilled on a valid response and rejected otherwise.
   */
  async setPath(path: string): Promise<void> {
    if (this.isDisposed) {
      throw new Error('Session is disposed');
    }
    await this._patch({ path });
  }

  /**
   * Change the session name.
   */
  async setName(name: string): Promise<void> {
    if (this.isDisposed) {
      throw new Error('Session is disposed');
    }
    await this._patch({ name });
  }

  /**
   * Change the session type.
   */
  async setType(type: string): Promise<void> {
    if (this.isDisposed) {
      throw new Error('Session is disposed');
    }
    await this._patch({ type });
  }

  /**
   * Change the kernel.
   *
   * @param options - The name or id of the new kernel.
   *
   * #### Notes
   * This shuts down the existing kernel and creates a new kernel,
   * keeping the existing session ID and session path.
   */
  async changeKernel(
    options: Partial<Kernel.IModel>
  ): Promise<Kernel.IKernelConnection | null> {
    if (this.isDisposed) {
      throw new Error('Session is disposed');
    }

    await this._patch({ kernel: options });
    return this.kernel;
  }

  /**
   * Kill the kernel and shutdown the session.
   *
   * @returns - The promise fulfilled on a valid response from the server.
   *
   * #### Notes
   * Uses the [Jupyter Server API](https://petstore.swagger.io/?url=https://raw.githubusercontent.com/jupyter-server/jupyter_server/main/jupyter_server/services/api/api.yaml#!/sessions), and validates the response.
   * Disposes of the session and emits a [sessionDied] signal on success.
   */
  async shutdown(): Promise<void> {
    if (this.isDisposed) {
      throw new Error('Session is disposed');
    }
    await this._sessionAPIClient.shutdown(this.id);
    this.dispose();
  }

  /**
   * Create a new kernel connection and connect to its signals.
   *
   * #### Notes
   * This method is not meant to be subclassed.
   */
  protected setupKernel(model: Kernel.IModel | null): void {
    if (model === null) {
      this._kernel = null;
      return;
    }
    const kc = this._connectToKernel({
      ...this._kernelConnectionOptions,
      model,
      username: this._username,
      clientId: this._clientId,
      serverSettings: this.serverSettings
    });
    this._kernel = kc;
    kc.statusChanged.connect(this.onKernelStatus, this);
    kc.connectionStatusChanged.connect(this.onKernelConnectionStatus, this);
    kc.pendingInput.connect(this.onPendingInput, this);
    kc.unhandledMessage.connect(this.onUnhandledMessage, this);
    kc.iopubMessage.connect(this.onIOPubMessage, this);
    kc.anyMessage.connect(this.onAnyMessage, this);
  }

  /**
   * Handle to changes in the Kernel status.
   */
  protected onKernelStatus(
    sender: Kernel.IKernelConnection,
    state: Kernel.Status
  ): void {
    this._statusChanged.emit(state);
  }

  /**
   * Handle to changes in the Kernel status.
   */
  protected onKernelConnectionStatus(
    sender: Kernel.IKernelConnection,
    state: Kernel.ConnectionStatus
  ): void {
    this._connectionStatusChanged.emit(state);
  }

  /**
   * Handle a change in the pendingInput.
   */
  protected onPendingInput(sender: Kernel.IKernelConnection, state: boolean) {
    this._pendingInput.emit(state);
  }

  /**
   * Handle iopub kernel messages.
   */
  protected onIOPubMessage(
    sender: Kernel.IKernelConnection,
    msg: KernelMessage.IIOPubMessage
  ): void {
    this._iopubMessage.emit(msg);
  }

  /**
   * Handle unhandled kernel messages.
   */
  protected onUnhandledMessage(
    sender: Kernel.IKernelConnection,
    msg: KernelMessage.IMessage
  ): void {
    this._unhandledMessage.emit(msg);
  }

  /**
   * Handle any kernel messages.
   */
  protected onAnyMessage(
    sender: Kernel.IKernelConnection,
    args: Kernel.IAnyMessageArgs
  ): void {
    this._anyMessage.emit(args);
  }

  /**
   * Send a PATCH to the server, updating the session path or the kernel.
   */
  private async _patch(
    body: DeepPartial<Session.IModel>
  ): Promise<Session.IModel> {
    const model = await this._sessionAPIClient.update({
      ...body,
      id: this._id
    });
    this.update(model);
    return model;
  }

  /**
   * Handle a change to the model.
   */
  private _handleModelChange(oldModel: Session.IModel): void {
    if (oldModel.name !== this._name) {
      this._propertyChanged.emit('name');
    }
    if (oldModel.type !== this._type) {
      this._propertyChanged.emit('type');
    }
    if (oldModel.path !== this._path) {
      this._propertyChanged.emit('path');
    }
  }

  private _id = '';
  private _path = '';
  private _name = '';
  private _type = '';
  private _username: string;
  private _clientId: string;
  private _kernel: Kernel.IKernelConnection | null = null;
  private _isDisposed = false;
  private _disposed = new Signal<this, void>(this);
  private _kernelChanged = new Signal<
    this,
    Session.ISessionConnection.IKernelChangedArgs
  >(this);
  private _statusChanged = new Signal<this, Kernel.Status>(this);
  private _connectionStatusChanged = new Signal<this, Kernel.ConnectionStatus>(
    this
  );
  private _pendingInput = new Signal<this, boolean>(this);
  private _iopubMessage = new Signal<this, KernelMessage.IIOPubMessage>(this);
  private _unhandledMessage = new Signal<this, KernelMessage.IMessage>(this);
  private _anyMessage = new Signal<this, Kernel.IAnyMessageArgs>(this);
  private _propertyChanged = new Signal<this, 'path' | 'name' | 'type'>(this);
  private _connectToKernel: (
    options: Kernel.IKernelConnection.IOptions
  ) => Kernel.IKernelConnection;
  private _kernelConnectionOptions: Omit<
    Kernel.IKernelConnection.IOptions,
    'model' | 'username' | 'clientId' | 'serverSettings'
  >;
  private _sessionAPIClient: Session.ISessionAPIClient;
}
