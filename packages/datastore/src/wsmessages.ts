// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { JSONObject, ReadonlyJSONObject, UUID } from '@phosphor/coreutils';

import { Datastore } from '@phosphor/datastore';

/**
 * Namespace for datastore websocket protocol message statics.
 */
export namespace DatastoreWSMessages {
  /**
   *
   */
  export type IBaseMessage = JSONObject & {
    msgId: string;
    msgType:
      | 'storeid-request'
      | 'storeid-reply'
      | 'transaction-broadcast'
      | 'transaction-ack'
      | 'history-request'
      | 'history-reply'
      | 'fetch-transaction-request'
      | 'fetch-transaction-reply';
    parentId: undefined;

    readonly content: ReadonlyJSONObject;
  };

  export interface IMessageTypeMap {
    'storeid-request': IStoreIdMessageRequest;
    'storeid-reply': IStoreIdMessageReply;
    'transaction-broadcast': ITransactionBroadcastMessage;
    'transaction-ack': ITransactionAckMessage;
    'history-request': IHistoryRequestMessage;
    'history-reply': IHistoryReplyMessage;
    'fetch-transaction-request': IFetchRequestMessage;
    'fetch-transaction-reply': IFetchReplyMessage;
  }

  export interface IMessageReplyMap {
    'storeid-request': IStoreIdMessageReply;
    'transaction-broadcast': ITransactionAckMessage;
    'history-request': IHistoryReplyMessage;
    'fetch-transaction-request': IFetchReplyMessage;
  }

  export type IBaseReplyMessage = IBaseMessage & {
    readonly parentId: string;
  };

  /**
   *
   */
  export type IStoreIdMessageRequest = IBaseMessage & {
    readonly msgType: 'storeid-request';
    readonly content: {};
  };

  /**
   *
   */
  export type IStoreIdMessageReply = IBaseReplyMessage & {
    readonly msgType: 'storeid-reply';
    readonly content: {
      readonly storeId: number;
    };
  };

  /**
   *
   */
  export type ITransactionBroadcastMessage = IBaseMessage & {
    readonly msgType: 'transaction-broadcast';
    readonly content: {
      readonly transactions: ReadonlyArray<Datastore.Transaction>;
    };
  };

  /**
   *
   */
  export type ITransactionAckMessage = IBaseReplyMessage & {
    readonly msgType: 'transaction-ack';
    readonly content: {
      readonly transactionIds: ReadonlyArray<string>;
    };
  };

  /**
   *
   */
  export type IFetchRequestMessage = IBaseMessage & {
    readonly msgType: 'fetch-transaction-request';
    readonly content: {
      readonly transactionIds: ReadonlyArray<string>;
    };
  };

  /**
   *
   */
  export type IFetchReplyMessage = IBaseReplyMessage & {
    readonly msgType: 'fetch-transaction-reply';
    readonly content: {
      readonly transactions: ReadonlyArray<Datastore.Transaction>;
    };
  };

  /**
   *
   */
  export type IHistoryRequestMessage = IBaseMessage & {
    readonly msgType: 'history-request';
    readonly content: {};
  };

  /**
   *
   */
  export type IHistoryReplyMessage = IBaseReplyMessage & {
    readonly msgType: 'history-reply';
    readonly content: {
      history: {
        transactions: Datastore.Transaction[];
      };
    };
  };

  /**
   *
   */
  export type IRequestMessage =
    | IStoreIdMessageRequest
    | ITransactionBroadcastMessage
    | IFetchRequestMessage
    | IHistoryRequestMessage;

  /**
   *
   */
  export type IReplyMessage =
    | IStoreIdMessageReply
    | ITransactionAckMessage
    | IFetchReplyMessage
    | IHistoryReplyMessage;

  /**
   *
   */
  export type IMessage = IRequestMessage | IReplyMessage;

  /**
   * Create a WSServerAdapter message.
   *
   * @param {string} msgType The message type.
   * @param {ReadonlyJSONObject} content The content of the message.
   * @param {string} parentId An optional id of the parent of this message.
   * @returns {ITransactionBroadcastMessage} The created message.
   */
  export function createMessage<K extends IMessage['msgType']>(
    msgType: K,
    content: IMessageTypeMap[K]['content'],
    parentId?: IMessageTypeMap[K]['parentId']
  ): IMessageTypeMap[K] {
    const msgId = UUID.uuid4();
    return {
      msgId,
      msgType,
      parentId,
      content
    } as IMessageTypeMap[K];
  }

  /**
   * Create a WSServerAdapter message.
   *
   * @param {string} msgType The message type.
   * @param {ReadonlyJSONObject} content The content of the message.
   * @param {string} parentId The id of the parent of this reply.
   * @returns {ITransactionBroadcastMessage} The created message.
   */
  export function createReply<T extends IBaseReplyMessage>(
    msgType: T['msgType'],
    content: T['content'],
    parentId: string
  ): T {
    const msgId = UUID.uuid4();
    return {
      msgId,
      msgType,
      parentId,
      content
    } as T;
  }

  /**
   * Whether a message is a reply to a previous request.
   * @param message - The message to consider.
   * @returns Whether the message is a reply.
   */
  export function isReply(message: IMessage): message is IReplyMessage {
    return message.parentId !== undefined;
  }
}
