/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { PartialJSONObject, ReadonlyJSONObject } from '@lumino/coreutils';

import { ISignal, Signal } from '@lumino/signaling';

import {
  BaseManager,
  ServerConnection,
  User,
  UserManager
} from '@jupyterlab/services';

/**
 * The user API service manager.
 */
export class FakeUserManager extends BaseManager implements User.IManager {
  private _isReady = false;
  private _ready: Promise<void>;

  private _identity: User.IIdentity;
  private _permissions: ReadonlyJSONObject;

  private _userChanged = new Signal<this, User.IUser>(this);
  private _connectionFailure = new Signal<this, Error>(this);

  /**
   * Create a new user manager.
   */
  constructor(
    options: UserManager.IOptions = {},
    identity: User.IIdentity,
    permissions: ReadonlyJSONObject
  ) {
    super(options);

    // Initialize internal data.
    this._ready = new Promise<void>(resolve => {
      // Schedule updating the user to the next macro task queue.
      setTimeout(() => {
        this._identity = identity;
        this._permissions = permissions;

        this._userChanged.emit({
          identity: this._identity,
          permissions: this._permissions as PartialJSONObject
        });

        resolve();
      }, 0);
    })
      .then(() => {
        if (this.isDisposed) {
          return;
        }
        this._isReady = true;
      })
      .catch(_ => undefined);
  }

  /**
   * The server settings for the manager.
   */
  readonly serverSettings: ServerConnection.ISettings;

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
    return this._ready;
  }

  /**
   * Get the most recently fetched identity.
   */
  get identity(): User.IIdentity | null {
    return this._identity;
  }

  /**
   * Get the most recently fetched permissions.
   */
  get permissions(): ReadonlyJSONObject | null {
    return this._permissions;
  }

  /**
   * A signal emitted when the user changes.
   */
  get userChanged(): ISignal<this, User.IUser> {
    return this._userChanged;
  }

  /**
   * A signal emitted when there is a connection failure.
   */
  get connectionFailure(): ISignal<this, Error> {
    return this._connectionFailure;
  }

  /**
   * Dispose of the resources used by the manager.
   */
  dispose(): void {
    super.dispose();
  }

  /**
   * Force a refresh of the specs from the server.
   *
   * @returns A promise that resolves when the specs are fetched.
   *
   * #### Notes
   * This is intended to be called only in response to a user action,
   * since the manager maintains its internal state.
   */
  async refreshUser(): Promise<void> {
    return Promise.resolve();
  }
}
