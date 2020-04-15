// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { JSONObject } from '@lumino/coreutils';

import { DisposableDelegate } from '@lumino/disposable';

import * as Kernel from './kernel';

import * as KernelMessage from './messages';

/**
 * Comm channel handler.
 */
export class CommHandler extends DisposableDelegate implements Kernel.IComm {
  /**
   * Construct a new comm channel.
   */
  constructor(
    target: string,
    id: string,
    kernel: Kernel.IKernelConnection,
    disposeCb: () => void
  ) {
    super(disposeCb);
    this._id = id;
    this._target = target;
    this._kernel = kernel;
  }

  /**
   * The unique id for the comm channel.
   */
  get commId(): string {
    return this._id;
  }

  /**
   * The target name for the comm channel.
   */
  get targetName(): string {
    return this._target;
  }

  /**
   * Get the callback for a comm close event.
   *
   * #### Notes
   * This is called when the comm is closed from either the server or client.
   *
   * **See also:** [[ICommClose]], [[close]]
   */
  get onClose(): (
    msg: KernelMessage.ICommCloseMsg
  ) => void | PromiseLike<void> {
    return this._onClose;
  }

  /**
   * Set the callback for a comm close event.
   *
   * #### Notes
   * This is called when the comm is closed from either the server or client. If
   * the function returns a promise, and the kernel was closed from the server,
   * kernel message processing will pause until the returned promise is
   * fulfilled.
   *
   * **See also:** [[close]]
   */
  set onClose(
    cb: (msg: KernelMessage.ICommCloseMsg) => void | PromiseLike<void>
  ) {
    this._onClose = cb;
  }

  /**
   * Get the callback for a comm message received event.
   */
  get onMsg(): (msg: KernelMessage.ICommMsgMsg) => void | PromiseLike<void> {
    return this._onMsg;
  }

  /**
   * Set the callback for a comm message received event.
   *
   * #### Notes
   * This is called when a comm message is received. If the function returns a
   * promise, kernel message processing will pause until it is fulfilled.
   */
  set onMsg(cb: (msg: KernelMessage.ICommMsgMsg) => void | PromiseLike<void>) {
    this._onMsg = cb;
  }

  /**
   * Open a comm with optional data and metadata.
   *
   * #### Notes
   * This sends a `comm_open` message to the server.
   *
   * **See also:** [[ICommOpen]]
   */
  open(
    data?: JSONObject,
    metadata?: JSONObject,
    buffers: (ArrayBuffer | ArrayBufferView)[] = []
  ): Kernel.IShellFuture {
    if (this.isDisposed || this._kernel.isDisposed) {
      throw new Error('Cannot open');
    }
    const msg = KernelMessage.createMessage({
      msgType: 'comm_open',
      channel: 'shell',
      username: this._kernel.username,
      session: this._kernel.clientId,
      content: {
        comm_id: this._id,
        target_name: this._target,
        data: data ?? {}
      },
      metadata,
      buffers
    });
    return this._kernel.sendShellMessage(msg, false, true);
  }

  /**
   * Send a `comm_msg` message to the kernel.
   *
   * #### Notes
   * This is a no-op if the comm has been closed.
   *
   * **See also:** [[ICommMsg]]
   */
  send(
    data: JSONObject,
    metadata?: JSONObject,
    buffers: (ArrayBuffer | ArrayBufferView)[] = [],
    disposeOnDone: boolean = true
  ): Kernel.IShellFuture {
    if (this.isDisposed || this._kernel.isDisposed) {
      throw new Error('Cannot send');
    }
    const msg = KernelMessage.createMessage({
      msgType: 'comm_msg',
      channel: 'shell',
      username: this._kernel.username,
      session: this._kernel.clientId,
      content: {
        comm_id: this._id,
        data: data
      },
      metadata,
      buffers
    });
    return this._kernel.sendShellMessage(msg, false, disposeOnDone);
  }

  /**
   * Close the comm.
   *
   * #### Notes
   * This will send a `comm_close` message to the kernel, and call the
   * `onClose` callback if set.
   *
   * This is a no-op if the comm is already closed.
   *
   * **See also:** [[ICommClose]], [[onClose]]
   */
  close(
    data?: JSONObject,
    metadata?: JSONObject,
    buffers: (ArrayBuffer | ArrayBufferView)[] = []
  ): Kernel.IShellFuture {
    if (this.isDisposed || this._kernel.isDisposed) {
      throw new Error('Cannot close');
    }
    const msg = KernelMessage.createMessage({
      msgType: 'comm_close',
      channel: 'shell',
      username: this._kernel.username,
      session: this._kernel.clientId,
      content: {
        comm_id: this._id,
        data: data ?? {}
      },
      metadata,
      buffers
    });
    const future = this._kernel.sendShellMessage(msg, false, true);
    const onClose = this._onClose;
    if (onClose) {
      const ioMsg = KernelMessage.createMessage({
        msgType: 'comm_close',
        channel: 'iopub',
        username: this._kernel.username,
        session: this._kernel.clientId,
        content: {
          comm_id: this._id,
          data: data ?? {}
        },
        metadata,
        buffers
      });
      // In the future, we may want to communicate back to the user the possible
      // promise returned from onClose.
      void onClose(ioMsg);
    }
    this.dispose();
    return future;
  }

  private _target = '';
  private _id = '';
  private _kernel: Kernel.IKernelConnection;
  private _onClose: (
    msg: KernelMessage.ICommCloseMsg<'iopub'>
  ) => void | PromiseLike<void>;
  private _onMsg: (msg: KernelMessage.ICommMsgMsg) => void | PromiseLike<void>;
}
