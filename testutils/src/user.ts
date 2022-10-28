import { URLExt } from '@jupyterlab/coreutils';

import {
  JSONExt,
  PartialJSONObject,
  ReadonlyJSONObject
} from '@lumino/coreutils';

import { Poll } from '@lumino/polling';

import { ISignal, Signal } from '@lumino/signaling';

import {
  BaseManager,
  ServerConnection,
  User,
  UserManager
} from '@jupyterlab/services';

/**
 * The url for the lab workspaces service.
 */
const SERVICE_USER_URL = 'api/me';

/**
 * The user API service manager.
 */
export class FakeUserManager
  extends BaseManager
  implements UserManager.IManager {
  private _isReady = false;
  private _ready: Promise<void>;
  private _pollSpecs: Poll;

  private _identity: User.IIdentity;
  private _permissions: ReadonlyJSONObject;

  private _fakeIdentity: Partial<User.IIdentity>;
  private _fakePermissions: ReadonlyJSONObject;

  private _userChanged = new Signal<this, User.IUser>(this);
  private _connectionFailure = new Signal<this, Error>(this);

  /**
   * Create a new user manager.
   */
  constructor(
    options: UserManager.IOptions = {},
    identity: Partial<User.IIdentity>,
    permissions: ReadonlyJSONObject
  ) {
    super(options);
    this._fakeIdentity = identity;
    this._fakePermissions = permissions;

    // Initialize internal data.
    this._ready = Promise.all([this.requestUser()])
      .then(_ => undefined)
      .catch(_ => undefined)
      .then(() => {
        if (this.isDisposed) {
          return;
        }
        this._isReady = true;
      });

    this._pollSpecs = new Poll({
      auto: false,
      factory: () => this.requestUser(),
      frequency: {
        interval: 61 * 1000,
        backoff: true,
        max: 300 * 1000
      },
      name: `@jupyterlab/services:UserManager#user`,
      standby: options.standby ?? 'when-hidden'
    });

    void this.ready.then(() => {
      void this._pollSpecs.start();
    });
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
    this._pollSpecs.dispose();
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
    await this._pollSpecs.refresh();
    await this._pollSpecs.tick;
  }

  /**
   * Execute a request to the server to poll the user and update state.
   */
  protected async requestUser(): Promise<void> {
    if (this.isDisposed) {
      return;
    }

    const { baseUrl } = this.serverSettings;
    const { makeRequest, ResponseError } = ServerConnection;
    const url = URLExt.join(baseUrl, SERVICE_USER_URL);
    const response: Response = await makeRequest(url, {}, this.serverSettings);

    if (response.status !== 200) {
      const err = await ResponseError.create(response);
      throw err;
    }

    const oldUser = {
      identity: this._identity,
      permissions: this._permissions
    };
    const newUser = await response.json();
    const identity = newUser.identity;

    // store the color and initials for the user
    // this info is not provided by the server
    const { localStorage } = window;
    const data = localStorage.getItem(identity.username);

    if (data && (!identity.initials || !identity.color)) {
      const localUser = JSON.parse(data);
      const identity = newUser.identity;
      identity.initials =
        identity.initials ||
        localUser.initials ||
        identity.name.substring(0, 1);
      identity.color =
        identity.color || localUser.color || 'var(--jp-collaborator-color1)';
    }

    if (!JSONExt.deepEqual(newUser, oldUser)) {
      this._identity = { ...identity, ...this._fakeIdentity };
      this._permissions = { ...newUser.permissions, ...this._fakePermissions };
      localStorage.setItem(
        this._identity.username,
        JSON.stringify(this._identity)
      );
      this._userChanged.emit({
        identity: this._identity,
        permissions: this._permissions as PartialJSONObject
      });
    }
  }
}
