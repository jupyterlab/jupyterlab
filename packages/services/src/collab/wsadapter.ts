// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ReadonlyJSONObject, UUID, PromiseDelegate
} from '@phosphor/coreutils';

import {
  IDisposable, DisposableDelegate
} from '@phosphor/disposable';

import {
  IMessageHandler
} from '@phosphor/messaging';

import {
  ISignal, Signal
} from '@phosphor/signaling';

import {
  IServerAdapter, Patch, PatchHistory, PatchHistoryMessage, RemotePatchMessage
} from '@phosphor/datastore';

import {
  ServerConnection
} from '../serverconnection';

import {
  WsConnection
} from '../wsconnection';


/**
 * The url for the adapter service.
 */
const DATASTORE_URL = 'api/datastore';


/**
 * Implementation of the WebSocket adapter object
 */
export
class WsAdapter implements IServerAdapter, IDisposable {
  /**
   * Construct an WebSocket adapter object.
   */
  constructor(options: WsAdapter.IOptions) {
    const socket = this.socket = new WsConnection(
      {...options, apiUrl: DATASTORE_URL});
    socket.message.connect(this.onMessage);
    if (socket.isReady) {
      socket.statusChanged.connect(this.onSocketStatusChanged);
    } else {
      // Don't handle initial connect status:
      socket.ready.then(() => {
        socket.statusChanged.connect(this.onSocketStatusChanged);
      }, () => {
        socket.statusChanged.connect(this.onSocketStatusChanged);
      });
    }
  }

  /**
   * A signal emitted when the adapter status changes.
   */
  get statusChanged(): ISignal<this, WsConnection.Status> {
    return this._statusChanged;
  }

  /**
   * The current status of the connection.
   */
  get status(): WsConnection.Status {
    return this.socket.status;
  }

  /**
   * Test whether the adapter has been disposed.
   */
  get isDisposed(): boolean {
    return this._isDisposed;
  }

  /**
   * Test whether the adapter is ready.
   */
  get isReady(): boolean {
    return this.socket.isReady;
  }

  /**
   * A promise that is fulfilled when the adapter is ready.
   */
  get ready(): Promise<void> {
    return this.socket.ready;
  }

  /**
   * Dispose of the resources held by the adapter.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this._isDisposed = true;
    this.socket.dispose();
    this.socket = null;
    Signal.clearData(this);
  }

  /**
   * Reconnect a disconnected adapter.
   *
   * #### Notes
   * Used when the websocket connection is lost.
   */
  reconnect(): Promise<void> {
    return this.socket.reconnect();
  }

  /**
   * Create a new, unique store id.
   *
   * @returns {Promise<number>} A promise to the new store id.
   */
  createStoreId(): Promise<number> {
    const msg = WsAdapterMessages.createStoreIdRequestMessage(this.socket.clientId);
    return this.handleRequestMessage(msg).then((reply: WsAdapterMessages.IStoreIdMessageReply) => {
      return reply.content.storeId;
    });
  }

  /**
   * Create a new, unique patch id.
   *
   * @returns {string} The patch id.
   */
  createPatchId(): string {
    return UUID.uuid4();
  }

  /**
   * Register a handler for messages from the server adaptor.
   *
   * @param {number} storeId The store id of the patch handler.
   * @param {IMessageHandler} handler The patch handler to register.
   * @returns {IDisposable} Disposable to use to unregister the handler.
   */
  registerPatchHandler(storeId: number, handler: IMessageHandler): IDisposable {
    this._handlers.set(storeId, handler);
    const fetchMsg = WsAdapterMessages.createPatchHistoryRequestMessage(this.socket.clientId);
    // TODO: Record any patches that arrive while waiting for reply
    this.handleRequestMessage(fetchMsg).then((historyMsg: WsAdapterMessages.IPatchHistoryReply) => {
      // TODO: Add any recorded patches that arrived
      const message = new PatchHistoryMessage(historyMsg.content.patchHistory);
      // Only report to a signle handler if passed:
      handler.processMessage(message);
    });
    return new DisposableDelegate(() => {
      this._handlers.delete(storeId);
    });
  }

  /**
   * Broadcast a patch to all data stores.
   *
   * @param {Patch} patch The patch to broadcast.
   */
  broadcastPatch(patch: Patch): void {
    const msg = WsAdapterMessages.createPatchBroadcastMessage(this.socket.clientId, patch);
    this.sendMessage(msg);
    this.broadcastLocal(patch);
  }

  /**
   * Fetch specific patches from history by their id.
   *
   * @param {string[]} patchIds The patch ids to fetch.
   * @returns {Promise<Patch[]>} A promise to the patches that are fetched.
   */
  fetchPatches(patchIds: string[]): Promise<Patch[]> {
    const msg = WsAdapterMessages.createPatchFetchRequestMessage(this.socket.clientId, patchIds);
    return this.handleRequestMessage(msg).then((reply: WsAdapterMessages.IPatchFetchReplyMessage) => {
      return reply.content.patches;
    });
  }

  /**
   * Handle messages from the socket.
   */
  protected onMessage(sender: WsConnection, msg: WsAdapterMessages.IMessage): void {
    try {
      // TODO: Write a validator
      // validate.validateMessage(msg);
    } catch (error) {
      console.error(`Invalid message: ${error.message}`);
      return;
    }

    let handled = false;
    if (msg.parentId) {
      let delegate = this._delegates && this._delegates.get(msg.parentId);
      if (delegate) {
        delegate.resolve(msg as WsAdapterMessages.IReplyMessage);
        handled = true;
      }
    }
    if (msg.msgType === 'patch-broadcast') {
      this._lastPatchIdReceived = msg.content.patch.patchId;
      this.broadcastLocal(msg.content.patch);
      handled = true;
    }
    if (!handled) {
      console.log('Unhandled server adapter message.', msg);
    }
  }


  /**
   * Send a message to the server and resolve the reply message.
   */
  protected handleRequestMessage(msg: WsAdapterMessages.IStoreIdMessageRequest): Promise<WsAdapterMessages.IStoreIdMessageReply>;
  protected handleRequestMessage(msg: WsAdapterMessages.IPatchFetchRequestMessage): Promise<WsAdapterMessages.IPatchFetchReplyMessage>;
  protected handleRequestMessage(msg: WsAdapterMessages.IPatchHistoryRequestMessage): Promise<WsAdapterMessages.IPatchHistoryReply>;
  protected handleRequestMessage(msg: WsAdapterMessages.IMessage): Promise<WsAdapterMessages.IReplyMessage> {
    const delegate = new PromiseDelegate<WsAdapterMessages.IReplyMessage>();
    this._delegates.set(msg.msgId, delegate);

    this.sendMessage(msg);

    return delegate.promise.then((reply) => {
      this._delegates.delete(msg.msgId);
      return reply;
    });
  }

  /**
   * Send a message over the socket.
   *
   * @param {WsAdapterMessages.IMessage} msg The message to send.
   */
  protected sendMessage(msg: WsAdapterMessages.IMessage): void {
    this.socket.sendWSMessage(msg);
  }

  /**
   * Broadcast a patch to all the local handlers.
   *
   * @param {Patch} patch The patch to broadcast.
   */
  protected broadcastLocal(patch: Patch): void {
    const message = new RemotePatchMessage(patch);
    this._handlers.forEach((handler, storeId) => {
      if (storeId === patch.storeId) {
        return;
      }
      handler.processMessage(message);
    });
  }

  /**
   * Trigger a replay of missing patches.
   *
   * Sends a message to the server that it should replay
   * all messages since the last received patch that did
   * not originate from this client. The messages will be
   * replayed by normal 'patch-broadcast' messages.
   */
  protected replayMissingPatches() {
    this.sendMessage(WsAdapterMessages.createReplayPatchedRequestMessage(
      this.socket.clientId, this._lastPatchIdReceived));
  }

  /**
   * Handler for statusChanged signal on socket.
   *
   * @param sender The originating WsConnection.
   * @param status The new status of the socket.
   */
  protected onSocketStatusChanged(sender: WsConnection, status: WsConnection.Status): void {
    switch (status) {
    case 'connected':
      // When reconnected after dead socket, refetch history:
      this.replayMissingPatches();
      break;
    default:
      break;
    }
    this._statusChanged.emit(status);
  }

  protected socket: WsConnection;

  private _isDisposed = false;
  private _delegates: Map<string, PromiseDelegate<WsAdapterMessages.IReplyMessage>>;
  private _handlers: Map<number, IMessageHandler>;
  private _statusChanged = new Signal<this, WsConnection.Status>(this);
  private _lastPatchIdReceived: string;
}


/**
 * The namespace for `WsAdapater` statics.
 */
export
namespace WsAdapter {
  /**
   * The options object used to initialize a websocket adapter.
   */
  export
  interface IOptions {
    /**
     * The server settings for the websocket connection.
     */
    serverSettings?: ServerConnection.ISettings;

    /**
     * The session ID to use for the websocket.
     */
    clientId?: string;
  }
}


/**
 * Message format for WsAdapter wire format.
 */
export
namespace WsAdapterMessages {

  /**
   * Base message type.
   */
  export
  type IBaseMessage = {
    msgId: string;
    msgType: (
      'storeid-request' | 'storeid-reply' | 'patch-broadcast' |
      'patch-history-request' | 'patch-history-reply' |
      'fetch-patch-request' | 'fetch-patch-reply' |
      'replay-patches-request'
    );
    clientId: string;
    parentId: undefined;

    readonly content: ReadonlyJSONObject;
  };

  /**
   * Base type for reply messages.
   */
  export
  type IReplyMessage = IBaseMessage & {
    parentId: string;
  };

  /**
   * A `'storeid-request'` message.
   */
  export
  type IStoreIdMessageRequest = IBaseMessage & {
    msgType: 'storeid-request';
    content: {};
  };

  /**
   * A `'storeid-request'` message.
   */
  export
  type IStoreIdMessageReply = IReplyMessage & {
    msgType: 'storeid-reply';
    content: {
      readonly storeId: number
    };
  };

  /**
   * A `'patch-broadcast'` message.
   */
  export
  type IPatchBroadcastMessage = IBaseMessage & {
    msgType: 'patch-broadcast';
    content: {
      readonly serial: Patch;
      readonly patch: Patch;
    };
  };

  /**
   * A `'patch-history-request'` message.
   */
  export
  type IPatchHistoryRequestMessage = IBaseMessage & {
    msgType: 'patch-history-request';
    content: {};
  };

  /**
   * A `'patch-history-reply'` message.
   */
  export
  type IPatchHistoryReply = IReplyMessage & {
    msgType: 'patch-history-reply';
    content: {
      lastSerial: number;
      patchHistory: PatchHistory
    };
  };

  /**
   * A `'fetch-patch-request'` message.
   */
  export
  type IPatchFetchRequestMessage = IBaseMessage & {
    msgType: 'fetch-patch-request';
    content: {
      readonly patchIds: ReadonlyArray<string>;
    };
  };

  /**
   * A `'fetch-patch-reply'` message.
   */
  export
  type IPatchFetchReplyMessage = IReplyMessage & {
    msgType: 'fetch-patch-reply';
    content: {
      readonly patches: Patch[];
    };
  };

  /**
   * A `'replay-patches-request'` message.
   */
  export
  type IReplayPatchesMessage = IBaseMessage & {
    msgType: 'replay-patches-request';
    content: {
      readonly lastPatchId: string;
    };
  };

  /**
   * A union type for all message types.
   */
  export
  type IMessage = (
    IStoreIdMessageRequest | IStoreIdMessageReply | IPatchBroadcastMessage |
    IPatchHistoryRequestMessage | IPatchHistoryReply |
    IPatchFetchRequestMessage | IPatchHistoryReply | IReplayPatchesMessage
  );


  /**
   * Create a WSServerAdapter message.
   *
   * @param {string} msgType The message type.
   * @param {ReadonlyJSONObject} content The content of the message.
   * @param {string} parentId An optional id of the parent of this message.
   * @returns {IPatchBroadcastMessage} The created message.
   */
  export
  function createMessage(msgType: IMessage['msgType'],
                         content: ReadonlyJSONObject,
                         clientId: string,
                         parentId?: string): IMessage {
    const msgId = UUID.uuid4();
    return {
      msgId,
      msgType,
      parentId,
      content,
      clientId,
    } as IMessage;
  }

  /**
   * Create a `'storeid-request'` message.
   *
   * @returns {IStoreIdMessageRequest} The created message.
   */
  export
  function createStoreIdRequestMessage(clientId: string): IStoreIdMessageRequest {
    return createMessage('storeid-request', {}, clientId) as IStoreIdMessageRequest;
  }

  /**
   * Create a `'patch-broadcast'` message.
   *
   * @param {Patch} patch The patch of the message.
   * @returns {IPatchBroadcastMessage} The created message.
   */
  export
  function createPatchBroadcastMessage(clientId: string, patch: Patch): IPatchBroadcastMessage {
    return createMessage('patch-broadcast', { patch }, clientId) as IPatchBroadcastMessage;
  }

  /**
   * Create a `'patch-history-request'` message.
   *
   * @returns {IPatchHistoryRequestMessage} The created message.
   */
  export
  function createPatchHistoryRequestMessage(clientId: string): IPatchHistoryRequestMessage {
    return createMessage('patch-history-request', {}, clientId) as IPatchHistoryRequestMessage;
  }

  /**
   * Create a `'fetch-patch-request'` message.
   *
   * @param {ReadonlyArray<string>} patchIds The patch ids of the message.
   * @returns {IPatchFetchRequestMessage} The created message.
   */
  export
  function createPatchFetchRequestMessage(clientId: string, patchIds: ReadonlyArray<string>): IPatchFetchRequestMessage {
    return createMessage('fetch-patch-request', { patchIds }, clientId) as IPatchFetchRequestMessage;
  }

  /**
   * Create a `'replay-patch-request'` message.
   *
   * @param {ReadonlyArray<string>} patchIds The patch ids of the message.
   * @returns {IPatchFetchRequestMessage} The created message.
   */
  export
  function createReplayPatchedRequestMessage(clientId: string, lastPatchId: string): IPatchFetchRequestMessage {
    return createMessage('replay-patches-request', { lastPatchId }, clientId) as IPatchFetchRequestMessage;
  }

}
