// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { nbformat } from '@jupyterlab/coreutils';

import { UUID } from '@phosphor/coreutils';

import { JSONObject } from '@phosphor/coreutils';

import { Kernel } from './kernel';

/**
 * A namespace for kernel messages.
 */
export namespace KernelMessage {
  export interface IOptions<T extends Message> {
    session: string;
    channel: T['channel'];
    msgType: T['header']['msg_type'];
    content: T['content'];
    buffers?: (ArrayBuffer | ArrayBufferView)[];
    metadata?: JSONObject;
    msgId?: string;
    username?: string;
    parentHeader?: T['parent_header'];
  }
  export function createMessage<T extends IClearOutputMsg>(
    options: IOptions<T>
  ): T;
  export function createMessage<T extends ICommCloseMsg<'iopub'>>(
    options: IOptions<T>
  ): T;
  export function createMessage<T extends ICommCloseMsg<'shell'>>(
    options: IOptions<T>
  ): T;
  export function createMessage<T extends ICommInfoReplyMsg>(
    options: IOptions<T>
  ): T;
  export function createMessage<T extends ICommInfoRequestMsg>(
    options: IOptions<T>
  ): T;
  export function createMessage<T extends ICommMsgMsg<'iopub'>>(
    options: IOptions<T>
  ): T;
  export function createMessage<T extends ICommMsgMsg<'shell'>>(
    options: IOptions<T>
  ): T;
  export function createMessage<T extends ICommOpenMsg<'iopub'>>(
    options: IOptions<T>
  ): T;
  export function createMessage<T extends ICommOpenMsg<'shell'>>(
    options: IOptions<T>
  ): T;
  export function createMessage<T extends ICompleteReplyMsg>(
    options: IOptions<T>
  ): T;
  export function createMessage<T extends ICompleteRequestMsg>(
    options: IOptions<T>
  ): T;
  export function createMessage<T extends IDisplayDataMsg>(
    options: IOptions<T>
  ): T;
  export function createMessage<T extends IErrorMsg>(options: IOptions<T>): T;
  export function createMessage<T extends IExecuteInputMsg>(
    options: IOptions<T>
  ): T;
  export function createMessage<T extends IExecuteReplyMsg>(
    options: IOptions<T>
  ): T;
  export function createMessage<T extends IExecuteRequestMsg>(
    options: IOptions<T>
  ): T;
  export function createMessage<T extends IExecuteResultMsg>(
    options: IOptions<T>
  ): T;
  export function createMessage<T extends IHistoryReplyMsg>(
    options: IOptions<T>
  ): T;
  export function createMessage<T extends IHistoryRequestMsg>(
    options: IOptions<T>
  ): T;
  export function createMessage<T extends IInfoReplyMsg>(
    options: IOptions<T>
  ): T;
  export function createMessage<T extends IInfoRequestMsg>(
    options: IOptions<T>
  ): T;
  export function createMessage<T extends IInputReplyMsg>(
    options: IOptions<T>
  ): T;
  export function createMessage<T extends IInputRequestMsg>(
    options: IOptions<T>
  ): T;
  export function createMessage<T extends IInspectReplyMsg>(
    options: IOptions<T>
  ): T;
  export function createMessage<T extends IInspectRequestMsg>(
    options: IOptions<T>
  ): T;
  export function createMessage<T extends IIsCompleteReplyMsg>(
    options: IOptions<T>
  ): T;
  export function createMessage<T extends IIsCompleteRequestMsg>(
    options: IOptions<T>
  ): T;
  export function createMessage<T extends IStatusMsg>(options: IOptions<T>): T;
  export function createMessage<T extends IStreamMsg>(options: IOptions<T>): T;
  export function createMessage<T extends IUpdateDisplayDataMsg>(
    options: IOptions<T>
  ): T;

  export function createMessage<T extends Message>(options: IOptions<T>): T {
    return {
      buffers: options.buffers || [],
      channel: options.channel,
      content: options.content,
      header: {
        date: new Date().toISOString(),
        msg_id: options.msgId || UUID.uuid4(),
        msg_type: options.msgType,
        session: options.session,
        username: options.username || '',
        version: '5.2'
      },
      metadata: options.metadata || {},
      parent_header: options.parentHeader || {}
    } as T;
  }

  /**
   * Shell message types.
   */
  export type ShellMessageType =
    | 'comm_close'
    | 'comm_info_reply'
    | 'comm_info_request'
    | 'comm_msg'
    | 'comm_open'
    | 'complete_reply'
    | 'complete_request'
    | 'execute_reply'
    | 'execute_request'
    | 'history_reply'
    | 'history_request'
    | 'inspect_reply'
    | 'inspect_request'
    | 'interrupt_reply'
    | 'interrupt_request'
    | 'is_complete_reply'
    | 'is_complete_request'
    | 'kernel_info_reply'
    | 'kernel_info_request'
    | 'shutdown_reply'
    | 'shutdown_request';

  /**
   * IOPub message types.
   */
  export type IOPubMessageType =
    | 'clear_output'
    | 'comm_close'
    | 'comm_msg'
    | 'comm_open'
    | 'display_data'
    | 'error'
    | 'execute_input'
    | 'execute_result'
    | 'status'
    | 'stream'
    | 'update_display_data';

  /**
   * Stdin message types.
   */
  export type StdinMessageType = 'input_request' | 'input_reply';

  /**
   * Jupyter message types.
   */
  export type MessageType =
    | IOPubMessageType
    | ShellMessageType
    | StdinMessageType;

  /**
   * The valid Jupyter channel names in a message to a frontend.
   */
  export type Channel = 'shell' | 'iopub' | 'stdin';

  /**
   * Kernel message header content.
   *
   * See [Messaging in Jupyter](https://jupyter-client.readthedocs.io/en/latest/messaging.html#general-message-format).
   *
   * **See also:** [[IMessage]]
   */
  export interface IHeader<T extends MessageType = MessageType> {
    /**
     * ISO 8601 timestamp for when the message is created
     */
    date: string;

    /**
     * Message id, typically UUID, must be unique per message
     */
    msg_id: string;

    /**
     * Message type
     */
    msg_type: T;

    /**
     * Session id, typically UUID, should be unique per session.
     */
    session: string;

    /**
     * The user sending the message
     */
    username: string;

    /**
     * The message protocol version, should be 5.1, 5.2, 5.3, etc.
     */
    version: string;
  }

  /**
   * Kernel message specification.
   *
   * See [Messaging in Jupyter](https://jupyter-client.readthedocs.io/en/latest/messaging.html#general-message-format).
   */
  export interface IMessage<MSGTYPE extends MessageType = MessageType> {
    /**
     * The message header.
     */
    header: IHeader<MSGTYPE>;

    /**
     * The parent message
     */
    parent_header: IHeader | {};

    /**
     * Metadata associated with the message.
     */
    metadata: JSONObject;

    /**
     * The content of the message.
     */
    content: MessageContent;

    /**
     * The channel on which the message is transmitted.
     */
    channel: Channel;

    /**
     * An optional list of binary buffers.
     */
    buffers?: (ArrayBuffer | ArrayBufferView)[];
  }

  /**
   * A kernel message on the `'shell'` channel.
   */
  export interface IShellMessage<T extends ShellMessageType = ShellMessageType>
    extends IMessage<T> {
    channel: 'shell';
  }

  /**
   * A kernel message on the `'iopub'` channel.
   */
  export interface IIOPubMessage<T extends IOPubMessageType = IOPubMessageType>
    extends IMessage<T> {
    channel: 'iopub';
  }

  /**
   * A kernel message on the `'stdin'` channel.
   */
  export interface IStdinMessage<T extends StdinMessageType = StdinMessageType>
    extends IMessage<T> {
    channel: 'stdin';
  }

  export type Message =
    | IClearOutputMsg
    | ICommCloseMsg<'iopub'>
    | ICommCloseMsg<'shell'>
    | ICommInfoReplyMsg
    | ICommInfoRequestMsg
    | ICommMsgMsg<'iopub'>
    | ICommMsgMsg<'shell'>
    | ICommOpenMsg<'iopub'>
    | ICommOpenMsg<'shell'>
    | ICompleteReplyMsg
    | ICompleteRequestMsg
    | IDisplayDataMsg
    | IErrorMsg
    | IExecuteInputMsg
    | IExecuteReplyMsg
    | IExecuteRequestMsg
    | IExecuteResultMsg
    | IHistoryReplyMsg
    | IHistoryRequestMsg
    | IInfoReplyMsg
    | IInfoRequestMsg
    | IInputReplyMsg
    | IInputRequestMsg
    | IInspectReplyMsg
    | IInspectRequestMsg
    | IIsCompleteReplyMsg
    | IIsCompleteRequestMsg
    | IStatusMsg
    | IStreamMsg
    | IUpdateDisplayDataMsg;

  export type MessageContent<T extends Message = Message> = T['content'];

  /**
   * A `'stream'` message on the `'iopub'` channel.
   *
   * See [Streams](https://jupyter-client.readthedocs.io/en/latest/messaging.html#streams-stdout-stderr-etc).
   */
  export interface IStreamMsg extends IIOPubMessage<'stream'> {
    content: {
      name: 'stdout' | 'stderr';
      text: string;
    };
  }

  /**
   * Test whether a kernel message is a `'stream'` message.
   */
  export function isStreamMsg(msg: IMessage): msg is IStreamMsg {
    return msg.header.msg_type === 'stream';
  }

  /**
   * A `'display_data'` message on the `'iopub'` channel.
   *
   * See [Display data](https://jupyter-client.readthedocs.io/en/latest/messaging.html#display-data).
   */
  export interface IDisplayDataMsg extends IIOPubMessage<'display_data'> {
    content: {
      data: nbformat.IMimeBundle;
      metadata: nbformat.OutputMetadata;
      transient?: { display_id?: string };
    };
  }

  /**
   * Test whether a kernel message is an `'display_data'` message.
   */
  export function isDisplayDataMsg(msg: IMessage): msg is IDisplayDataMsg {
    return msg.header.msg_type === 'display_data';
  }

  /**
   * An `'update_display_data'` message on the `'iopub'` channel.
   *
   * See [Update Display data](https://jupyter-client.readthedocs.io/en/latest/messaging.html#update-display-data).
   */
  export interface IUpdateDisplayDataMsg
    extends IIOPubMessage<'update_display_data'> {
    content: IDisplayDataMsg['content'] & {
      // display_id is a required field in update_display_data
      transient: { display_id: string };
    };
  }

  /**
   * Test whether a kernel message is an `'update_display_data'` message.
   */
  export function isUpdateDisplayDataMsg(
    msg: IMessage
  ): msg is IUpdateDisplayDataMsg {
    return msg.header.msg_type === 'update_display_data';
  }

  /**
   * An `'execute_input'` message on the `'iopub'` channel.
   *
   * See [Code inputs](https://jupyter-client.readthedocs.io/en/latest/messaging.html#code-inputs).
   */
  export interface IExecuteInputMsg extends IIOPubMessage<'execute_input'> {
    content: {
      code: string;
      execution_count: nbformat.ExecutionCount;
    };
  }

  /**
   * Test whether a kernel message is an `'execute_input'` message.
   */
  export function isExecuteInputMsg(msg: IMessage): msg is IExecuteInputMsg {
    return msg.header.msg_type === 'execute_input';
  }

  /**
   * An `'execute_result'` message on the `'iopub'` channel.
   *
   * See [Execution results](https://jupyter-client.readthedocs.io/en/latest/messaging.html#id4).
   */
  export interface IExecuteResultMsg extends IIOPubMessage<'execute_result'> {
    content: {
      execution_count: nbformat.ExecutionCount;
      data: nbformat.IMimeBundle;
      metadata: nbformat.OutputMetadata;
      transient?: { display_id?: string };
    };
  }

  /**
   * Test whether a kernel message is an `'execute_result'` message.
   */
  export function isExecuteResultMsg(msg: IMessage): msg is IExecuteResultMsg {
    return msg.header.msg_type === 'execute_result';
  }

  /**
   * A `'error'` message on the `'iopub'` channel.
   *
   * See [Execution errors](https://jupyter-client.readthedocs.io/en/latest/messaging.html#execution-errors).
   */
  export interface IErrorMsg extends IIOPubMessage<'error'> {
    content: {
      ename: string;
      evalue: string;
      traceback: string[];
    };
  }

  /**
   * Test whether a kernel message is an `'error'` message.
   */
  export function isErrorMsg(msg: IMessage): msg is IErrorMsg {
    return msg.header.msg_type === 'error';
  }

  /**
   * A `'status'` message on the `'iopub'` channel.
   *
   * See [Kernel status](https://jupyter-client.readthedocs.io/en/latest/messaging.html#kernel-status).
   */
  export interface IStatusMsg extends IIOPubMessage<'status'> {
    content: {
      execution_state: Kernel.Status;
    };
  }

  /**
   * Test whether a kernel message is a `'status'` message.
   */
  export function isStatusMsg(msg: IMessage): msg is IStatusMsg {
    return msg.header.msg_type === 'status';
  }

  /**
   * A `'clear_output'` message on the `'iopub'` channel.
   *
   * See [Clear output](https://jupyter-client.readthedocs.io/en/latest/messaging.html#clear-output).
   */
  export interface IClearOutputMsg extends IIOPubMessage<'clear_output'> {
    content: {
      wait: boolean;
    };
  }

  /**
   * Test whether a kernel message is a `'clear_output'` message.
   */
  export function isClearOutputMsg(msg: IMessage): msg is IClearOutputMsg {
    return msg.header.msg_type === 'clear_output';
  }

  /**
   * A `'comm_open'` message on the `'iopub'` channel.
   *
   * See [Comm open](https://jupyter-client.readthedocs.io/en/latest/messaging.html#opening-a-comm).
   */
  export interface ICommOpenMsg<
    T extends 'shell' | 'iopub' = 'iopub' | 'shell'
  > extends IMessage<'comm_open'> {
    channel: T;
    content: ICommOpen;
  }

  /**
   * A `'comm_open'` message on the `'iopub'` channel.
   *
   * See [Comm open](https://jupyter-client.readthedocs.io/en/latest/messaging.html#opening-a-comm).
   */
  export interface ICommOpenIOPubMsg extends IIOPubMessage<'comm_open'> {
    channel: 'iopub';
    content: ICommOpen;
  }

  /**
   * A `'comm_open'` message on the `'shell'` channel.
   *
   * See [Comm open](https://jupyter-client.readthedocs.io/en/latest/messaging.html#opening-a-comm).
   */
  export interface ICommOpenShellMsg extends IShellMessage<'comm_open'> {
    channel: 'shell';
    content: ICommOpen;
  }

  /**
   * The content of a `'comm_open'` message.  The message can
   * be received on the `'iopub'` channel or send on the `'shell'` channel.
   *
   * See [Comm open](https://jupyter-client.readthedocs.io/en/latest/messaging.html#opening-a-comm).
   */
  export interface ICommOpen {
    comm_id: string;
    target_name: string;
    data: JSONObject;
    target_module?: string;
  }

  /**
   * Test whether a kernel message is a `'comm_open'` message.
   */
  export function isCommOpenMsg(
    msg: IMessage
  ): msg is ICommOpenIOPubMsg | ICommOpenShellMsg {
    return msg.header.msg_type === 'comm_open';
  }

  export type iopubshell = 'iopub' | 'shell';

  /**
   * A `'comm_close'` message on the `'iopub'` channel.
   *
   * See [Comm close](https://jupyter-client.readthedocs.io/en/latest/messaging.html#opening-a-comm).
   */
  export interface ICommCloseMsg<
    T extends 'iopub' | 'shell' = 'iopub' | 'shell'
  > extends IMessage<'comm_close'> {
    channel: T;
    content: ICommClose;
  }

  /**
   * The content of a `'comm_close'` method.  The message can
   * be received on the `'iopub'` channel or send on the `'shell'` channel.
   *
   * See [Comm close](https://jupyter-client.readthedocs.io/en/latest/messaging.html#opening-a-comm).
   */
  export interface ICommClose {
    comm_id: string;
    data: JSONObject;
  }

  /**
   * Test whether a kernel message is a `'comm_close'` message.
   */
  export function isCommCloseMsg(
    msg: IMessage
  ): msg is ICommCloseMsg<'iopub' | 'shell'> {
    return msg.header.msg_type === 'comm_close';
  }

  /**
   * A `'comm_msg'` message on the `'iopub'` channel.
   *
   * See [Comm msg](https://jupyter-client.readthedocs.io/en/latest/messaging.html#opening-a-comm).
   */
  export interface ICommMsgMsg<T extends 'iopub' | 'shell' = 'iopub' | 'shell'>
    extends IMessage<'comm_msg'> {
    channel: T;
    content: ICommMsg;
  }

  /**
   * The content of a `'comm_msg'` message.  The message can
   * be received on the `'iopub'` channel or send on the `'shell'` channel.
   *
   * See [Comm msg](https://jupyter-client.readthedocs.io/en/latest/messaging.html#opening-a-comm).
   */
  export interface ICommMsg {
    comm_id: string;
    data: JSONObject;
  }

  /**
   * Test whether a kernel message is a `'comm_msg'` message.
   */
  export function isCommMsgMsg(
    msg: IMessage
  ): msg is ICommMsgMsg<'iopub' | 'shell'> {
    return msg.header.msg_type === 'comm_msg';
  }

  /**
   * A `'kernel_info_request'` message on the `'shell'` channel.
   *
   * See [Messaging in Jupyter](https://jupyter-client.readthedocs.io/en/latest/messaging.html#kernel-info).
   */
  export interface IInfoRequestMsg
    extends IShellMessage<'kernel_info_request'> {
    content: {};
  }

  /**
   * Test whether a kernel message is a `'kernel_info_request'` message.
   */
  export function isInfoRequestMsg(msg: IMessage): msg is IInfoRequestMsg {
    return msg.header.msg_type === 'kernel_info_request';
  }

  /**
   * A `'kernel_info_reply'` message on the `'shell'` channel.
   *
   * See [Messaging in Jupyter](https://jupyter-client.readthedocs.io/en/latest/messaging.html#kernel-info).
   */
  export interface IInfoReplyMsg extends IShellMessage<'kernel_info_reply'> {
    parent_header: IHeader<'kernel_info_request'>;
    content: IInfoReply;
  }

  /**
   * The kernel info content.
   *
   * See [Messaging in Jupyter](https://jupyter-client.readthedocs.io/en/latest/messaging.html#kernel-info).
   */
  export interface IInfoReply {
    protocol_version: string;
    implementation: string;
    implementation_version: string;
    language_info: ILanguageInfo;
    banner: string;
    help_links: { text: string; url: string }[];
  }

  /**
   * The kernel language information specification.
   *
   * See [Messaging in Jupyter](https://jupyter-client.readthedocs.io/en/latest/messaging.html#kernel-info).
   */
  export interface ILanguageInfo extends nbformat.ILanguageInfoMetadata {
    version: string;
    nbconverter_exporter?: string;
  }

  /**
   * A  `'complete_request'` message.
   *
   * See [Messaging in Jupyter](https://jupyter-client.readthedocs.io/en/latest/messaging.html#completion).
   *
   * **See also:** [[ICompleteReplyMsg]], [[IKernel.complete]]
   */
  export interface ICompleteRequestMsg
    extends IShellMessage<'complete_request'> {
    content: ICompleteRequest;
  }

  /**
   * The content of a  `'complete_request'` message.
   *
   * See [Messaging in Jupyter](https://jupyter-client.readthedocs.io/en/latest/messaging.html#completion).
   *
   * **See also:** [[ICompleteReply]], [[IKernel.complete]]
   */
  export interface ICompleteRequest {
    code: string;
    cursor_pos: number;
  }

  /**
   * A `'complete_reply'` message on the `'stream'` channel.
   *
   * See [Messaging in Jupyter](https://jupyter-client.readthedocs.io/en/latest/messaging.html#completion).
   *
   * **See also:** [[ICompleteRequest]], [[IKernel.complete]]
   */
  export interface ICompleteReplyMsg extends IShellMessage<'complete_reply'> {
    parent_header: IHeader<'complete_request'>;
    content: {
      matches: string[];
      cursor_start: number;
      cursor_end: number;
      metadata: JSONObject;
      status: 'ok' | 'error';
    };
  }

  /**
   * An `'inspect_request'` message.
   *
   * See [Messaging in Jupyter](https://jupyter-client.readthedocs.io/en/latest/messaging.html#introspection).
   *
   * **See also:** [[IInspectReplyMsg]], [[[IKernel.inspect]]]
   */
  export interface IInspectRequestMsg extends IShellMessage<'inspect_request'> {
    content: IInspectRequest;
  }

  /**
   * The content of an `'inspect_request'` message.
   *
   * See [Messaging in Jupyter](https://jupyter-client.readthedocs.io/en/latest/messaging.html#introspection).
   *
   * **See also:** [[IInspectReply]], [[[IKernel.inspect]]]
   */
  export interface IInspectRequest {
    code: string;
    cursor_pos: number;
    detail_level: 0 | 1;
  }

  /**
   * A `'inspect_reply'` message on the `'stream'` channel.
   *
   * See [Messaging in Jupyter](https://jupyter-client.readthedocs.io/en/latest/messaging.html#introspection).
   *
   * **See also:** [[IInspectRequest]], [[IKernel.inspect]]
   */
  export interface IInspectReplyMsg extends IShellMessage<'inspect_reply'> {
    parent_header: IHeader<'inspect_request'>;
    content: {
      status: 'ok' | 'error';
      found: boolean;
      data: JSONObject;
      metadata: JSONObject;
    };
  }

  /**
   * A `'history_request'` message.
   *
   * See [Messaging in Jupyter](https://jupyter-client.readthedocs.io/en/latest/messaging.html#history).
   *
   * **See also:** [[IHistoryReplyMsg]], [[[IKernel.history]]]
   */
  export interface IHistoryRequestMsg extends IShellMessage<'history_request'> {
    content: IHistoryRequest;
  }

  /**
   * The history access settings.
   */
  export type HistAccess = 'range' | 'tail' | 'search';

  /**
   * The content of a `'history_request'` range message.
   *
   * See [Messaging in Jupyter](https://jupyter-client.readthedocs.io/en/latest/messaging.html#history).
   *
   * **See also:** [[IHistoryReply]], [[[IKernel.history]]]
   */
  export interface IHistoryRequestRange {
    output: boolean;
    raw: boolean;
    hist_access_type: 'range';
    session: number;
    start: number;
    stop: number;
  }

  /**
   * The content of a `'history_request'` tail message.
   *
   * See [Messaging in Jupyter](https://jupyter-client.readthedocs.io/en/latest/messaging.html#history).
   *
   * **See also:** [[IHistoryReply]], [[[IKernel.history]]]
   */
  export interface IHistoryRequestTail {
    output: boolean;
    raw: boolean;
    hist_access_type: 'tail';
    n: number;
  }

  /**
   * The content of a `'history_request'` search message.
   *
   * See [Messaging in Jupyter](https://jupyter-client.readthedocs.io/en/latest/messaging.html#history).
   *
   * **See also:** [[IHistoryReply]], [[[IKernel.history]]]
   */
  export interface IHistoryRequestSearch {
    output: boolean;
    raw: boolean;
    hist_access_type: 'search';
    n: number;
    pattern: string;
    unique: boolean;
  }

  /**
   * The content of a `'history_request'` message.
   *
   * See [Messaging in Jupyter](https://jupyter-client.readthedocs.io/en/latest/messaging.html#history).
   *
   * **See also:** [[IHistoryReply]], [[[IKernel.history]]]
   */
  export type IHistoryRequest =
    | IHistoryRequestRange
    | IHistoryRequestTail
    | IHistoryRequestSearch;

  /**
   * A `'history_reply'` message on the `'stream'` channel.
   *
   * See [Messaging in Jupyter](https://jupyter-client.readthedocs.io/en/latest/messaging.html#history).
   *
   * **See also:** [[IHistoryRequest]], [[IKernel.history]]
   */
  export interface IHistoryReplyMsg extends IShellMessage<'history_reply'> {
    parent_header: IHeader<'history_request'>;
    content: {
      history:
        | [number, number, string][]
        | [number, number, [string, string]][];
    };
  }

  /**
   * An `'is_complete_request'` message.
   *
   * See [Messaging in Jupyter](https://jupyter-client.readthedocs.io/en/latest/messaging.html#code-completeness).
   *
   * **See also:** [[IIsCompleteReplyMsg]], [[IKernel.isComplete]]
   */
  export interface IIsCompleteRequestMsg
    extends IShellMessage<'is_complete_request'> {
    content: IIsCompleteRequest;
  }

  /**
   * The content of an `'is_complete_request'` message.
   *
   * See [Messaging in Jupyter](https://jupyter-client.readthedocs.io/en/latest/messaging.html#code-completeness).
   *
   * **See also:** [[IIsCompleteReply]], [[IKernel.isComplete]]
   */
  export interface IIsCompleteRequest {
    code: string;
  }

  /**
   * An `'is_complete_reply'` message on the `'stream'` channel.
   *
   * See [Messaging in Jupyter](https://jupyter-client.readthedocs.io/en/latest/messaging.html#code-completeness).
   *
   * **See also:** [[IIsCompleteRequest]], [[IKernel.isComplete]]
   */
  export interface IIsCompleteReplyMsg
    extends IShellMessage<'is_complete_reply'> {
    parent_header: IHeader<'is_complete_request'>;
    content: {
      status: string;
      indent: string;
    };
  }

  /**
   * An `execute_request` message on the `
   */
  export interface IExecuteRequestMsg extends IShellMessage<'execute_request'> {
    content: IExecuteRequest;
  }

  /**
   * The content of an `'execute_request'` message.
   *
   * See [Messaging in Jupyter](https://jupyter-client.readthedocs.io/en/latest/messaging.html#execute).
   *
   * **See also:** [[IExecuteReply]], [[IKernel.execute]]
   */
  export interface IExecuteRequest extends IExecuteOptions {
    code: string;
  }

  /**
   * The options used to configure an execute request.
   *
   * See [Messaging in Jupyter](https://jupyter-client.readthedocs.io/en/latest/messaging.html#execute).
   */
  export interface IExecuteOptions {
    /**
     * Whether to execute the code as quietly as possible.
     * The default is `false`.
     */
    silent?: boolean;

    /**
     * Whether to store history of the execution.
     * The default `true` if silent is False.
     * It is forced to  `false ` if silent is `true`.
     */
    store_history?: boolean;

    /**
     * A mapping of names to expressions to be evaluated in the
     * kernel's interactive namespace.
     */
    user_expressions?: JSONObject;

    /**
     * Whether to allow stdin requests.
     * The default is `true`.
     */
    allow_stdin?: boolean;

    /**
     * Whether to the abort execution queue on an error.
     * The default is `false`.
     */
    stop_on_error?: boolean;
  }

  /**
   * An `'execute_reply'` message on the `'stream'` channel.
   *
   * See [Messaging in Jupyter](https://jupyter-client.readthedocs.io/en/latest/messaging.html#execution-results).
   *
   * **See also:** [[IExecuteRequest]], [[IKernel.execute]]
   */
  export interface IExecuteReplyMsg extends IShellMessage<'execute_reply'> {
    parent_header: IHeader<'execute_request'>;
    content: IExecuteReply;
  }

  /**
   * The content of an `execute-reply` message.
   *
   * See [Messaging in Jupyter](https://jupyter-client.readthedocs.io/en/latest/messaging.html#execution-results).
   */
  export interface IExecuteReply {
    status: 'ok' | 'error' | 'abort';
    execution_count: nbformat.ExecutionCount;
  }

  /**
   * The `'execute_reply'` contents for an `'ok'` status.
   *
   * See [Messaging in Jupyter](https://jupyter-client.readthedocs.io/en/latest/messaging.html#execution-results).
   */
  export interface IExecuteOkReply extends IExecuteReply {
    /**
     * A list of payload objects.
     * Payloads are considered deprecated.
     * The only requirement of each payload object is that it have a 'source'
     * key, which is a string classifying the payload (e.g. 'page').
     */
    payload?: JSONObject[];

    /**
     * Results for the user_expressions.
     */
    user_expressions: JSONObject;
  }

  /**
   * The `'execute_reply'` contents for an `'error'` status.
   *
   * See [Messaging in Jupyter](https://jupyter-client.readthedocs.io/en/latest/messaging.html#execution-results).
   */
  export interface IExecuteErrorReply extends IExecuteReply {
    /**
     * The exception name.
     */
    ename: string;

    /**
     * The Exception value.
     */
    evalue: string;

    /**
     * A list of traceback frames.
     */
    traceback: string[];
  }

  /**
   * Test whether a kernel message is an `'execute_reply'` message.
   */
  export function isExecuteReplyMsg(msg: IMessage): msg is IExecuteReplyMsg {
    return msg.header.msg_type === 'execute_reply';
  }

  /**
   * An `'input_request'` message on the `'stdin'` channel.
   *
   * See [Messaging in Jupyter](https://jupyter-client.readthedocs.io/en/latest/messaging.html#messages-on-the-stdin-router-dealer-sockets).
   */
  export interface IInputRequestMsg extends IStdinMessage<'input_request'> {
    content: IInputRequest;
  }

  /**
   * The content of an `'input_request'` message.
   */
  export interface IInputRequest {
    /**
     * The text to show at the prompt.
     */
    prompt: string;

    /**
     * Whether the request is for a password.
     * If so, the frontend shouldn't echo input.
     */
    password: boolean;
  }

  /**
   * Test whether a kernel message is an `'input_request'` message.
   */
  export function isInputRequestMsg(msg: IMessage): msg is IInputRequestMsg {
    return msg.header.msg_type === 'input_request';
  }

  /**
   * An `'input_reply'` message on the `'stdin'` channel.
   *
   * See [Messaging in Jupyter](https://jupyter-client.readthedocs.io/en/latest/messaging.html#messages-on-the-stdin-router-dealer-sockets).
   */
  export interface IInputReplyMsg extends IStdinMessage<'input_reply'> {
    parent_header: IHeader<'input_request'>;
    content: IInputReply;
  }

  /**
   * The content of an `'input_reply'` message.
   *
   * See [Messaging in Jupyter](https://jupyter-client.readthedocs.io/en/latest/messaging.html#messages-on-the-stdin-router-dealer-sockets).
   *
   * **See also:** [[IKernel.input_reply]]
   */
  export interface IInputReply {
    value: string;
  }

  /**
   * Test whether a kernel message is an `'input_reply'` message.
   */
  export function isInputReplyMsg(msg: IMessage): msg is IInputReplyMsg {
    return msg.header.msg_type === 'input_reply';
  }

  export interface ICommInfoRequestMsg
    extends IShellMessage<'comm_info_request'> {
    content: ICommInfoRequest;
  }

  /**
   * The content of a `'comm_info_request'` message.
   *
   * See [Messaging in Jupyter](https://jupyter-client.readthedocs.io/en/latest/messaging.html#comm-info).
   *
   * **See also:** [[ICommInfoReply]], [[IKernel.commInfo]]
   */
  export interface ICommInfoRequest {
    target?: string;
  }

  /**
   * A `'comm_info_reply'` message on the `'stream'` channel.
   *
   * See [Messaging in Jupyter](https://jupyter-client.readthedocs.io/en/latest/messaging.html#comm-info).
   *
   * **See also:** [[ICommInfoRequest]], [[IKernel.commInfo]]
   */
  export interface ICommInfoReplyMsg extends IShellMessage<'comm_info_reply'> {
    parent_header: IHeader<'comm_info_request'>;
    content: {
      /**
       * Mapping of comm ids to target names.
       */
      comms: { [commId: string]: { target_name: string } };
    };
  }
}
