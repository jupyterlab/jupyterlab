// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { JSONObject, JSONValue } from '@lumino/coreutils';

import { IDisposable, IObservableDisposable } from '@lumino/disposable';

import { ISignal } from '@lumino/signaling';

import { CommsOverSubshells, ServerConnection } from '..';

import * as KernelMessage from './messages';

import { IManager as IBaseManager } from '../basemanager';

import { KernelSpec } from '../kernelspec';

import { IKernelSpecAPIClient } from '../kernelspec/kernelspec';

import { IKernelOptions, IModel } from './restapi';

export { Status } from './messages';
export { IKernelOptions, IModel };

/**
 * Interface of a Kernel connection that is managed by a session.
 *
 * #### Notes
 * The Kernel object is tied to the lifetime of the Kernel id, which is a
 * unique id for the Kernel session on the server.  The Kernel object manages
 * a websocket connection internally, and will auto-restart if the websocket
 * temporarily loses connection.  Restarting creates a new Kernel process on
 * the server, but preserves the Kernel id.
 *
 * The IKernelConnection is notably missing the full IKernel signals. This
 * interface is for situations where a kernel may change, but we want a user
 * to not have to worry about disconnecting and reconnecting signals when a
 * kernel is swapped. The object that maintains an IKernel, but only provides
 * a user with an IKernelConnection should proxy the appropriate IKernel
 * signals for the user with its own signals. The advantage is that when the
 * kernel is changed, the object itself can take care of disconnecting and
 * reconnecting listeners.
 */
export interface IKernelConnection extends IObservableDisposable {
  /**
   * The id of the server-side kernel.
   */
  readonly id: string;

  /**
   * The name of the server-side kernel.
   */
  readonly name: string;

  /**
   * The kernel model, for convenience.
   */
  readonly model: IModel;

  /**
   * The client username.
   */
  readonly username: string;

  /**
   * The client unique id.
   *
   * #### Notes
   * This should be unique for a particular kernel connection object.
   */
  readonly clientId: string;

  /**
   * The current status of the kernel.
   */
  readonly status: KernelMessage.Status;

  /**
   * The current connection status of the kernel.
   */
  readonly connectionStatus: ConnectionStatus;

  /**
   * The kernel info
   *
   * #### Notes
   * This promise only resolves at startup, and is not refreshed on every
   * restart.
   */
  readonly info: Promise<KernelMessage.IInfoReply>;

  /**
   * Get the kernel spec with validation for launcher display.
   * Filters out invalid specs (empty resources, missing logo).
   *
   * @returns A promise that resolves with validated kernel spec or undefined
   * if invalid (empty resources/missing logo). Fixes #18185 ghost kernels.
   *
   * #### Notes
   * This may make a server request to retrieve the spec.
   */
  readonly spec: Promise<KernelSpec.ISpecModel | undefined>;

  /**
   * Whether the kernel connection handles comm messages.
   *
   * #### Notes
   * The comm message protocol currently has implicit assumptions that only
   * one kernel connection is handling comm messages. This option allows a
   * kernel connection to opt out of handling comms.
   *
   * See [https://github.com/jupyter/jupyter_client/issues/263](https://github.com/jupyter/jupyter_client/issues/263)
   */
  handleComms: boolean;

  /**
   * Whether comm messages should be sent to kernel subshells, if the
   * kernel supports it.
   *
   * #### Notes
   * Sending comm messages over subshells allows processing comms whilst
   * processing execute-request on the "main shell". This prevents blocking
   * comm processing.
   * Options are:
   * - disabled: not using subshells
   * - one subshell per comm-target (default)
   * - one subshell per comm (can lead to issues if creating many comms)
   */
  commsOverSubshells?: CommsOverSubshells;

  /**
   * Whether the kernel connection has pending input.
   *
   * #### Notes
   * This is a guard to avoid deadlock is the user asks input
   * as second time before submitting his first input
   */
  hasPendingInput: boolean;

  /**
   * Send a shell message to the kernel.
   *
   * @param msg - The fully-formed shell message to send.
   *
   * @param expectReply - Whether to expect a shell reply message.
   *
   * @param disposeOnDone - Whether to dispose of the future when done.
   *
   * #### Notes
   * Send a message to the kernel's shell channel, yielding a future object
   * for accepting replies.
   *
   * If `expectReply` is given and `true`, the future is done when both a
   * shell reply and an idle status message are received with the appropriate
   * parent header, in which case the `.done` promise resolves to the reply.
   * If `expectReply` is not given or is `false`, the future is done when an
   * idle status message with the appropriate parent header is received, in
   * which case the `.done` promise resolves to `undefined`.
   *
   * If `disposeOnDone` is given and `false`, the future will not be disposed
   * of when the future is done, instead relying on the caller to dispose of
   * it. This allows for the handling of out-of-order output from ill-behaved
   * kernels.
   *
   * All replies are validated as valid kernel messages.
   *
   * If the kernel status is `'dead'`, this will throw an error.
   */
  sendShellMessage<T extends KernelMessage.ShellMessageType>(
    msg: KernelMessage.IShellMessage<T>,
    expectReply?: boolean,
    disposeOnDone?: boolean
  ): IShellFuture<KernelMessage.IShellMessage<T>>;

  sendControlMessage<T extends KernelMessage.ControlMessageType>(
    msg: KernelMessage.IControlMessage<T>,
    expectReply?: boolean,
    disposeOnDone?: boolean
  ): IControlFuture<KernelMessage.IControlMessage<T>>;

  /**
   * Reconnect to a disconnected kernel.
   *
   * @returns A promise that resolves when the kernel has reconnected.
   *
   * #### Notes
   * This just refreshes the connection to an existing kernel, and does not
   * perform an HTTP request to the server or restart the kernel.
   */
  reconnect(): Promise<void>;

  /**
   * Interrupt a kernel.
   *
   * @returns A promise that resolves when the kernel has interrupted.
   *
   * #### Notes
   * Uses the [Jupyter Server API](https://petstore.swagger.io/?url=https://raw.githubusercontent.com/jupyter-server/jupyter_server/main/jupyter_server/services/api/api.yaml#!/kernels).
   *
   * The promise is fulfilled on a valid response and rejected otherwise.
   *
   * It is assumed that the API call does not mutate the kernel id or name.
   *
   * The promise will be rejected if the kernel status is `'dead'` or if the
   * request fails or the response is invalid.
   */
  interrupt(): Promise<void>;

  /**
   * Restart a kernel.
   *
   * @returns A promise that resolves when the kernel has restarted.
   *
   * #### Notes
   * Uses the [Jupyter Server API](https://petstore.swagger.io/?url=https://raw.githubusercontent.com/jupyter-server/jupyter_server/main/jupyter_server/services/api/api.yaml#!/kernels) and validates the response model.
   *
   * Any existing Future or Comm objects are cleared.
   *
   * It is assumed that the API call does not mutate the kernel id or name.
   *
   * The promise will be rejected if the kernel status is `'dead'` or if the
   * request fails or the response is invalid.
   */
  restart(): Promise<void>;

  /**
   * Send a `kernel_info_request` message.
   *
   * @returns A promise that resolves with the response message.
   *
   * #### Notes
   * See [Messaging in Jupyter](https://jupyter-client.readthedocs.io/en/latest/messaging.html#kernel-info).
   *
   * Fulfills with the `kernel_info_response` content when the shell reply is
   * received and validated.
   */
  requestKernelInfo(): Promise<KernelMessage.IInfoReplyMsg | undefined>;

  /**
   * Send a `complete_request` message.
   *
   * @param content - The content of the request.
   *
   * @returns A promise that resolves with the response message.
   *
   * #### Notes
   * See [Messaging in Jupyter](https://jupyter-client.readthedocs.io/en/latest/messaging.html#completion).
   *
   * Fulfills with the `complete_reply` content when the shell reply is
   * received and validated.
   */
  requestComplete(
    content: KernelMessage.ICompleteRequestMsg['content']
  ): Promise<KernelMessage.ICompleteReplyMsg>;

  /**
   * Send an `inspect_request` message.
   *
   * @param content - The content of the request.
   *
   * @returns A promise that resolves with the response message.
   *
   * #### Notes
   * See [Messaging in Jupyter](https://jupyter-client.readthedocs.io/en/latest/messaging.html#introspection).
   *
   * Fulfills with the `inspect_reply` content when the shell reply is
   * received and validated.
   */
  requestInspect(
    content: KernelMessage.IInspectRequestMsg['content']
  ): Promise<KernelMessage.IInspectReplyMsg>;

  /**
   * Send a `history_request` message.
   *
   * @param content - The content of the request.
   *
   * @returns A promise that resolves with the response message.
   *
   * #### Notes
   * See [Messaging in Jupyter](https://jupyter-client.readthedocs.io/en/latest/messaging.html#history).
   *
   * Fulfills with the `history_reply` content when the shell reply is
   * received and validated.
