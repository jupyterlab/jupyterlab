// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { URLExt } from '@jupyterlab/coreutils';

import { PromiseDelegate } from '@phosphor/coreutils';

import { Datastore } from '@phosphor/datastore';

import { IMessageHandler, Message, MessageLoop } from '@phosphor/messaging';

import { ServerConnection, WSConnection } from '@jupyterlab/services';

import { Collaboration } from './wsmessages';

/**
 * The url for the datastore service.
 */
const DATASTORE_SERVICE_URL = 'lab/api/datastore';

/**
 * The default treshold for idle time, in seconds.
 */
const DEFAULT_IDLE_TIME = 3;

/**
 * A class that manages exchange of transactions with the collaboration server.
 */
export class CollaborationClient extends WSConnection<
  Collaboration.Message,
  Collaboration.Message
> {
  /**
   * Create a new collaboration client connection.
   */
  constructor(options: CollaborationClient.IOptions = {}) {
    super();
    this.collaborationId = options.collaborationId;
    this.handler = options.handler || null;
    this._idleTreshold = 1000 * (options.idleTreshold || DEFAULT_IDLE_TIME);
    this.serverSettings =
      options.serverSettings || ServerConnection.makeSettings();
    this._createSocket();
  }

  /**
   * Create a new, unique store id.
   *
   * @returns {Promise<number>} A promise to the new store id.
   */
  get storeId(): Promise<number> {
    if (this._storeId !== null) {
      return Promise.resolve(this._storeId);
    }
    return this.ready.then(async () => {
      const msg = Collaboration.createMessage('storeid-request', {});
      const reply = await this._requestMessageReply(msg);
      return (this._storeId = reply.content.storeId);
    });
  }

  /**
   * The permissions for the current use on the datastore session.
   */
  get permissions(): Promise<CollaborationClient.Permissions> {
    return Promise.resolve().then(async () => {
      await this.ready;
      const msg = Collaboration.createMessage('permissions-request', {});
      const reply = await this._requestMessageReply(msg);
      return reply.content;
    });
  }

  /**
   * Broadcast transactions to all datastores.
   *
   * @param transactions - The transactions to broadcast.
   * @returns An array of acknowledged transactionIds from the server.
   */
  broadcastTransactions(transactions: Datastore.Transaction[]): void {
    // Brand outgoing transactions with our serial
    const branded = [];
    for (let t of transactions) {
      const b = { ...t, serial: this._ourSerial++ };
      branded.push(b);
      this._pendingTransactions[b.id] = b;
    }
    this._resetIdleTimer();
    const msg = Collaboration.createMessage('transaction-broadcast', {
      transactions: branded
    });
    this._requestMessageReply(msg).then(
      reply => {
        const { serials, transactionIds } = reply.content;
        for (let i = 0; i < serials.length; ++i) {
          const serial = serials[i];
          const id = transactionIds[i];
          delete this._pendingTransactions[id];
          if (serial !== this._serverSerial + 1) {
            // Out of order serials!
            // Something has gone wrong somewhere.
            // TODO: Trigger recovery?
            throw new Error(
              'Critical! Out of order transactions in datastore.'
            );
          }
          this._serverSerial = serial;
        }
        this._resetIdleTimer();
      },
      () => {
        // TODO: Resend transactions
      }
    );
  }

  /**
   * Request the complete history of the datastore.
   *
   * The transactions of the history will be sent to the set handler.
   */
  async replayHistory(checkpointId?: number): Promise<void> {
    const msg = Collaboration.createMessage('history-request', {
      checkpointId: checkpointId === undefined ? null : checkpointId
    });
    const reply = await this._requestMessageReply(msg);
    const content = reply.content;
    // TODO: Set initial state
    if (this.handler !== null) {
      const message = new CollaborationClient.InitialStateMessage(
        content.state
      );
      MessageLoop.postMessage(this.handler, message);
    }
    this._handleTransactions(content.transactions);
  }

  /**
   * The server settings for the session.
   */
  readonly serverSettings: ServerConnection.ISettings;

  /**
   * The id of the collaboration.
   */
  readonly collaborationId: string | undefined;

  /**
   * The message handler of any data messages.
   */
  handler: IMessageHandler | null;

  /**
   * Factory method for creating the web socket object.
   */
  protected wsFactory() {
    const settings = this.serverSettings;
    const token = this.serverSettings.token;
    const queryParams = [];

    let wsUrl;
    if (this.collaborationId) {
      wsUrl = URLExt.join(
        settings.wsUrl,
        DATASTORE_SERVICE_URL,
        this.collaborationId
      );
    } else {
      wsUrl = URLExt.join(settings.wsUrl, DATASTORE_SERVICE_URL);
    }

    if (token) {
      queryParams.push(`token=${encodeURIComponent(token)}`);
    }
    if (this._storeId !== null) {
      queryParams.push(
        `storeId=${encodeURIComponent(this._storeId.toString(10))}`
      );
    }
    if (queryParams) {
      wsUrl = wsUrl + `?${queryParams.join('&')}`;
    }

    return new settings.WebSocket(wsUrl);
  }

  /**
   * Handler for deserialized websocket messages.
   */
  protected handleMessage(
    msg:
      | Collaboration.RawReply
      | Collaboration.TransactionBroadcast
      | Collaboration.StableStateNotice
  ): boolean {
    try {
      // TODO: Write a validator?
      // validate.validateMessage(msg);
    } catch (error) {
      console.error(`Invalid message: ${error.message}`);
      return false;
    }

    if (Collaboration.isReply(msg)) {
      let delegate = this._delegates && this._delegates.get(msg.parentId!);
      if (delegate) {
        if (msg.msgType === 'error-reply') {
          console.warn('Received datastore error from server', msg.content);
          delegate.reject(msg.content.reason);
        } else {
          delegate.resolve(msg);
        }
        return true;
      }
    }
    if (msg.msgType === 'transaction-broadcast') {
      this._handleTransactions(msg.content.transactions);
    } else if (msg.msgType === 'state-stable') {
      if (this.handler !== null && this._serverSerial === msg.content.serial) {
        MessageLoop.sendMessage(this.handler, new Datastore.GCChanceMessage());
      }
    } else {
      return false;
    }
    return true;
  }

  /**
   * Process transactions received over the websocket.
   */
  private _handleTransactions(
    transactions: ReadonlyArray<Collaboration.SerialTransaction>
  ) {
    if (this.handler !== null) {
      for (let t of transactions) {
        if (t.serial !== this._serverSerial + 1) {
          // Out of order serials!
          // Something has gone wrong somewhere.
          // TODO: Trigger recovery?
          throw new Error('Critical! Out of order transactions in datastore.');
        }
        this._serverSerial = t.serial;
        const message = new CollaborationClient.RemoteTransactionMessage(t);
        MessageLoop.postMessage(this.handler, message);
      }
    }
    this._resetIdleTimer();
  }

  /**
   * Send a message to the server and resolve the reply message.
   */
  private _requestMessageReply<T extends Collaboration.Request>(
    msg: T,
    timeout = 0
  ): Promise<Collaboration.IReplyMap[T['msgType']]> {
    const delegate = new PromiseDelegate<Collaboration.Reply>();
    this._delegates.set(msg.msgId, delegate);

    // .finally(), delete from delegate map
    const promise = delegate.promise.then(
      reply => {
        this._delegates.delete(msg.msgId);
        return reply;
      },
      reason => {
        this._delegates.delete(msg.msgId);
        throw reason;
      }
    );

    if (timeout > 0) {
      setTimeout(() => {
        delegate.reject('Timed out waiting for reply');
      }, timeout);
    }

    this.sendMessage(msg);

    return promise;
  }

  /**
   * Callback called when idle after activity.
   */
  private _onIdle() {
    const msg = Collaboration.createMessage('serial-update', {
      serial: this._serverSerial
    });
    this.sendMessage(msg);
    this._idleTimer = null;
  }

  /**
   * Reset the idle timer.
   */
  private _resetIdleTimer() {
    if (this._idleTimer !== null) {
      clearTimeout(this._idleTimer);
    }
    this._idleTimer = setTimeout(this._onIdle.bind(this), this._idleTreshold);
  }

  private _delegates = new Map<string, PromiseDelegate<Collaboration.Reply>>();

  private _ourSerial = 0;
  private _serverSerial = 0;
  private _pendingTransactions: Collaboration.SerialTransactionMap = {};

  private _idleTreshold: number;
  private _idleTimer: number | null = null;

  private _storeId: number | null = null;
}

/**
 *
 */
export namespace CollaborationClient {
  export interface IOptions {
    /**
     * The id of the collaboration to connect to.
     */
    collaborationId?: string;

    /**
     * The server settings for the session.
     */
    serverSettings?: ServerConnection.ISettings;

    /**
     * The handler for any incoming data.
     */
    handler?: IMessageHandler;

    /**
     * How long to wait before the session is considered idle, in seconds.
     */
    idleTreshold?: number;
  }

  /**
   * A message class for `'remote-transactions'` messages.
   */
  export class RemoteTransactionMessage extends Message {
    /**
     * Construct a new remote transactions message.
     *
     * @param transaction - The transaction object
     */
    constructor(transaction: Datastore.Transaction) {
      super('remote-transactions');
      this.transaction = transaction;
    }

    /**
     * The patch object.
     */
    readonly transaction: Datastore.Transaction;
  }

  /**
   * A message class for initial state messages.
   */
  export class InitialStateMessage extends Message {
    /**
     * Construct a new initial state message.
     *
     * @param state - he serialized state
     */
    constructor(state: string | null) {
      super('initial-state');
      this.state = state;
    }

    /**
     * The serialized state.
     */
    readonly state: string | null;
  }

  /**
   * Datastore permissions object.
   */
  export type Permissions = {
    /**
     * Whether the current user can read from the datastore session.
     */
    read: boolean;

    /**
     * Whether the current user can write to the datastore session.
     */
    write: boolean;
  };
}
