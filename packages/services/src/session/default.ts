// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ISignal, Signal } from '@phosphor/signaling';

import { Kernel, KernelMessage } from '../kernel';

import { ServerConnection } from '..';

import { Session } from './session';

import * as restapi from './restapi';

/**
 * Session object for accessing the session REST api. The session
 * should be used to start kernels and then shut them down -- for
 * all other operations, the kernel object should be used.
 */
export class SessionConnection implements Session.ISessionConnection {
  /**
   * Construct a new session.
   *
   * TODO: the constructor here is a bit awkward, especially given that usually we have a model from the kernel we are trying to use. Perhaps we should take the model?
   * * How do we make sure that the information here is what matches the server? A: we don't. we depend on the person creating the connection to keep the information up to date. The only reason we store the information like the path, type, etc., is as a convenience for the user so the user doesn't have to keep track of the model separately.
   *
   * Also, there is a conflict between the IOptions and the model passed in here. Which should we use?
   *
   * How about the session takes options. Options must have a session model, plus username, clientId, a connectToKernel function, and serverSettings. Perhaps serverSettings is a separate arg (audit where they are separate...).
   */
  constructor(options: Session.IOptions) {
    this._id = options.model.id;
    this._name = options.model.name;
    this._path = options.model.path;
    this._type = options.model.type;
    this._username = options.username;
    this._clientId = options.clientId;
    this._connectToKernel = options.connectToKernel;
    this.serverSettings =
      options.serverSettings || ServerConnection.makeSettings();
    this.setupKernel(options.model.kernel);
  }

  get disposed(): ISignal<this, void> {
    return this._disposed;
  }

  /**
   * A signal emitted when the kernel changes.
   */
  get kernelChanged(): ISignal<this, Session.IKernelChangedArgs> {
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
   * Note: The behavior is undefined if the message is modified
   * during message handling. As such, it should be treated as read-only.
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
  get kernel(): Kernel.IKernelConnection {
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
      kernel: { id: this.kernel.id, name: this.kernel.name },
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
   * Clone the current session with a new clientId.
   *
   * TODO: remove?
   */
  // clone(): Session.ISessionConnection {
  //   return new SessionConnection(
  //     {
  //       path: this._path,
  //       name: this._name,
  //       type: this._type,
  //       serverSettings: this.serverSettings,
  //       connectToKernel: this._connectToKernel
  //     },
  //     this._id,
  //     { id: this.kernel.id, name: this.kernel.name }
  //   );
  // }

  /**
   * Update the session based on a session model from the server.
   */
  update(model: Session.IModel): void {
    let oldModel = this.model;
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
      let oldValue = this._kernel;
      this.setupKernel(model.kernel);
      let newValue = this._kernel;
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
    this._kernel.dispose();
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
   * @params options - The name or id of the new kernel.
   *
   * #### Notes
   * This shuts down the existing kernel and creates a new kernel,
   * keeping the existing session ID and session path.
   */
  async changeKernel(
    options: Partial<Kernel.IModel>
  ): Promise<Kernel.IKernelConnection> {
    if (this.isDisposed) {
      throw new Error('Session is disposed');
    }
    this.kernel.dispose();

    // This status is not technically correct, but it may be useful to refresh
    // clients TODO: evaluate whether we want to do this, or tell people to
    // listen to the kernelChanged signal.
    // this._statusChanged.emit('restarting');
    // TODO: probably change this to adjusting the kernel connection status.
    await this._patch({ kernel: options });
    return this.kernel;
  }

  /**
   * Kill the kernel and shutdown the session.
   *
   * @returns - The promise fulfilled on a valid response from the server.
   *
   * #### Notes
   * Uses the [Jupyter Notebook API](http://petstore.swagger.io/?url=https://raw.githubusercontent.com/jupyter/notebook/master/notebook/services/api/api.yaml#!/sessions), and validates the response.
   * Disposes of the session and emits a [sessionDied] signal on success.
   */
  async shutdown(): Promise<void> {
    if (this.isDisposed) {
      throw new Error('Session is disposed');
    }
    return restapi.shutdownSession(this.id, this.serverSettings);
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
      model,
      username: this._username,
      clientId: this._clientId,
      serverSettings: this.serverSettings
    });
    this._kernel = kc;
    kc.statusChanged.connect(this.onKernelStatus, this);
    kc.connectionStatusChanged.connect(this.onKernelConnectionStatus, this);
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
  ) {
    this._statusChanged.emit(state);
  }

  /**
   * Handle to changes in the Kernel status.
   */
  protected onKernelConnectionStatus(
    sender: Kernel.IKernelConnection,
    state: Kernel.ConnectionStatus
  ) {
    this._connectionStatusChanged.emit(state);
  }

  /**
   * Handle iopub kernel messages.
   */
  protected onIOPubMessage(
    sender: Kernel.IKernelConnection,
    msg: KernelMessage.IIOPubMessage
  ) {
    this._iopubMessage.emit(msg);
  }

  /**
   * Handle unhandled kernel messages.
   */
  protected onUnhandledMessage(
    sender: Kernel.IKernelConnection,
    msg: KernelMessage.IMessage
  ) {
    this._unhandledMessage.emit(msg);
  }

  /**
   * Handle any kernel messages.
   */
  protected onAnyMessage(
    sender: Kernel.IKernelConnection,
    args: Kernel.IAnyMessageArgs
  ) {
    this._anyMessage.emit(args);
  }

  /**
   * Send a PATCH to the server, updating the session path or the kernel.
   */
  private async _patch(
    body: restapi.DeepPartial<Session.IModel>
  ): Promise<Session.IModel> {
    let model = await restapi.updateSession(
      this._id,
      body,
      this.serverSettings
    );
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
  private _username = '';
  private _clientId = '';
  private _kernel: Kernel.IKernelConnection;
  private _isDisposed = false;
  private _disposed = new Signal<this, void>(this);
  private _kernelChanged = new Signal<this, Session.IKernelChangedArgs>(this);
  private _statusChanged = new Signal<this, Kernel.Status>(this);
  private _connectionStatusChanged = new Signal<this, Kernel.ConnectionStatus>(
    this
  );
  private _iopubMessage = new Signal<this, KernelMessage.IIOPubMessage>(this);
  private _unhandledMessage = new Signal<this, KernelMessage.IMessage>(this);
  private _anyMessage = new Signal<this, Kernel.IAnyMessageArgs>(this);
  private _propertyChanged = new Signal<this, 'path' | 'name' | 'type'>(this);
  private _connectToKernel: (
    options: Kernel.IOptions
  ) => Kernel.IKernelConnection;
}
