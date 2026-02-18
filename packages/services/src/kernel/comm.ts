// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import type { JSONObject } from '@lumino/coreutils';
import { PromiseDelegate } from '@lumino/coreutils';

import { DisposableDelegate } from '@lumino/disposable';

import type * as Kernel from './kernel';

import * as KernelMessage from './messages';

/**
 * The Comm Over Subshell Enum
 */
export enum CommsOverSubshells {
  Disabled = 'disabled',
  PerComm = 'perComm',
  PerCommTarget = 'perCommTarget'
}

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
    disposeCb: () => void,
    commsOverSubshells?: CommsOverSubshells
  ) {
    super(disposeCb);
    this._id = id;
    this._target = target;
    this._kernel = kernel;

    // Clean subshell ids upon restart
    this._kernel.statusChanged.connect(() => {
      if (this._kernel.status === 'restarting') {
        this._cleanSubshells();
      }
    });

    this.commsOverSubshells =
      commsOverSubshells ?? CommsOverSubshells.PerCommTarget;
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
   * The current subshell id.
   */
  get subshellId(): string | null {
    return this._subshellId;
  }

  /**
   * Promise that resolves when the subshell started, if any
   */
  get subshellStarted(): Promise<void> {
    return this._subshellStarted.promise;
  }

  /**
   * Whether comms are running on a subshell, or not
   */
  get commsOverSubshells(): CommsOverSubshells {
    return this._commsOverSubshells;
  }

  /**
   * Set whether comms are running on subshells, or not
   */
  set commsOverSubshells(value: CommsOverSubshells) {
    if (value === this._commsOverSubshells) {
      // Do nothing if the value is not changing.
      return;
    }
    const closePromise = this._maybeCloseSubshells(this._commsOverSubshells);
    this._commsOverSubshells = value;
    closePromise
      .then(() => {
        if (this._commsOverSubshells !== CommsOverSubshells.Disabled) {
          void this._maybeStartSubshell();
        }
      })
      .catch(console.warn);
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
      subshellId: this._subshellId || this._kernel.subshellId,
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
      subshellId: this._subshellId || this._kernel.subshellId,
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
      subshellId: this._subshellId || this._kernel.subshellId,
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
        subshellId: this._subshellId || this._kernel.subshellId,
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

  dispose(): void {
    void this._maybeCloseSubshells(this._commsOverSubshells);

    super.dispose();
  }

  private _cleanSubshells() {
    const kernelId = this._kernel.id;
    if (CommHandler._commTargetSubShellsId.hasOwnProperty(kernelId)) {
      delete CommHandler._commTargetSubShellsId[kernelId];
    }
  }

  private async _maybeStartSubshell() {
    await this._kernel.info;
    if (!this._kernel.supportsSubshells) {
      return;
    }

    if (this._commsOverSubshells === CommsOverSubshells.PerComm) {
      // Create subshell
      const replyMsg = await this._kernel.requestCreateSubshell({}).done;
      this._subshellId = replyMsg.content.subshell_id;
      this._subshellStarted.resolve();
      return;
    }

    // One shell per comm-target
    const kernelId = this._kernel.id;
    if (!CommHandler._commTargetSubShellsId.hasOwnProperty(kernelId)) {
      CommHandler._commTargetSubShellsId[kernelId] = {};
    }
    const kernelCommTargetSubShells =
      CommHandler._commTargetSubShellsId[kernelId];
    const existingEntry = kernelCommTargetSubShells[this._target];
    if (existingEntry) {
      existingEntry.referenceCount += 1;
      this._subshellId = await existingEntry.subshellId;
      this._subshellStarted.resolve();
      return;
    }

    const entry: Private.ISubshellEntry = {
      subshellId: this._kernel
        .requestCreateSubshell({})
        .done.then(replyMsg => replyMsg.content.subshell_id),
      referenceCount: 1
    };
    kernelCommTargetSubShells[this._target] = entry;
    this._subshellId = await entry.subshellId;
    this._subshellStarted.resolve();
  }

  private async _maybeCloseSubshells(mode: CommsOverSubshells) {
    if (this._kernel.status === 'dead') {
      return;
    }
    switch (mode) {
      case CommsOverSubshells.PerComm: {
        if (this._subshellId) {
          // Close the only subshell
          this._kernel.requestDeleteSubshell(
            { subshell_id: this._subshellId },
            true
          );
          // Clear identifier
          this._subshellId = null;
        }
        // Restart promise delegate to subsequent startup
        this._subshellStarted = new PromiseDelegate<void>();
        break;
      }
      case CommsOverSubshells.PerCommTarget: {
        const kernelId = this._kernel.id;
        const target = this._target;
        if (CommHandler._commTargetSubShellsId.hasOwnProperty(kernelId)) {
          // Close the subshell for this target if this is the last comm.
          const kernelTargets = CommHandler._commTargetSubShellsId[kernelId];
          const entry = kernelTargets[target];
          if (entry) {
            entry.referenceCount -= 1;
            if (entry.referenceCount <= 0) {
              const subshellId = await entry.subshellId;
              if (subshellId) {
                this._kernel.requestDeleteSubshell(
                  { subshell_id: subshellId },
                  true
                );
              }
              delete kernelTargets[target];
            }
          }
          if (Object.keys(kernelTargets).length === 0) {
            delete CommHandler._commTargetSubShellsId[kernelId];
          }
          // Clear identifier
          this._subshellId = null;
        }
        // Restart promise delegate to subsequent startup
        this._subshellStarted = new PromiseDelegate<void>();
        break;
      }
      case CommsOverSubshells.Disabled: {
        // no-op
        break;
      }
    }
  }

  private _subshellStarted = new PromiseDelegate<void>();
  private static _commTargetSubShellsId: {
    // One subshell per kernel per comm target.
    [kernelId: string]: {
      [targetName: string]: Private.ISubshellEntry;
    };
  } = {};

  private _commsOverSubshells: CommsOverSubshells;
  private _subshellId: string | null = null;

  private _target = '';
  private _id = '';
  private _kernel: Kernel.IKernelConnection;
  private _onClose: (
    msg: KernelMessage.ICommCloseMsg<'iopub'>
  ) => void | PromiseLike<void>;
  private _onMsg: (msg: KernelMessage.ICommMsgMsg) => void | PromiseLike<void>;
}

/**
 * Private interfaces of comm handler.
 */
namespace Private {
  /**
   * Describes an entry in the static tracker of subshells used in per-comm-target mode.
   */
  export interface ISubshellEntry {
    /**
     * Promise which resolves with subshell identifier once it is known.
     */
    subshellId: Promise<string>;
    /**
     * Keeps track of the number of references to the subshell.
     *
     * This is used to guard subshells shared across comm targets from premature disposal.
     */
    referenceCount: number;
  }
}
