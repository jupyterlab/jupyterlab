// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { URLExt } from '@jupyterlab/coreutils';

import { PromiseDelegate } from '@phosphor/coreutils';

import { Datastore } from '@phosphor/datastore';

import { IMessageHandler, Message } from '@phosphor/messaging';

import { ServerConnection, WSConnection } from '@jupyterlab/services';

import { DatastoreWSMessages } from './wsmessages';

/**
 * The url for the datastore service.
 */
const DATASTORE_SERVICE_URL = 'lab/api/datastore';

/**
 * A class that manages exchange of transactions with the datastore server.
 */
export class DatastoreSession extends WSConnection<
  DatastoreWSMessages.Request,
  DatastoreWSMessages.Reply | DatastoreWSMessages.TransactionBroadcast
> {
  /**
   *
   */
  constructor(options: DatastoreSession.IOptions = {}) {
    super();
    this.sessionId = options.sessionId;
    this.key = options.key;
    this.handler = options.handler || null;
    this.serverSettings =
      options.serverSettings || ServerConnection.makeSettings();
    this._createSocket();
  }

  /**
   * Create a new, unique store id.
   *
   * @returns {Promise<number>} A promise to the new store id.
   */
  async createStoreId(): Promise<number> {
    await this.ready;
    const msg = DatastoreWSMessages.createMessage('storeid-request', {});
    const reply = await this._requestMessageReply(msg);
    return reply.content.storeId;
  }

  /**
   * Broadcast transactions to all datastores.
   *
   * @param transactions - The transactions to broadcast.
   * @returns An array of acknowledged transactionIds from the server.
   */
  broadcastTransactions(transactions: Datastore.Transaction[]): void {
    const msg = DatastoreWSMessages.createMessage('transaction-broadcast', {
      transactions
    });
    this._requestMessageReply(msg)
      .then(reply => {
        // TODO: Mark transactions as sent
        // Resend any that were not acknowledged.
      })
      .catch(() => {
        // TODO: Resend transactions
      });
  }

  /**
   * Request the complete history of the datastore.
   *
   * The transactions of the history will be sent to the set handler.
   */
  async replayHistory(): Promise<void> {
    const msg = DatastoreWSMessages.createMessage('history-request', {});
    const reply = await this._requestMessageReply(msg);
    this._handleTransactions(reply.content.transactions);
  }

  /**
   * The server settings for the session.
   */
  readonly serverSettings: ServerConnection.ISettings;

  readonly sessionId: string | undefined;

  readonly key: string | undefined;

  handler: IMessageHandler | null;

  protected wsFactory() {
    const settings = this.serverSettings;
    const token = this.serverSettings.token;

    let wsUrl = URLExt.join(settings.wsUrl, DATASTORE_SERVICE_URL, this.key);
    if (token) {
      wsUrl = wsUrl + `?token=${encodeURIComponent(token)}`;
    }

    return new settings.WebSocket(wsUrl);
  }

  protected handleMessage(
    msg: DatastoreWSMessages.Reply | DatastoreWSMessages.TransactionBroadcast
  ): boolean {
    try {
      // TODO: Write a validator?
      // validate.validateMessage(msg);
    } catch (error) {
      console.error(`Invalid message: ${error.message}`);
      return false;
    }

    if (DatastoreWSMessages.isReply(msg)) {
      let delegate = this._delegates && this._delegates.get(msg.parentId!);
      if (delegate) {
        delegate.resolve(msg);
        return true;
      }
    }
    if (msg.msgType === 'transaction-broadcast') {
      this._handleTransactions(msg.content.transactions);
      return true;
    }
    return false;
  }

  /**
   * Process transactions received over the websocket.
   */
  private _handleTransactions(
    transactions: ReadonlyArray<Datastore.Transaction>
  ) {
    if (this.handler !== null) {
      for (let t of transactions) {
        const message = new DatastoreSession.RemoteTransactionMessage(t);
        this.handler.processMessage(message);
      }
    }
  }

  /**
   * Send a message to the server and resolve the reply message.
   */
  private _requestMessageReply<T extends DatastoreWSMessages.Request>(
    msg: T
  ): Promise<DatastoreWSMessages.IReplyMap[T['msgType']]> {
    const delegate = new PromiseDelegate<DatastoreWSMessages.Reply>();
    this._delegates.set(msg.msgId, delegate);

    const promise = delegate.promise.then(reply => {
      this._delegates.delete(msg.msgId);
      return reply;
    });

    this.sendMessage(msg);

    return promise;
  }

  private _delegates = new Map<
    string,
    PromiseDelegate<DatastoreWSMessages.Reply>
  >();
}

/**
 *
 */
export namespace DatastoreSession {
  export interface IOptions {
    /**
     *
     */
    key?: string;

    /**
     *
     */
    sessionId?: string;

    /**
     * The server settings for the session.
     */
    serverSettings?: ServerConnection.ISettings;

    /**
     *
     */
    handler?: IMessageHandler;
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
}
