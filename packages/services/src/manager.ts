// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import type { IDisposable } from '@lumino/disposable';

import type { Poll } from '@lumino/polling';

import type { ISignal } from '@lumino/signaling';
import { Signal } from '@lumino/signaling';

import type { Builder } from './builder';
import { BuildManager } from './builder';

import type { Contents } from './contents';
import { ContentsManager } from './contents';

import type { Event } from './event';
import { EventManager } from './event';

import type { Kernel } from './kernel';
import { KernelManager } from './kernel';

import type { KernelSpec } from './kernelspec';
import { KernelSpecManager } from './kernelspec';

import type { NbConvert } from './nbconvert';
import { NbConvertManager } from './nbconvert';

import { ServerConnection } from './serverconnection';

import type { Session } from './session';
import { SessionManager } from './session';

import type { Setting } from './setting';
import { SettingManager } from './setting';

import type { Terminal } from './terminal';
import { TerminalManager } from './terminal';

import type { User } from './user';
import { UserManager } from './user';

import type { Workspace } from './workspace';
import { WorkspaceManager } from './workspace';

/**
 * A Jupyter services manager.
 */
export class ServiceManager implements ServiceManager.IManager {
  /**
   * Construct a new services provider.
   */
  constructor(options: Partial<ServiceManager.IOptions> = {}) {
    const defaultDrive = options.defaultDrive;
    const serverSettings =
      options.serverSettings ?? ServerConnection.makeSettings();
    const standby = options.standby ?? 'when-hidden';
    const normalized = { defaultDrive, serverSettings, standby };

    this.serverSettings = serverSettings;
    this.contents = options.contents || new ContentsManager(normalized);
    this.events = options.events || new EventManager(normalized);
    this.kernels = options.kernels || new KernelManager(normalized);
    this.sessions =
      options.sessions ||
      new SessionManager({
        ...normalized,
        kernelManager: this.kernels
      });
    this.settings = options.settings || new SettingManager(normalized);
    this.terminals = options.terminals || new TerminalManager(normalized);
    this.builder = options.builder || new BuildManager(normalized);
    this.workspaces = options.workspaces || new WorkspaceManager(normalized);
    this.nbconvert = options.nbconvert || new NbConvertManager(normalized);
    this.kernelspecs = options.kernelspecs || new KernelSpecManager(normalized);
    this.user = options.user || new UserManager(normalized);

    // Proxy all connection failures from the individual service managers.
    this.kernelspecs.connectionFailure.connect(this._onConnectionFailure, this);
    this.sessions.connectionFailure.connect(this._onConnectionFailure, this);
    this.terminals.connectionFailure.connect(this._onConnectionFailure, this);

    // Define promises that need to be resolved before service manager is ready.
    const readyList = [this.sessions.ready, this.kernelspecs.ready];
    if (this.terminals.isAvailable()) {
      readyList.push(this.terminals.ready);
    }
    this._readyPromise = Promise.all(readyList).then(() => {
      this._isReady = true;
    });
  }

  /**
   * A signal emitted when there is a connection failure with the kernel.
   */
  get connectionFailure(): ISignal<this, Error> {
    return this._connectionFailure;
  }

  /**
   * Test whether the service manager is disposed.
   */
  get isDisposed(): boolean {
    return this._isDisposed;
  }

  /**
   * Dispose of the resources used by the manager.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }

    this._isDisposed = true;
    Signal.clearData(this);

    this.contents.dispose();
    this.events.dispose();
    this.sessions.dispose();
    this.terminals.dispose();
  }

  /**
   * The server settings of the manager.
   */
  readonly serverSettings: ServerConnection.ISettings;

  /**
   * Get the session manager instance.
   */
  readonly sessions: Session.IManager;

  /**
   * Get the kernel manager instance.
   */
  readonly kernels: Kernel.IManager;

  /**
   * Get the kernelspec manager instance.
   */
  readonly kernelspecs: KernelSpec.IManager;

  /**
   * Get the setting manager instance.
   */
  readonly settings: Setting.IManager;

  /**
   * The builder for the manager.
   */
  readonly builder: Builder.IManager;

  /**
   * Get the contents manager instance.
   */
  readonly contents: Contents.IManager;

  /**
   * The event manager instance.
   */
  readonly events: Event.IManager;

  /**
   * Get the terminal manager instance.
   */
  readonly terminals: Terminal.IManager;

  /**
   * Get the user manager instance.
   */
  readonly user: User.IManager;

  /**
   * Get the workspace manager instance.
   */
  readonly workspaces: Workspace.IManager;

  /**
   * Get the nbconvert manager instance.
   */
  readonly nbconvert: NbConvert.IManager;

  /**
   * Test whether the manager is ready.
   */
  get isReady(): boolean {
    return this._isReady;
  }

  /**
   * A promise that fulfills when the manager is ready.
   */
  get ready(): Promise<void> {
    return this._readyPromise;
  }

  private _onConnectionFailure(sender: any, err: Error): void {
    this._connectionFailure.emit(err);
  }

  private _isDisposed = false;
  private _readyPromise: Promise<void>;
  private _connectionFailure = new Signal<this, Error>(this);
  private _isReady = false;
}

/**
 * The namespace for `ServiceManager` statics.
 */
export namespace ServiceManager {
  /**
   * A service manager interface.
   */
  export interface IManager extends IDisposable, IManagers {
    /**
     * Test whether the manager is ready.
     */
    readonly isReady: boolean;

    /**
     * A promise that fulfills when the manager is initially ready.
     */
    readonly ready: Promise<void>;

    /**
     * A signal emitted when there is a connection failure with the server.
     */
    readonly connectionFailure: ISignal<IManager, Error>;
  }

  /**
   * The options used to create a service manager.
   */
  export interface IOptions extends IManagers {
    /**
     * The default drive for the contents manager.
     */
    readonly defaultDrive: Contents.IDrive;

    /**
     * When the manager stops polling the API. Defaults to `when-hidden`.
     */
    standby: Poll.Standby | (() => boolean | Poll.Standby);
  }

  /**
   * The managers provided by the service manager.
   */
  interface IManagers {
    /**
     * The builder for the manager.
     *
     * @deprecated will be removed in JupyterLab v5
     */
    readonly builder: Builder.IManager;

    /**
     * The contents manager for the manager.
     */
    readonly contents: Contents.IManager;

    /**
     * The events service manager.
     */
    readonly events: Event.IManager;

    /**
     * A promise that fulfills when the manager is initially ready.
     */
    readonly ready: Promise<void>;

    /**
     * The server settings of the manager.
     */
    readonly serverSettings: ServerConnection.ISettings;

    /**
     * The session manager for the manager.
     */
    readonly sessions: Session.IManager;

    /**
     * The kernel manager of the manager.
     */
    readonly kernels: Kernel.IManager;

    /**
     * The kernelspec manager for the manager.
     */
    readonly kernelspecs: KernelSpec.IManager;

    /**
     * The setting manager for the manager.
     */
    readonly settings: Setting.IManager;

    /**
     * The terminals manager for the manager.
     */
    readonly terminals: Terminal.IManager;

    /**
     * The user manager for the manager.
     */
    readonly user: User.IManager;

    /**
     * The workspace manager for the manager.
     */
    readonly workspaces: Workspace.IManager;

    /**
     * The nbconvert manager for the manager.
     */
    readonly nbconvert: NbConvert.IManager;
  }
}
