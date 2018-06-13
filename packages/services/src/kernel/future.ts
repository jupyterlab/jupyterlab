// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  PromiseDelegate
} from '@phosphor/coreutils';

import {
  DisposableDelegate
} from '@phosphor/disposable';

import {
  Kernel
} from './kernel';

import {
  KernelMessage
} from './messages';

/**
 * Implementation of a kernel future.
 */
export
class KernelFutureHandler extends DisposableDelegate implements Kernel.IFuture {
  /**
   * Construct a new KernelFutureHandler.
   */
  constructor(cb: () => void, msg: KernelMessage.IShellMessage, expectShell: boolean, disposeOnDone: boolean, kernel: Kernel.IKernel) {
    super(cb);
    this._msg = msg;
    if (!expectShell) {
      this._setFlag(Private.KernelFutureFlag.GotReply);
    }
    this._disposeOnDone = disposeOnDone;
    this._kernel = kernel;
  }

  /**
   * Get the original outgoing message.
   */
  get msg(): KernelMessage.IShellMessage {
    return this._msg;
  }

  /**
   * A promise that resolves when the future is done.
   */
  get done(): Promise<KernelMessage.IShellMessage> {
    return this._done.promise;
  }

  /**
   * Get the reply handler.
   */
  get onReply(): (msg: KernelMessage.IShellMessage) => void | PromiseLike<void> {
    return this._reply;
  }

  /**
   * Set the reply handler.
   */
  set onReply(cb: (msg: KernelMessage.IShellMessage) => void | PromiseLike<void>) {
    this._reply = cb;
  }

  /**
   * Get the iopub handler.
   */
  get onIOPub(): (msg: KernelMessage.IIOPubMessage) => void | PromiseLike<void> {
    return this._iopub;
  }

  /**
   * Set the iopub handler.
   */
  set onIOPub(cb: (msg: KernelMessage.IIOPubMessage) => void | PromiseLike<void>) {
    this._iopub = cb;
  }

  /**
   * Get the stdin handler.
   */
  get onStdin(): (msg: KernelMessage.IStdinMessage) => void | PromiseLike<void> {
    return this._stdin;
  }

  /**
   * Set the stdin handler.
   */
  set onStdin(cb: (msg: KernelMessage.IStdinMessage) => void | PromiseLike<void>) {
    this._stdin = cb;
  }

  /**
   * Register hook for IOPub messages.
   *
   * @param hook - The callback invoked for an IOPub message.
   *
   * #### Notes
   * The IOPub hook system allows you to preempt the handlers for IOPub messages handled
   * by the future. The most recently registered hook is run first.
   * If the hook returns false, any later hooks and the future's onIOPub handler will not run.
   * If a hook throws an error, the error is logged to the console and the next hook is run.
   * If a hook is registered during the hook processing, it won't run until the next message.
   * If a hook is removed during the hook processing, it will be deactivated immediately.
   */
  registerMessageHook(hook: (msg: KernelMessage.IIOPubMessage) => boolean | PromiseLike<boolean>): void {
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
  removeMessageHook(hook: (msg: KernelMessage.IIOPubMessage) => boolean | PromiseLike<boolean>): void {
    if (this.isDisposed) {
      return;
    }
    this._hooks.remove(hook);
  }


  /**
   * Send an `input_reply` message.
   */
  sendInputReply(content: KernelMessage.IInputReply): void {
    this._kernel.sendInputReply(content);
  }

  /**
   * Dispose and unregister the future.
   */
  dispose(): void {
    this._stdin = Private.noOp;
    this._iopub = Private.noOp;
    this._reply = Private.noOp;
    this._hooks = null;
    if (!this._testFlag(Private.KernelFutureFlag.IsDone)) {
      this._done.reject(new Error('Canceled'));
    }
    super.dispose();
  }

  /**
   * Handle an incoming kernel message.
   */
  async handleMsg(msg: KernelMessage.IMessage): Promise<void> {
    switch (msg.channel) {
    case 'shell':
      await this._handleReply(msg as KernelMessage.IShellMessage);
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

  private async _handleReply(msg: KernelMessage.IShellMessage): Promise<void> {
    let reply = this._reply;
    if (reply) { await reply(msg); }
    this._replyMsg = msg;
    this._setFlag(Private.KernelFutureFlag.GotReply);
    if (this._testFlag(Private.KernelFutureFlag.GotIdle)) {
      this._handleDone();
    }
  }

  private async _handleStdin(msg: KernelMessage.IStdinMessage): Promise<void> {
    let stdin = this._stdin;
    if (stdin) { await stdin(msg); }
  }

  private async _handleIOPub(msg: KernelMessage.IIOPubMessage): Promise<void> {
    let process = await this._hooks.process(msg);
    let iopub = this._iopub;
    if (process && iopub) { await iopub(msg); }
    if (KernelMessage.isStatusMsg(msg) &&
        msg.content.execution_state === 'idle') {
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

  private _msg: KernelMessage.IShellMessage;
  private _status = 0;
  private _stdin: (msg: KernelMessage.IStdinMessage) => void | PromiseLike<void> = Private.noOp;
  private _iopub: (msg: KernelMessage.IIOPubMessage) => void | PromiseLike<void> = Private.noOp;
  private _reply: (msg: KernelMessage.IShellMessage) => void | PromiseLike<void> = Private.noOp;
  private _done = new PromiseDelegate<KernelMessage.IShellMessage>();
  private _replyMsg: KernelMessage.IShellMessage;
  private _hooks = new Private.HookList<KernelMessage.IIOPubMessage>();
  private _disposeOnDone = true;
  private _kernel: Kernel.IKernel;
}

namespace Private {
  /**
   * A no-op function.
   */
  export
  const noOp = () => { /* no-op */ };

  export
  class HookList<T> {
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
      let index = this._hooks.indexOf(hook);
      if (index >= 0) {
        this._hooks[index] = null;
        this._scheduleCompact();
      }
    }

    /**
     * Process a message through the hooks.
     *
     * #### Notes
     * The hooks can be asynchronous, returning a promise, and hook processing
     * pauses until the promise resolves. The most recently registered hook is
     * run first. If the hook returns false, any later hooks will not run. If a
     * hook throws an error, the error is logged to the console and the next
     * hook is run. If a hook is registered during the hook processing, it won't
     * run until the next message. If a hook is removed during the hook
     * processing, it will be deactivated immediately.
     */
    async process(msg: T): Promise<boolean> {
      // Wait until we can start a new process run.
      await this._processing;

      // Reserve a process run for ourselves.
      let processing = new PromiseDelegate<void>();
      this._processing = processing.promise;

      let continueHandling: boolean;

      // Call the end hook (most recently-added) first. Starting at the end also
      // guarantees that hooks added during the processing will not be run in
      // this invocation.
      for (let i = this._hooks.length - 1; i >= 0; i--) {
        let hook = this._hooks[i];
        if (hook === null) { continue; }
        try {
          continueHandling = await hook(msg);
        } catch (err) {
          continueHandling = true;
          console.error(err);
        }
        if (continueHandling === false) {
          processing.resolve(undefined);
          return false;
        }
      }
      processing.resolve(undefined);
      return true;
    }

    /**
     * Schedule a cleanup of the list, removing any hooks that have been nulled out.
     */
    private _scheduleCompact(): void {
      if (!this._compactScheduled) {
        this._compactScheduled = true;

        // Make sure we compact the list between processing phases. We may want
        // to rate-limit this compaction with a requestAnimationFrame as well.
        this._processing = this._processing.then(() => {
          this._compactScheduled = false;
          this._compact();
        });
      }
    }

    /**
     * Compact the list, removing any nulls.
     */
    private _compact(): void {
      let numNulls = 0;
      for (let i = 0, len = this._hooks.length; i < len; i++) {
        let hook = this._hooks[i];
        if (this._hooks[i] === null) {
          numNulls++;
        } else {
          this._hooks[i - numNulls] = hook;
        }
      }
      this._hooks.length -= numNulls;
    }

    private _hooks: (((msg: T) => boolean | PromiseLike<boolean>) | null)[] = [];
    private _compactScheduled: boolean;
    private _processing: Promise<void>;
  }

  /**
   * Bit flags for the kernel future state.
   */
  export
  enum KernelFutureFlag {
    GotReply = 0x1,
    GotIdle = 0x2,
    IsDone = 0x4,
    DisposeOnDone = 0x8,
  }
}
