// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  nbformat, uuid
} from '@jupyterlab/coreutils';

import {
  JSONObject, JSONValue
} from '@phosphor/coreutils';

import {
 Kernel
} from './kernel';


/**
 * A namespace for kernel messages.
 */
export
namespace KernelMessage {
  /**
   * Create a well-formed kernel message.
   */
  export
  function createMessage(options: IOptions, content: JSONObject = {}, metadata: JSONObject = {}, buffers: (ArrayBuffer | ArrayBufferView)[] = []) : IMessage {
    return {
      header: {
        username: options.username || '',
        version: '5.2',
        session: options.session,
        msg_id: options.msgId || uuid(),
        msg_type: options.msgType
      },
      parent_header: { },
      channel: options.channel,
      content,
      metadata,
      buffers
    };
  }

  /**
   * Create a well-formed kernel shell message.
   */
  export
  function createShellMessage(options: IOptions, content: JSONObject = {}, metadata: JSONObject = {}, buffers: (ArrayBuffer | ArrayBufferView)[] = []) : IShellMessage {
    let msg = createMessage(options, content, metadata, buffers);
    return msg as IShellMessage;
  }

  /**
   * Kernel message header content.
   *
   * See [Messaging in Jupyter](https://jupyter-client.readthedocs.io/en/latest/messaging.html#general-message-format).
   *
   * **See also:** [[IMessage]]
   */
  export
  interface IHeader extends JSONObject {
    username: string;
    version: string;
    session: string;
    msg_id: string;
    msg_type: string;
  }

  /**
   * Kernel message specification.
   *
   * See [Messaging in Jupyter](https://jupyter-client.readthedocs.io/en/latest/messaging.html#general-message-format).
   */
  export
  interface IMessage {
    header: IHeader;
    parent_header: IHeader | {};
    metadata: JSONObject;
    content: JSONObject;
    channel: Channel;
    buffers?: (ArrayBuffer | ArrayBufferView)[];
  }

  /**
   * The valid channel names.
   */
  export
  type Channel = 'shell' | 'iopub' | 'stdin';

  /**
   * A kernel message on the `'shell'` channel.
   */
  export
  interface IShellMessage extends IMessage {
    channel: 'shell';
  }

  /**
   * A kernel message on the `'iopub'` channel.
   */
  export
  interface IIOPubMessage extends IMessage {
    channel: 'iopub';
  }

  /**
   * A kernel message on the `'stdin'` channel.
   */
  export
  interface IStdinMessage extends IMessage {
    channel: 'stdin';
  }

  /**
   * A `'stream'` message on the `'iopub'` channel.
   *
   * See [Streams](https://jupyter-client.readthedocs.io/en/latest/messaging.html#streams-stdout-stderr-etc).
   */
  export
  interface IStreamMsg extends IIOPubMessage {
    content: {
      name: 'stdout' | 'stderr';
      text: string;
    };
  }

  /**
   * Test whether a kernel message is a `'stream'` message.
   */
  export
  function isStreamMsg(msg: IMessage): msg is IStreamMsg {
    return msg.header.msg_type === 'stream';
  }

  /**
   * A `'display_data'` message on the `'iopub'` channel.
   *
   * See [Display data](https://jupyter-client.readthedocs.io/en/latest/messaging.html#display-data).
   */
  export
  interface IDisplayDataMsg extends IIOPubMessage {
    content: {
      data: nbformat.IMimeBundle,
      metadata: nbformat.OutputMetadata;
      transient?: {display_id?: string};
    };
  }

  /**
   * Test whether a kernel message is an `'display_data'` message.
   */
  export
  function isDisplayDataMsg(msg: IMessage): msg is IDisplayDataMsg {
    return msg.header.msg_type === 'display_data';
  }

  /**
   * An `'update_display_data'` message on the `'iopub'` channel.
   *
   * See [Update Display data](https://jupyter-client.readthedocs.io/en/latest/messaging.html#update-display-data).
   */
  export
  interface IUpdateDisplayDataMsg extends IDisplayDataMsg {
    content: IDisplayDataMsg['content'] & {
      transient: {display_id: string};
    };
  }

  /**
   * Test whether a kernel message is an `'update_display_data'` message.
   */
  export
  function isUpdateDisplayDataMsg(msg: IMessage): msg is IUpdateDisplayDataMsg {
    return msg.header.msg_type === 'update_display_data';
  }

  /**
   * An `'execute_input'` message on the `'iopub'` channel.
   *
   * See [Code inputs](https://jupyter-client.readthedocs.io/en/latest/messaging.html#code-inputs).
   */
  export
  interface IExecuteInputMsg extends IIOPubMessage {
    content: {
      code: string;
      execution_count: nbformat.ExecutionCount;
    };
  }

  /**
   * Test whether a kernel message is an `'execute_input'` message.
   */
  export
  function isExecuteInputMsg(msg: IMessage): msg is IExecuteInputMsg {
    return msg.header.msg_type === 'execute_input';
  }

  /**
   * An `'execute_result'` message on the `'iopub'` channel.
   *
   * See [Execution results](https://jupyter-client.readthedocs.io/en/latest/messaging.html#id4).
   */
  export
  interface IExecuteResultMsg extends IIOPubMessage {
    content: {
      execution_count: nbformat.ExecutionCount;
      data: nbformat.IMimeBundle,
      metadata: nbformat.OutputMetadata;
    };
  }

  /**
   * Test whether a kernel message is an `'execute_result'` message.
   */
  export
  function isExecuteResultMsg(msg: IMessage): msg is IExecuteResultMsg {
    return msg.header.msg_type === 'execute_result';
  }

  /**
   * A `'error'` message on the `'iopub'` channel.
   *
   * See [Execution errors](https://jupyter-client.readthedocs.io/en/latest/messaging.html#execution-errors).
   */
  export
  interface IErrorMsg extends IIOPubMessage {
    content: {
      ename: string;
      evalue: string;
      traceback: string[];
    };
  }

  /**
   * Test whether a kernel message is an `'error'` message.
   */
  export
  function isErrorMsg(msg: IMessage): msg is IErrorMsg {
    return msg.header.msg_type === 'error';
  }

  /**
   * A `'status'` message on the `'iopub'` channel.
   *
   * See [Kernel status](https://jupyter-client.readthedocs.io/en/latest/messaging.html#kernel-status).
   */
  export
  interface IStatusMsg extends IIOPubMessage {
    content: {
      execution_state: Kernel.Status;
    };
  }

  /**
   * Test whether a kernel message is a `'status'` message.
   */
  export
  function isStatusMsg(msg: IMessage): msg is IStatusMsg {
    return msg.header.msg_type === 'status';
  }

  /**
   * A `'clear_output'` message on the `'iopub'` channel.
   *
   * See [Clear output](https://jupyter-client.readthedocs.io/en/latest/messaging.html#clear-output).
   */
  export
  interface IClearOutputMsg extends IIOPubMessage {
    content: {
      wait: boolean;
    };
  }

  /**
   * Test whether a kernel message is a `'clear_output'` message.
   */
  export
  function isClearOutputMsg(msg: IMessage): msg is IClearOutputMsg {
    return msg.header.msg_type === 'clear_output';
  }

  /**
   * A `'comm_open'` message on the `'iopub'` channel.
   *
   * See [Comm open](https://jupyter-client.readthedocs.io/en/latest/messaging.html#opening-a-comm).
   */
  export
  interface ICommOpenMsg extends IIOPubMessage {
    content: ICommOpen;
  }

  /**
   * The content of a `'comm_open'` message.  The message can
   * be received on the `'iopub'` channel or send on the `'shell'` channel.
   *
   * See [Comm open](https://jupyter-client.readthedocs.io/en/latest/messaging.html#opening-a-comm).
   */
  export
  interface ICommOpen extends JSONObject {
    comm_id: string;
    target_name: string;
    data: JSONValue;
    target_module?: string;
  }

  /**
   * Test whether a kernel message is a `'comm_open'` message.
   */
  export
  function isCommOpenMsg(msg: IMessage): msg is ICommOpenMsg {
    return msg.header.msg_type === 'comm_open';
  }

  /**
   * A `'comm_close'` message on the `'iopub'` channel.
   *
   * See [Comm close](https://jupyter-client.readthedocs.io/en/latest/messaging.html#opening-a-comm).
   */
  export
  interface ICommCloseMsg extends IIOPubMessage {
    content: ICommClose;
  }

  /**
   * The content of a `'comm_close'` method.  The message can
   * be received on the `'iopub'` channel or send on the `'shell'` channel.
   *
   * See [Comm close](https://jupyter-client.readthedocs.io/en/latest/messaging.html#opening-a-comm).
   */
  export
  interface ICommClose extends JSONObject {
    comm_id: string;
    data: JSONValue;
  }

  /**
   * Test whether a kernel message is a `'comm_close'` message.
   */
  export
  function isCommCloseMsg(msg: IMessage): msg is ICommCloseMsg {
    return msg.header.msg_type === 'comm_close';
  }

  /**
   * A `'comm_msg'` message on the `'iopub'` channel.
   *
   * See [Comm msg](https://jupyter-client.readthedocs.io/en/latest/messaging.html#opening-a-comm).
   */
  export
  interface ICommMsgMsg extends IIOPubMessage {
    content: ICommMsg;
  }

  /**
   * The content of a `'comm_msg'` message.  The message can
   * be received on the `'iopub'` channel or send on the `'shell'` channel.
   *
   * See [Comm msg](https://jupyter-client.readthedocs.io/en/latest/messaging.html#opening-a-comm).
   */
  export
  interface ICommMsg extends JSONObject {
    comm_id: string;
    data: JSONValue;
  }

  /**
   * Test whether a kernel message is a `'comm_msg'` message.
   */
  export
  function isCommMsgMsg(msg: IMessage): msg is ICommMsgMsg {
    return msg.header.msg_type === 'comm_msg';
  }

  /**
   * A `'kernel_info_reply'` message on the `'stream'` channel.
   *
   * See [Messaging in Jupyter](https://jupyter-client.readthedocs.io/en/latest/messaging.html#kernel-info).
   */
  export
  interface IInfoReplyMsg extends IShellMessage {
    content: IInfoReply;
  }

  /**
   * The kernel info content.
   *
   * See [Messaging in Jupyter](https://jupyter-client.readthedocs.io/en/latest/messaging.html#kernel-info).
   */
  export
  interface IInfoReply extends JSONObject {
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
  export
  interface ILanguageInfo extends nbformat.ILanguageInfoMetadata {
    version: string;
    nbconverter_exporter?: string;
  }

  /**
   * The content of a  `'complete_request'` message.
   *
   * See [Messaging in Jupyter](https://jupyter-client.readthedocs.io/en/latest/messaging.html#completion).
   *
   * **See also:** [[ICompleteReply]], [[IKernel.complete]]
   */
  export
  interface ICompleteRequest extends JSONObject {
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
  export
  interface ICompleteReplyMsg extends IShellMessage {
    content: {
      matches: string[];
      cursor_start: number;
      cursor_end: number;
      metadata: JSONObject;
      status: 'ok' | 'error';
    };
  }

  /**
   * The content of an `'inspect_request'` message.
   *
   * See [Messaging in Jupyter](https://jupyter-client.readthedocs.io/en/latest/messaging.html#introspection).
   *
   * **See also:** [[IInspectReply]], [[[IKernel.inspect]]]
   */
  export
  interface IInspectRequest extends JSONObject {
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
  export
  interface IInspectReplyMsg extends IShellMessage {
    content: {
      status: 'ok' | 'error';
      found: boolean;
      data: JSONObject;
      metadata: JSONObject;
    };
  }

  /**
   * The content of a `'history_request'` message.
   *
   * See [Messaging in Jupyter](https://jupyter-client.readthedocs.io/en/latest/messaging.html#history).
   *
   * **See also:** [[IHistoryReply]], [[[IKernel.history]]]
   */
  export
  interface IHistoryRequest extends JSONObject {
    output: boolean;
    raw: boolean;
    hist_access_type: HistAccess;
    session?: number;
    start?: number;
    stop?: number;
    n?: number;
    pattern?: string;
    unique?: boolean;
  }

  /**
   * A `'history_reply'` message on the `'stream'` channel.
   *
   * See [Messaging in Jupyter](https://jupyter-client.readthedocs.io/en/latest/messaging.html#history).
   *
   * **See also:** [[IHistoryRequest]], [[IKernel.history]]
   */
  export
  interface IHistoryReplyMsg extends IShellMessage {
    content: {
      history: JSONValue[];
    };
  }

  /**
   * The history access settings.
   */
  export
  type HistAccess = 'range' | 'tail' | 'search';

  /**
   * The content of an `'is_complete_request'` message.
   *
   * See [Messaging in Jupyter](https://jupyter-client.readthedocs.io/en/latest/messaging.html#code-completeness).
   *
   * **See also:** [[IIsCompleteReply]], [[IKernel.isComplete]]
   */
  export
  interface IIsCompleteRequest extends JSONObject {
    code: string;
  }

  /**
   * An `'is_complete_reply'` message on the `'stream'` channel.
   *
   * See [Messaging in Jupyter](https://jupyter-client.readthedocs.io/en/latest/messaging.html#code-completeness).
   *
   * **See also:** [[IIsCompleteRequest]], [[IKernel.isComplete]]
   */
  export
  interface IIsCompleteReplyMsg extends IShellMessage {
    content: {
      status: string;
      indent: string;
    };
  }

  /**
   * The content of an `'execute_request'` message.
   *
   * See [Messaging in Jupyter](https://jupyter-client.readthedocs.io/en/latest/messaging.html#execute).
   *
   * **See also:** [[IExecuteReply]], [[IKernel.execute]]
   */
  export
  interface IExecuteRequest extends IExecuteOptions {
    code: string;
  }

  /**
   * The options used to configure an execute request.
   *
   * See [Messaging in Jupyter](https://jupyter-client.readthedocs.io/en/latest/messaging.html#execute).
   */
  export
  interface IExecuteOptions extends JSONObject {
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
  export
  interface IExecuteReplyMsg extends IShellMessage {
    content: IExecuteReply;
  }

  /**
   * The content of an `execute-reply` message.
   *
   * See [Messaging in Jupyter](https://jupyter-client.readthedocs.io/en/latest/messaging.html#execution-results).
   */
  export
  interface IExecuteReply extends JSONObject {
    status: 'ok' | 'error' | 'abort';
    execution_count: nbformat.ExecutionCount;
  }

  /**
   * The `'execute_reply'` contents for an `'ok'` status.
   *
   * See [Messaging in Jupyter](https://jupyter-client.readthedocs.io/en/latest/messaging.html#execution-results).
   */
  export
  interface IExecuteOkReply extends IExecuteReply {
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
  export
  interface IExecuteErrorReply extends IExecuteReply {
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
  export
  function isExecuteReplyMsg(msg: IMessage): msg is IExecuteReplyMsg {
    return msg.header.msg_type === 'execute_reply';
  }

  /**
   * An `'input_request'` message on the `'stdin'` channel.
   *
   * See [Messaging in Jupyter](https://jupyter-client.readthedocs.io/en/latest/messaging.html#messages-on-the-stdin-router-dealer-sockets).
   */
  export
  interface IInputRequestMsg extends IStdinMessage {
    content: IInputRequest;
  }

  /**
   * The content of an `'input_request'` message.
   */
  export
  interface IInputRequest extends JSONObject {
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
  export
  function isInputRequestMsg(msg: IMessage): msg is IInputRequestMsg {
    return msg.header.msg_type === 'input_request';
  }

  /**
   * The content of an `'input_reply'` message.
   *
   * See [Messaging in Jupyter](https://jupyter-client.readthedocs.io/en/latest/messaging.html#messages-on-the-stdin-router-dealer-sockets).
   *
   * **See also:** [[IKernel.input_reply]]
   */
  export
  interface IInputReply extends JSONObject {
    value: string;
  }

  /**
   * The content of a `'comm_info_request'` message.
   *
   * See [Messaging in Jupyter](https://jupyter-client.readthedocs.io/en/latest/messaging.html#comm-info).
   *
   * **See also:** [[ICommInfoReply]], [[IKernel.commInfo]]
   */
  export
  interface ICommInfoRequest extends JSONObject {
    target?: string;
  }

  /**
   * A `'comm_info_reply'` message on the `'stream'` channel.
   *
   * See [Messaging in Jupyter](https://jupyter-client.readthedocs.io/en/latest/messaging.html#comm-info).
   *
   * **See also:** [[ICommInfoRequest]], [[IKernel.commInfo]]
   */
  export
  interface ICommInfoReplyMsg extends IShellMessage {
    content: {
      /**
       * Mapping of comm ids to target names.
       */
      comms: { [commId: string]: { 'target_name': string } };
    };
  }


  /**
   * Options for an `IMessage`.
   *
   * **See also:** [[IMessage]]
   */
  export
  interface IOptions {
    msgType: string;
    channel: Channel;
    session: string;
    username?: string;
    msgId?: string;
  }
}
