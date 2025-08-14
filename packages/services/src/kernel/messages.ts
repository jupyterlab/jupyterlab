// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import * as nbformat from '@jupyterlab/nbformat';
import { JSONObject, UUID } from '@lumino/coreutils';

export interface IOptions<T extends Message> {
  session: string;
  channel: T['channel'];
  msgType: T['header']['msg_type'];
  content: T['content'];
  buffers?: (ArrayBuffer | ArrayBufferView)[];
  metadata?: JSONObject;
  msgId?: string;
  username?: string;
  subshellId?: string | null;
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
export function createMessage<T extends IInfoReplyMsg>(options: IOptions<T>): T;
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
export function createMessage<T extends IInterruptReplyMsg>(
  options: IOptions<T>
): T;
export function createMessage<T extends IInterruptRequestMsg>(
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

/**
 * @hidden
 * #### Notes
 * Debug messages are experimental messages that are not in the official
 * kernel message specification. As such, this function is *NOT* considered
 * part of the public API, and may change without notice.
 */
export function createMessage<T extends IDebugRequestMsg>(
  options: IOptions<T>
): T;

/**
 * @hidden
 * #### Notes
 * Debug messages are experimental messages that are not in the official
 * kernel message specification. As such, this function is *NOT* considered
 * part of the public API, and may change without notice.
 */
export function createMessage<T extends IDebugReplyMsg>(
  options: IOptions<T>
): T;

/**
 * @hidden
 * #### Notes
 * Debug messages are experimental messages that are not in the official
 * kernel message specification. As such, this function is *NOT* considered
 * part of the public API, and may change without notice.
 */
export function createMessage<T extends IDebugEventMsg>(
  options: IOptions<T>
): T;

export function createMessage<T extends ICreateSubshellRequestMsg>(
  options: IOptions<T>
): T;
export function createMessage<T extends ICreateSubshellReplyMsg>(
  options: IOptions<T>
): T;
export function createMessage<T extends IDeleteSubshellRequestMsg>(
  options: IOptions<T>
): T;
export function createMessage<T extends IDeleteSubshellReplyMsg>(
  options: IOptions<T>
): T;
export function createMessage<T extends IListSubshellRequestMsg>(
  options: IOptions<T>
): T;
export function createMessage<T extends IListSubshellReplyMsg>(
  options: IOptions<T>
): T;

export function createMessage<T extends Message>(options: IOptions<T>): T {
  return {
    buffers: options.buffers ?? [],
    channel: options.channel,
    content: options.content,
    header: {
      date: new Date().toISOString(),
      msg_id: options.msgId ?? UUID.uuid4(),
      msg_type: options.msgType,
      session: options.session,
      username: options.username ?? '',
      subshell_id: options.subshellId ?? null,
      version: '5.2'
    },
    metadata: options.metadata ?? {},
    parent_header: options.parentHeader ?? {}
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
  | 'is_complete_reply'
  | 'is_complete_request'
  | 'kernel_info_reply'
  | 'kernel_info_request'
  | 'shutdown_reply'
  | 'shutdown_request';

/**
 * Control message types.
 *
 * #### Notes
 * Debug messages are experimental messages that are not in the official
 * kernel message specification. As such, debug message types are *NOT*
 * considered part of the public API, and may change without notice.
 */
export type ControlMessageType =
  | 'interrupt_reply'
  | 'interrupt_request'
  | 'debug_request'
  | 'debug_reply'
  | 'create_subshell_request'
  | 'create_subshell_reply'
  | 'delete_subshell_request'
  | 'delete_subshell_reply'
  | 'list_subshell_request'
  | 'list_subshell_reply';

/**
 * IOPub message types.
 *
 * #### Notes
 * Debug messages are experimental messages that are not in the official
 * kernel message specification. As such, debug message types are *NOT*
 * considered part of the public API, and may change without notice.
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
  | 'shutdown_reply'
  | 'status'
  | 'stream'
  | 'update_display_data'
  | 'debug_event';

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
  | ControlMessageType
  | StdinMessageType;

/**
 * The valid Jupyter channel names in a message to a frontend.
 */
export type Channel = 'shell' | 'control' | 'iopub' | 'stdin';

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
   * Subshell id identifying a subshell if not in main shell
   */
  subshell_id?: string;

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
   * An optional list of binary buffers.
   */
  buffers?: (ArrayBuffer | ArrayBufferView)[];

  /**
   * The channel on which the message is transmitted.
   */
  channel: Channel;

  /**
   * The content of the message.
   */
  content: Message['content'];

  /**
   * The message header.
   */
  header: IHeader<MSGTYPE>;

  /**
   * Metadata associated with the message.
   */
  metadata: JSONObject;

  /**
   * The parent message
   */
  parent_header: IHeader | Record<string, never>;
}

/**
 * A kernel message on the `'shell'` channel.
 */
export interface IShellMessage<T extends ShellMessageType = ShellMessageType>
  extends IMessage<T> {
  channel: 'shell';
}

/**
 * A kernel message on the `'control'` channel.
 */
export interface IControlMessage<
  T extends ControlMessageType = ControlMessageType
> extends IMessage<T> {
  channel: 'control';
}

/**
 * A message type for shell or control messages.
 *
 * #### Notes
 * This convenience is so we can use it as a generic type constraint.
 */
export type IShellControlMessage = IShellMessage | IControlMessage;

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

/**
 * Message types.
 *
 * #### Notes
 * Debug messages are experimental messages that are not in the official
 * kernel message specification. As such, debug message types are *NOT*
 * considered part of the public API, and may change without notice.
 */
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
  | IInterruptReplyMsg
  | IInterruptRequestMsg
  | IIsCompleteReplyMsg
  | IIsCompleteRequestMsg
  | IStatusMsg
  | IStreamMsg
  | IUpdateDisplayDataMsg
  | IDebugRequestMsg
  | IDebugReplyMsg
  | IDebugEventMsg
  | ICreateSubshellRequestMsg
  | ICreateSubshellReplyMsg
  | IDeleteSubshellRequestMsg
  | IDeleteSubshellReplyMsg
  | IListSubshellRequestMsg
  | IListSubshellReplyMsg;

// ////////////////////////////////////////////////
// IOPub Messages
// ///////////////////////////////////////////////

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
 * The valid Kernel status states.
 *
 * #### Notes
 * The status states are:
 * * `unknown`: The kernel status is unknown, often because the connection
 *   is disconnected or connecting. This state is determined by the kernel
 *   connection status.
 * * `autorestarting`: The kernel is restarting, initiated by the server.
 *   This state is set by the services library, not explicitly sent from the
 *   kernel.
 * * `starting`: The kernel is starting
 * * `idle`: The kernel has finished processing messages.
 * * `busy`: The kernel is currently processing messages.
 * * `restarting`: The kernel is restarting. This state is sent by the
 *   Jupyter server.
 * * `dead`: The kernel is dead and will not be restarted. This state is set
 *   by the Jupyter server and is a final state.
 */
export type Status =
  | 'unknown'
  | 'starting'
  | 'idle'
  | 'busy'
  | 'terminating'
  | 'restarting'
  | 'autorestarting'
  | 'dead';

/**
 * A `'status'` message on the `'iopub'` channel.
 *
 * See [Kernel status](https://jupyter-client.readthedocs.io/en/latest/messaging.html#kernel-status).
 */
export interface IStatusMsg extends IIOPubMessage<'status'> {
  content: {
    execution_state: Status;
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
 * An experimental `'debug_event'` message on the `'iopub'` channel
 *
 * @hidden
 *
 * #### Notes
 * Debug messages are experimental messages that are not in the official
 * kernel message specification. As such, this is *NOT* considered
 * part of the public API, and may change without notice.
 */
export interface IDebugEventMsg extends IIOPubMessage<'debug_event'> {
  content: {
    seq: number;
    type: 'event';
    event: string;
    body?: any;
  };
}

/**
 * Test whether a kernel message is an experimental `'debug_event'` message.
 *
 * @hidden
 *
 * #### Notes
 * Debug messages are experimental messages that are not in the official
 * kernel message specification. As such, this is *NOT* considered
 * part of the public API, and may change without notice.
 */

export function isDebugEventMsg(msg: IMessage): msg is IDebugEventMsg {
  return msg.header.msg_type === 'debug_event';
}

// ////////////////////////////////////////////////
// Comm Messages
// ///////////////////////////////////////////////

/**
 * A `'comm_open'` message on the `'iopub'` channel.
 *
 * See [Comm open](https://jupyter-client.readthedocs.io/en/latest/messaging.html#opening-a-comm).
 */
export interface ICommOpenMsg<T extends 'shell' | 'iopub' = 'iopub' | 'shell'>
  extends IMessage<'comm_open'> {
  channel: T;
  content: {
    comm_id: string;
    target_name: string;
    data: JSONObject;
    target_module?: string;
  };
}

/**
 * Test whether a kernel message is a `'comm_open'` message.
 */
export function isCommOpenMsg(msg: IMessage): msg is ICommOpenMsg {
  return msg.header.msg_type === 'comm_open';
}

/**
 * A `'comm_close'` message on the `'iopub'` channel.
 *
 * See [Comm close](https://jupyter-client.readthedocs.io/en/latest/messaging.html#opening-a-comm).
 */
export interface ICommCloseMsg<T extends 'iopub' | 'shell' = 'iopub' | 'shell'>
  extends IMessage<'comm_close'> {
  channel: T;
  content: {
    comm_id: string;
    data: JSONObject;
  };
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
  content: {
    comm_id: string;
    data: JSONObject;
  };
}

/**
 * Test whether a kernel message is a `'comm_msg'` message.
 */
export function isCommMsgMsg(msg: IMessage): msg is ICommMsgMsg {
  return msg.header.msg_type === 'comm_msg';
}

// ////////////////////////////////////////////////
// Shell Messages
// ///////////////////////////////////////////////

/**
 * Reply content indicating a successful request.
 */
export interface IReplyOkContent {
  status: 'ok';
}

/**
 * Reply content indicating an error.
 *
 * See the [Message spec](https://jupyter-client.readthedocs.io/en/latest/messaging.html#request-reply) for details.
 */
export interface IReplyErrorContent {
  status: 'error';

  /**
   * Exception name
   */
  ename: string;

  /**
   * Exception value
   */
  evalue: string;

  /**
   * Traceback
   */
  traceback: string[];
}

/**
 * Reply content indicating an aborted request.
 *
 * This is [deprecated](https://jupyter-client.readthedocs.io/en/latest/messaging.html#request-reply)
 * in message spec 5.1. Kernels should send an 'error' reply instead.
 */
export interface IReplyAbortContent {
  status: 'abort';
}

/**
 * A convenience type for reply content.
 *
 * This automatically unions the necessary error and abort replies required in
 * the [message spec](https://jupyter-client.readthedocs.io/en/latest/messaging.html#request-reply).
 */
type ReplyContent<T> = T | IReplyErrorContent | IReplyAbortContent;

/**
 * A `'kernel_info_request'` message on the `'shell'` channel.
 *
 * See [Messaging in Jupyter](https://jupyter-client.readthedocs.io/en/latest/messaging.html#kernel-info).
 */
export interface IInfoRequestMsg extends IShellMessage<'kernel_info_request'> {
  content: Record<string, never>;
}

/**
 * Test whether a kernel message is a `'kernel_info_request'` message.
 */
export function isInfoRequestMsg(msg: IMessage): msg is IInfoRequestMsg {
  return msg.header.msg_type === 'kernel_info_request';
}

/**
 * A `'kernel_info_reply'` message content.
 *
 * See [Messaging in Jupyter](https://jupyter-client.readthedocs.io/en/latest/messaging.html#kernel-info).
 */
export interface IInfoReply extends IReplyOkContent {
  protocol_version: string;
  implementation: string;
  implementation_version: string;
  language_info: ILanguageInfo;
  banner: string;
  help_links: { text: string; url: string }[];
  supported_features?: string[]; // https://github.com/jupyter/enhancement-proposals/pull/92
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
 * A `'kernel_info_reply'` message on the `'shell'` channel.
 *
 * See [Messaging in Jupyter](https://jupyter-client.readthedocs.io/en/latest/messaging.html#kernel-info).
 */
export interface IInfoReplyMsg extends IShellMessage<'kernel_info_reply'> {
  parent_header: IHeader<'kernel_info_request'>;
  content: ReplyContent<IInfoReply>;
}

/**
 * A  `'complete_request'` message.
 *
 * See [Messaging in Jupyter](https://jupyter-client.readthedocs.io/en/latest/messaging.html#completion).
 *
 * **See also:** [[ICompleteReplyMsg]], [[IKernel.complete]]
 */
export interface ICompleteRequestMsg extends IShellMessage<'complete_request'> {
  content: {
    code: string;
    cursor_pos: number;
  };
}

/**
 * A `'complete_reply'` message content.
 *
 * See [Messaging in Jupyter](https://jupyter-client.readthedocs.io/en/latest/messaging.html#completion).
 *
 * **See also:** [[ICompleteRequest]], [[IKernel.complete]]
 */
interface ICompleteReply extends IReplyOkContent {
  matches: string[];
  cursor_start: number;
  cursor_end: number;
  metadata: JSONObject;
}

/**
 * A `'complete_reply'` message on the `'shell'` channel.
 *
 * See [Messaging in Jupyter](https://jupyter-client.readthedocs.io/en/latest/messaging.html#completion).
 *
 * **See also:** [[ICompleteRequest]], [[IKernel.complete]]
 */
export interface ICompleteReplyMsg extends IShellMessage<'complete_reply'> {
  parent_header: IHeader<'complete_request'>;
  content: ReplyContent<ICompleteReply>;
}

/**
 * An `'inspect_request'` message.
 *
 * See [Messaging in Jupyter](https://jupyter-client.readthedocs.io/en/latest/messaging.html#introspection).
 *
 * **See also:** [[IInspectReplyMsg]], [[[IKernel.inspect]]]
 */
export interface IInspectRequestMsg extends IShellMessage<'inspect_request'> {
  content: {
    code: string;
    cursor_pos: number;
    detail_level: 0 | 1;
  };
}

/**
 * A `'inspect_reply'` message content.
 *
 * See [Messaging in Jupyter](https://jupyter-client.readthedocs.io/en/latest/messaging.html#introspection).
 *
 * **See also:** [[IInspectRequest]], [[IKernel.inspect]]
 */

export interface IInspectReply extends IReplyOkContent {
  found: boolean;
  data: JSONObject;
  metadata: JSONObject;
}

/**
 * A `'inspect_reply'` message on the `'shell'` channel.
 *
 * See [Messaging in Jupyter](https://jupyter-client.readthedocs.io/en/latest/messaging.html#introspection).
 *
 * **See also:** [[IInspectRequest]], [[IKernel.inspect]]
 */
export interface IInspectReplyMsg extends IShellMessage<'inspect_reply'> {
  parent_header: IHeader<'inspect_request'>;
  content: ReplyContent<IInspectReply>;
}

/**
 * An `'interrupt_request'` message.
 *
 * The interrupt messages can only be used for kernels which specify `interrupt_mode: 'message'`.
 * By default JupyterLab interrupts kernels via jupyter-server Kernels REST API instead.
 *
 * See [Messaging in Jupyter](https://jupyter-client.readthedocs.io/en/latest/messaging.html#kernel-interrupt).
 *
 * **See also:** [[IInterruptReplyMsg]], [[[IKernel.interrupt]]]
 */
export interface IInterruptRequestMsg
  extends IControlMessage<'interrupt_request'> {
  content: Record<string, never>;
}

/**
 * A `'interrupt_reply'` message content.
 *
 * See [Messaging in Jupyter](https://jupyter-client.readthedocs.io/en/latest/messaging.html#kernel-interrupt).
 *
 * **See also:** [[IInterruptRequestMsg]], [[IKernel.interrupt]]
 */

export interface IInterruptReply extends IReplyOkContent {}

/**
 * A `'interrupt_reply'` message on the `'control'` channel.
 *
 * See [Messaging in Jupyter](https://jupyter-client.readthedocs.io/en/latest/messaging.html#kernel-interrupt).
 *
 * **See also:** [[IInterruptRequestMsg]], [[IKernel.interrupt]]
 */
export interface IInterruptReplyMsg extends IControlMessage<'interrupt_reply'> {
  parent_header: IHeader<'interrupt_request'>;
  content: ReplyContent<IInterruptReply>;
}

/**
 * A `'history_request'` message.
 *
 * See [Messaging in Jupyter](https://jupyter-client.readthedocs.io/en/latest/messaging.html#history).
 *
 * **See also:** [[IHistoryReplyMsg]], [[[IKernel.history]]]
 */
export interface IHistoryRequestMsg extends IShellMessage<'history_request'> {
  content: IHistoryRequestRange | IHistoryRequestSearch | IHistoryRequestTail;
}

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
 * A `'history_reply'` message content.
 *
 * See [Messaging in Jupyter](https://jupyter-client.readthedocs.io/en/latest/messaging.html#history).
 *
 * **See also:** [[IHistoryRequest]], [[IKernel.history]]
 */
export interface IHistoryReply extends IReplyOkContent {
  history: [number, number, string][] | [number, number, [string, string]][];
}

/**
 * A `'history_reply'` message on the `'shell'` channel.
 *
 * See [Messaging in Jupyter](https://jupyter-client.readthedocs.io/en/latest/messaging.html#history).
 *
 * **See also:** [[IHistoryRequest]], [[IKernel.history]]
 */
export interface IHistoryReplyMsg extends IShellMessage<'history_reply'> {
  parent_header: IHeader<'history_request'>;
  content: ReplyContent<IHistoryReply>;
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
  content: {
    code: string;
  };
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
  content: ReplyContent<IIsCompleteReplyIncomplete | IIsCompleteReplyOther>;
}

/**
 * An 'incomplete' completion reply
 */
export interface IIsCompleteReplyIncomplete {
  status: 'incomplete';
  indent: string;
}

/**
 * A completion reply for completion or invalid states.
 */
export interface IIsCompleteReplyOther {
  status: 'complete' | 'invalid' | 'unknown';
}

/**
 * An `execute_request` message on the `'shell'` channel.
 */
export interface IExecuteRequestMsg extends IShellMessage<'execute_request'> {
  content: {
    /**
     * The code to execute.
     */
    code: string;

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
  };
}

/**
 * The content of an `execute-reply` message.
 *
 * See [Messaging in Jupyter](https://jupyter-client.readthedocs.io/en/latest/messaging.html#execution-results).
 */
export interface IExecuteCount {
  execution_count: nbformat.ExecutionCount;
}

/**
 * A convenience type for a base for an execute reply content.
 */
type IExecuteReplyBase = IExecuteCount & IReplyOkContent;

/**
 * The `'execute_reply'` contents for an `'ok'` status.
 *
 * See [Messaging in Jupyter](https://jupyter-client.readthedocs.io/en/latest/messaging.html#execution-results).
 */
export interface IExecuteReply extends IExecuteReplyBase {
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
 * An `'execute_reply'` message on the `'stream'` channel.
 *
 * See [Messaging in Jupyter](https://jupyter-client.readthedocs.io/en/latest/messaging.html#execution-results).
 *
 * **See also:** [[IExecuteRequest]], [[IKernel.execute]]
 */
export interface IExecuteReplyMsg extends IShellMessage<'execute_reply'> {
  parent_header: IHeader<'execute_request'>;
  content: ReplyContent<IExecuteReply> & IExecuteCount;
}

/**
 * Test whether a kernel message is an `'execute_reply'` message.
 */
export function isExecuteReplyMsg(msg: IMessage): msg is IExecuteReplyMsg {
  return msg.header.msg_type === 'execute_reply';
}

/**
 * A `'comm_info_request'` message on the `'shell'` channel.
 *
 * See [Messaging in Jupyter](https://jupyter-client.readthedocs.io/en/latest/messaging.html#comm-info).
 *
 * **See also:** [[ICommInfoReplyMsg]], [[IKernel.commInfo]]
 */
export interface ICommInfoRequestMsg
  extends IShellMessage<'comm_info_request'> {
  content: {
    /**
     * The comm target name to filter returned comms
     */
    target_name?: string;
  };
}

/**
 * A `'comm_info_reply'` message content.
 *
 * See [Messaging in Jupyter](https://jupyter-client.readthedocs.io/en/latest/messaging.html#comm-info).
 *
 * **See also:** [[ICommInfoRequest]], [[IKernel.commInfo]]
 */
export interface ICommInfoReply extends IReplyOkContent {
  /**
   * Mapping of comm ids to target names.
   */
  comms: { [commId: string]: { target_name: string } };
}

/**
 * A `'comm_info_reply'` message on the `'shell'` channel.
 *
 * See [Messaging in Jupyter](https://jupyter-client.readthedocs.io/en/latest/messaging.html#comm-info).
 *
 * **See also:** [[ICommInfoRequestMsg]], [[IKernel.commInfo]]
 */
export interface ICommInfoReplyMsg extends IShellMessage<'comm_info_reply'> {
  parent_header: IHeader<'comm_info_request'>;
  content: ReplyContent<ICommInfoReply>;
}

// ///////////////////////////////////////////////
// Control Messages
// ///////////////////////////////////////////////

/**
 * An experimental `'debug_request'` message on the `'control'` channel.
 *
 * @hidden
 *
 * #### Notes
 * Debug messages are experimental messages that are not in the official
 * kernel message specification. As such, this function is *NOT* considered
 * part of the public API, and may change without notice.
 */
export interface IDebugRequestMsg extends IControlMessage<'debug_request'> {
  content: {
    seq: number;
    type: 'request';
    command: string;
    arguments?: any;
  };
}

/**
 * Test whether a kernel message is an experimental `'debug_request'` message.
 *
 * @hidden
 *
 * #### Notes
 * Debug messages are experimental messages that are not in the official
 * kernel message specification. As such, this is *NOT* considered
 * part of the public API, and may change without notice.
 */
export function isDebugRequestMsg(msg: IMessage): msg is IDebugRequestMsg {
  return msg.header.msg_type === 'debug_request';
}

/**
 * An experimental `'debug_reply'` message on the `'control'` channel.
 *
 * @hidden
 *
 * #### Notes
 * Debug messages are experimental messages that are not in the official
 * kernel message specification. As such, this is *NOT* considered
 * part of the public API, and may change without notice.
 */
export interface IDebugReplyMsg extends IControlMessage<'debug_reply'> {
  content: {
    seq: number;
    type: 'response';
    request_seq: number;
    success: boolean;
    command: string;
    message?: string;
    body?: any;
  };
}

/**
 * Test whether a kernel message is an experimental `'debug_reply'` message.
 *
 * @hidden
 *
 * #### Notes
 * Debug messages are experimental messages that are not in the official
 * kernel message specification. As such, this is *NOT* considered
 * part of the public API, and may change without notice.
 */
export function isDebugReplyMsg(msg: IMessage): msg is IDebugReplyMsg {
  return msg.header.msg_type === 'debug_reply';
}

/**
 * A `'create_subshell_request'` message on the `'control'` channel.
 */
export interface ICreateSubshellRequestMsg
  extends IControlMessage<'create_subshell_request'> {
  content: Record<string, unknown>;
}

/**
 * A `'create_subshell_reply'` message on the `'control'` channel.
 */
export interface ICreateSubshellReplyMsg
  extends IControlMessage<'create_subshell_reply'> {
  content: {
    subshell_id: string;
  };
}

/**
 * A `'delete_subshell_request'` message on the `'control'` channel.
 */
export interface IDeleteSubshellRequestMsg
  extends IControlMessage<'delete_subshell_request'> {
  content: {
    subshell_id: string;
  };
}

/**
 * A `'delete_subshell_reply'` message on the `'control'` channel.
 */
export interface IDeleteSubshellReplyMsg
  extends IControlMessage<'delete_subshell_reply'> {
  content: Record<string, unknown>;
}

/**
 * A `'list_subshell_request'` message on the `'control'` channel.
 */
export interface IListSubshellRequestMsg
  extends IControlMessage<'list_subshell_request'> {
  content: Record<string, unknown>;
}

/**
 * A `'list_subshell_reply'` message on the `'control'` channel.
 */
export interface IListSubshellReplyMsg
  extends IControlMessage<'list_subshell_reply'> {
  content: {
    subshell_id: string[];
  };
}

// ////////////////////////////////////////////////
// Stdin Messages
// ///////////////////////////////////////////////

/**
 * An `'input_request'` message on the `'stdin'` channel.
 *
 * See [Messaging in Jupyter](https://jupyter-client.readthedocs.io/en/latest/messaging.html#messages-on-the-stdin-router-dealer-sockets).
 */
export interface IInputRequestMsg extends IStdinMessage<'input_request'> {
  content: {
    /**
     * The text to show at the prompt.
     */
    prompt: string;

    /**
     * Whether the request is for a password.
     * If so, the frontend shouldn't echo input.
     */
    password: boolean;
  };
}

/**
 * Test whether a kernel message is an `'input_request'` message.
 */
export function isInputRequestMsg(msg: IMessage): msg is IInputRequestMsg {
  return msg.header.msg_type === 'input_request';
}

/**
 * An `'input_reply'` message content.
 *
 * See [Messaging in Jupyter](https://jupyter-client.readthedocs.io/en/latest/messaging.html#messages-on-the-stdin-router-dealer-sockets).
 */
export interface IInputReply extends IReplyOkContent {
  value: string;
}

/**
 * An `'input_reply'` message on the `'stdin'` channel.
 *
 * See [Messaging in Jupyter](https://jupyter-client.readthedocs.io/en/latest/messaging.html#messages-on-the-stdin-router-dealer-sockets).
 */
export interface IInputReplyMsg extends IStdinMessage<'input_reply'> {
  parent_header: IHeader<'input_request'>;
  content: ReplyContent<IInputReply>;
}

/**
 * Test whether a kernel message is an `'input_reply'` message.
 */
export function isInputReplyMsg(msg: IMessage): msg is IInputReplyMsg {
  return msg.header.msg_type === 'input_reply';
}

// ///////////////////////////////////////////////
// Message (de)serialization
// ///////////////////////////////////////////////

/**
 * The list of supported kernel wire protocols over websocket.
 */
export enum supportedKernelWebSocketProtocols {
  v1KernelWebsocketJupyterOrg = 'v1.kernel.websocket.jupyter.org'
}
