// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { JSONPrimitive } from '@lumino/coreutils';

import { IObservableDisposable } from '@lumino/disposable';

import { ISignal } from '@lumino/signaling';

import { ServerConnection } from '..';

import { IManager as IBaseManager } from '../basemanager';

import { IModel, isAvailable } from './restapi';
export { IModel, isAvailable };

export namespace ITerminal {
  /**
   * The instantiation options for a terminal session.
   */
  export interface IOptions {
    /**
     * The terminal name.
     */
    name?: string;
    /**
     *  The terminal current directory.
     */
    cwd?: string;
  }
}

/**
 * An interface for a terminal session.
 */
export interface ITerminalConnection extends IObservableDisposable {
  /**
   * A signal emitted when a message is received from the server.
   */
  messageReceived: ISignal<ITerminalConnection, IMessage>;

  /**
   * Get the name of the terminal session.
   */
  readonly name: string;

  /**
   * The model associated with the session.
   */
  readonly model: IModel;

  /**
   * The server settings for the session.
   */
  readonly serverSettings: ServerConnection.ISettings;

  /**
   * The current connection status of the terminal.
   */
  readonly connectionStatus: ConnectionStatus;

  /**
   * A signal emitted when the terminal connection status changes.
   */
  connectionStatusChanged: ISignal<this, ConnectionStatus>;

  /**
   * Send a message to the terminal session.
   */
  send(message: IMessage): void;

  /**
   * Reconnect to the terminal.
   *
   * @returns A promise that resolves when the terminal has reconnected.
   */
  reconnect(): Promise<void>;

  /**
   * Shut down the terminal session.
   */
  shutdown(): Promise<void>;
}

export namespace ITerminalConnection {
  export interface IOptions {
    /**
     * Terminal model.
     */
    model: IModel;

    /**
     * The server settings.
     */
    serverSettings?: ServerConnection.ISettings;

    /**
     * The Terminal API client.
     */
    terminalAPIClient?: ITerminalAPIClient;
  }
}

/**
 * A message from the terminal session.
 */
export interface IMessage {
  /**
   * The type of the message.
   */
  readonly type: MessageType;

  /**
   * The content of the message.
   */
  readonly content?: JSONPrimitive[];
}

/**
 * Valid message types for the terminal.
 */
export type MessageType = 'stdout' | 'disconnect' | 'set_size' | 'stdin';

/**
 * The interface for a terminal manager.
 *
 * #### Notes
 * The manager is responsible for maintaining the state of running
 * terminal sessions.
 */
export interface IManager extends IBaseManager {
  /**
   * A signal emitted when the running terminals change.
   */
  runningChanged: ISignal<IManager, IModel[]>;

  /**
   * A signal emitted when there is a connection failure.
   */
  connectionFailure: ISignal<IManager, ServerConnection.NetworkError>;

  /**
   * Test whether the manager is ready.
   */
  readonly isReady: boolean;

  /**
   * A promise that fulfills when the manager is ready.
   */
  readonly ready: Promise<void>;

  /**
   * Whether the terminal service is available.
   */
  isAvailable(): boolean;

  /**
   * Create an iterator over the known running terminals.
   *
   * @returns A new iterator over the running terminals.
   */
  running(): IterableIterator<IModel>;

  /**
   * Create a new terminal session.
   *
   * @param options - The options used to create the terminal.
   *
   * @returns A promise that resolves with the terminal connection instance.
   *
   * #### Notes
   * The manager `serverSettings` will be always be used.
   */
  startNew(options?: ITerminal.IOptions): Promise<ITerminalConnection>;

  /*
   * Connect to a running session.
   *
   * @param options - The options used to connect to the terminal.
   *
   * @returns The new terminal connection instance.
   */
  connectTo(
    options: Omit<ITerminalConnection.IOptions, 'serverSettings'>
  ): ITerminalConnection;

  /**
   * Shut down a terminal session by name.
   *
   * @param name - The name of the terminal session.
   *
   * @returns A promise that resolves when the session is shut down.
   */
  shutdown(name: string): Promise<void>;

  /**
   * Shut down all terminal sessions.
   *
   * @returns A promise that resolves when all of the sessions are shut down.
   */
  shutdownAll(): Promise<void>;

  /**
   * Force a refresh of the running terminal sessions.
   *
   * @returns A promise that with the list of running sessions.
   *
   * #### Notes
   * This is not typically meant to be called by the user, since the
   * manager maintains its own internal state.
   */
  refreshRunning(): Promise<void>;
}

/**
 * The valid terminal connection states.
 *
 * #### Notes
 * The status states are:
 * * `connected`: The terminal connection is live.
 * * `connecting`: The terminal connection is not live, but we are attempting
 *   to reconnect to the terminal.
 * * `disconnected`: The terminal connection is down, we are not
 *   trying to reconnect.
 */
export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected';

/**
 * Interface for making requests to the Terminal API.
 */
export interface ITerminalAPIClient {
  /**
   * The server settings for the client.
   */
  readonly serverSettings: ServerConnection.ISettings;

  /**
   * Whether terminals are available.
   */
  readonly isAvailable: boolean;

  /**
   * Start a new terminal session.
   *
   * @param options - The options used to create the terminal.
   *
   * @returns A promise that resolves with the session model.
   */
  startNew(options?: ITerminal.IOptions): Promise<IModel>;

  /**
   * List the running terminal sessions.
   *
   * @returns A promise that resolves with the list of running session models.
   */
  listRunning(): Promise<IModel[]>;

  /**
   * Shut down a terminal session by name.
   *
   * @param name - The name of the target session.
   *
   * @returns A promise that resolves when the session is shut down.
   */
  shutdown(name: string): Promise<void>;
}
