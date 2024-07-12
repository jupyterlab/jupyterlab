// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { PromiseDelegate } from '@lumino/coreutils';
import { DisposableDelegate } from '@lumino/disposable';
import * as Kernel from './kernel';
import * as KernelMessage from './messages';

declare let setImmediate: any;

/**
 * Implementation of a kernel future.
 *
 * If a reply is expected, the Future is considered done when both a `reply`
 * message and an `idle` iopub status message have been received.  Otherwise, it
 * is considered done when the `idle` status is received.
 *
 */
export abstract class KernelFutureHandler<
    REQUEST extends KernelMessage.IShellControlMessage,
    REPLY extends KernelMessage.IShellControlMessage
  >
  extends DisposableDelegate
  implements Kernel.IFuture<REQUEST, REPLY>
{
  /**
   * Construct a new KernelFutureHandler.
   */
  constructor(
    cb: () => void,
    msg: REQUEST,
    expectReply: boolean,
    disposeOnDone: boolean,
    kernel: Kernel.IKernelConnection
  ) {
    super(cb);
    this._msg = msg;
    if (!expectReply) {
      this._setFlag(Private.KernelFutureFlag.GotReply);
    }
    this._disposeOnDone = disposeOnDone;
    this._kernel = kernel;
  }

  /**
   * Get the original outgoing message.
   */
  get msg(): REQUEST {
    return this._msg;
  }

  /**
   * A promise that resolves when the future is done.
   */
  get done(): Promise<REPLY> {
    return this._done.promise;
  }

  /**
   * Get the reply handler.
   */
  get onReply(): (msg: REPLY) => void | PromiseLike<void> {
    return this._reply;
  }

  /**
   * Set the reply handler.
   */
  set onReply(cb: (msg: REPLY) => void | PromiseLike<void>) {
    this._reply = cb;
  }

  /**
   * Get the iopub handler.
   */
  get onIOPub(): (
    msg: KernelMessage.IIOPubMessage
  ) => void | PromiseLike<void> {
    return this._iopub;
  }

  /**
   * Set the iopub handler.
   */
  set onIOPub(
    cb: (msg: KernelMessage.IIOPubMessage) => void | PromiseLike<void>
  ) {
    this._iopub = cb;
  }

  /**
   * Get the stdin handler.
   */
  get onStdin(): (
    msg: KernelMessage.IStdinMessage
  ) => void | PromiseLike<void> {
    return this._stdin;
  }

  /**
   * Set the stdin handler.
   */
  set onStdin(
    cb: (msg: KernelMessage.IStdinMessage) => void | PromiseLike<void>
  ) {
    this._stdin = cb;
  }

  /**
   * Register hook for IOPub messages.
   *
   * @param hook - The callback invoked for an IOPub message.
   *
   * #### Notes
   * The IOPub hook system allows you to preempt the handlers for IOPub
   * messages handled by the future.
   *
   * The most recently registered hook is run first. A hook can return a
   * boolean or a promise to a boolean, in which case all kernel message
   * processing pauses until the promise is fulfilled. If a hook return value
   * resolves to false, any later hooks will not run and the function will
   * return a promise resolving to false. If a hook throws an error, the error
   * is logged to the console and the next hook is run. If a hook is
   * registered during the hook processing, it will not run until the next
   * message. If a hook is removed during the hook processing, it will be
   * deactivated immediately.
   */
  registerMessageHook(
    hook: (msg: KernelMessage.IIOPubMessage) => boolean | PromiseLike<boolean>
  ): void {
    if (this.isDisposed) {
      throw new Error('Kernel future is disposed');
    }
    this._hooks.add(hook);
  }

  /**
   * Remove a hook for IOPub messages.
   *
   * @param hook - The hook to remove.
   *
   * #### Notes
   * If a hook is removed during the hook processing, it will be deactivated immediately.
   */
  removeMessageHook(
    hook: (msg: KernelMessage.IIOPubMessage) => boolean | PromiseLike<boolean>
  ): void {
    if (this.isDisposed) {
      return;
    }
    this._hooks.remove(hook);
  }

  /**
   * Send an `input_reply` message.
   */
  sendInputReply(
    content: KernelMessage.IInputReplyMsg['content'],
    parent_header: KernelMessage.IInputReplyMsg['parent_header']
  ): void {
    this._kernel.sendInputReply(content, parent_header);
  }

  /**
   * Dispose and unregister the future.
   */
  dispose(): void {
    this._stdin = Private.noOp;
    this._iopub = Private.noOp;
    this._reply = Private.noOp;
    this._hooks = null!;
    if (!this._testFlag(Private.KernelFutureFlag.IsDone)) {
      // TODO: Uncomment the following logging code, and check for any tests that trigger it.
      // let status = [];
      // if (!this._testFlag(Private.KernelFutureFlag.GotIdle)) {
      //   status.push('idle');
      // }
      // if (!this._testFlag(Private.KernelFutureFlag.GotReply)) {
      //   status.push('reply');
      // }
      // console.warn(
      //   `*************** DISPOSED BEFORE DONE: K${this._kernel.id.slice(
      //     0,
      //     6
      //   )} M${this._msg.header.msg_id.slice(0, 6)} missing ${status.join(' ')}`
      // );

      // Reject the `done` promise, but catch its error here in case no one else
      // is waiting for the promise to resolve. This prevents the error from
      // being displayed in the console, but does not prevent it from being
      // caught by a client who is waiting for it.
      // Note: any `.then` and `.finally` attached to the `done` promise
      // will cause the error to be thrown as uncaught anyways.
      this._done.promise.catch(() => {
        /* no-op */
      });
      this._done.reject(
        new Error(
          `Canceled future for ${this.msg.header.msg_type} message before replies were done`
        )
      );
    }
    super.dispose();
  }

  /**
   * Handle an incoming kernel message.
   */
  async handleMsg(msg: KernelMessage.IMessage): Promise<void> {
    switch (msg.channel) {
      case 'control':
      case 'shell':
        if (
          msg.channel === this.msg.channel &&
          (
            msg.parent_header as KernelMessage.IHeader<KernelMessage.MessageType>
          ).msg_id === this.msg.header.msg_id
        ) {
          await this._handleReply(msg as REPLY);
        }
        break;
      case 'stdin':
        await this._handleStdin(msg as KernelMessage.IStdinMessage);
        break;
      case 'iopub':
        await this._handleIOPub(msg as KernelMessage.IIOPubMessage);
        break;
      default:
        break;
    }
  }

  private async _handleReply(msg: REPLY): Promise<void> {
    const reply = this._reply;
    if (reply) {
      // tslint:disable-next-line:await-promise
      await reply(msg);
    }
    this._replyMsg = msg;
    this._setFlag(Private.KernelFutureFlag.GotReply);
    if (this._testFlag(Private.KernelFutureFlag.GotIdle)) {
      this._handleDone();
    }
  }

  private async _handleStdin(msg: KernelMessage.IStdinMessage): Promise<void> {
    this._kernel.hasPendingInput = true;
    const stdin = this._stdin;
    if (stdin) {
      // tslint:disable-next-line:await-promise
      await stdin(msg);
    }
  }

  private async _handleIOPub(msg: KernelMessage.IIOPubMessage): Promise<void> {
    const process = await this._hooks.process(msg);
    const iopub = this._iopub;
    if (process && iopub) {
      // tslint:disable-next-line:await-promise
      await iopub(msg);
    }
    if (
      KernelMessage.isStatusMsg(msg) &&
      msg.content.execution_state === 'idle'
    ) {
      this._setFlag(Private.KernelFutureFlag.GotIdle);
      if (this._testFlag(Private.KernelFutureFlag.GotReply)) {
        this._handleDone();
      }
    }
  }

  private _handleDone(): void {
    if (this._testFlag(Private.KernelFutureFlag.IsDone)) {
      return;
    }
    this._setFlag(Private.KernelFutureFlag.IsDone);
    this._done.resolve(this._replyMsg);
    if (this._disposeOnDone) {
      this.dispose();
    }
  }

  /**
   * Test whether the given future flag is set.
   */
  private _testFlag(flag: Private.KernelFutureFlag): boolean {
    // tslint:disable-next-line
    return (this._status & flag) !== 0;
  }

  /**
   * Set the given future flag.
   */
  private _setFlag(flag: Private.KernelFutureFlag): void {
    // tslint:disable-next-line
    this._status |= flag;
  }

  private _msg: REQUEST;
  private _status = 0;
  private _stdin: (
    msg: KernelMessage.IStdinMessage
  ) => void | PromiseLike<void> = Private.noOp;
  private _iopub: (
    msg: KernelMessage.IIOPubMessage
  ) => void | PromiseLike<void> = Private.noOp;
  private _reply: (msg: REPLY) => void | PromiseLike<void> = Private.noOp;
  private _done = new PromiseDelegate<REPLY>();
  private _replyMsg: REPLY;
  private _hooks = new Private.HookList<KernelMessage.IIOPubMessage>();
  private _disposeOnDone = true;
  private _kernel: Kernel.IKernelConnection;
}

export class KernelControlFutureHandler<
    REQUEST extends
      KernelMessage.IControlMessage = KernelMessage.IControlMessage,
    REPLY extends KernelMessage.IControlMessage = KernelMessage.IControlMessage
  >
  extends KernelFutureHandler<REQUEST, REPLY>
  implements Kernel.IControlFuture<REQUEST, REPLY> {}

export class KernelShellFutureHandler<
    REQUEST extends KernelMessage.IShellMessage = KernelMessage.IShellMessage,
    REPLY extends KernelMessage.IShellMessage = KernelMessage.IShellMessage
  >
  extends KernelFutureHandler<REQUEST, REPLY>
  implements Kernel.IShellFuture<REQUEST, REPLY> {}

namespace Private {
  /**
   * A no-op function.
   */
  export const noOp = (): void => {
    /* no-op */
  };

  /**
   * Defer a computation.
   *
   * #### NOTES
   * We can't just use requestAnimationFrame since it is not available in node.
   * This implementation is from Phosphor:
   * https://github.com/phosphorjs/phosphor/blob/e88e4321289bb1198f3098e7bda40736501f2ed8/tests/test-messaging/src/index.spec.ts#L63
   */
  const defer = (() => {
    const ok = typeof requestAnimationFrame === 'function';
    return ok ? requestAnimationFrame : setImmediate;
  })();

  export class HookList<T> {
    /**
     * Register a hook.
     *
     * @param hook - The callback to register.
     */
    add(hook: (msg: T) => boolean | PromiseLike<boolean>): void {
      this.remove(hook);
      this._hooks.push(hook);
    }

    /**
     * Remove a hook, if it exists in the hook list.
     *
     * @param hook - The callback to remove.
     */
    remove(hook: (msg: T) => boolean | PromiseLike<boolean>): void {
      const index = this._hooks.indexOf(hook);
      if (index >= 0) {
        this._hooks[index] = null;
        this._scheduleCompact();
      }
    }

    /**
     * Process a message through the hooks.
     *
     * @returns a promise resolving to false if any hook resolved as false,
     * otherwise true
     *
     * #### Notes
     * The most recently registered hook is run first. A hook can return a
     * boolean or a promise to a boolean, in which case processing pauses until
     * the promise is fulfilled. If a hook return value resolves to false, any
     * later hooks will not run and the function will return a promise resolving
     * to false. If a hook throws an error, the error is logged to the console
     * and the next hook is run. If a hook is registered during the hook
     * processing, it will not run until the next message. If a hook is removed
     * during the hook processing, it will be deactivated immediately.
     */
    async process(msg: T): Promise<boolean> {
      // Wait until we can start a new process run.
      await this._processing;

      // Start the next process run.
      const processing = new PromiseDelegate<void>();
      this._processing = processing.promise;

      let continueHandling: boolean;

      // Call the end hook (most recently-added) first. Starting at the end also
      // guarantees that hooks added during the processing will not be run in
      // this process run.
      for (let i = this._hooks.length - 1; i >= 0; i--) {
        const hook = this._hooks[i];

        // If the hook has been removed, continue to the next one.
        if (hook === null) {
          continue;
        }

        // Execute the hook and log any errors.
        try {
          // tslint:disable-next-line:await-promise
          continueHandling = await hook(msg);
        } catch (err) {
          continueHandling = true;
          console.error(err);
        }

        // If the hook resolved to false, stop processing and return.
        if (continueHandling === false) {
          processing.resolve(undefined);
          return false;
        }
      }

      // All hooks returned true (or errored out), so return true.
      processing.resolve(undefined);
      return true;
    }

    /**
     * Schedule a cleanup of the list, removing any hooks that have been nulled out.
     */
    private _scheduleCompact(): void {
      if (!this._compactScheduled) {
        this._compactScheduled = true;

        // Schedule a compaction in between processing runs. We do the
        // scheduling in an animation frame to rate-limit our compactions. If we
        // need to compact more frequently, we can change this to directly
        // schedule the compaction.
        defer(() => {
          this._processing = this._processing.then(() => {
            this._compactScheduled = false;
            this._compact();
          });
        });
      }
    }

    /**
     * Compact the list, removing any nulls.
     */
    private _compact(): void {
      let numNulls = 0;
      for (let i = 0, len = this._hooks.length; i < len; i++) {
        const hook = this._hooks[i];
        if (this._hooks[i] === null) {
          numNulls++;
        } else {
          this._hooks[i - numNulls] = hook;
        }
      }
      this._hooks.length -= numNulls;
    }

    private _hooks: (((msg: T) => boolean | PromiseLike<boolean>) | null)[] =
      [];
    private _compactScheduled: boolean;
    private _processing: Promise<void>;
  }

  /**
   * Bit flags for the kernel future state.
   */
  export enum KernelFutureFlag {
    GotReply = 0x1,
    GotIdle = 0x2,
    IsDone = 0x4,
    DisposeOnDone = 0x8
  }
}
