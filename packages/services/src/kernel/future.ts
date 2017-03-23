// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

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
  constructor(cb: () => void, msg: KernelMessage.IShellMessage, expectShell: boolean, disposeOnDone: boolean) {
    super(cb);
    this._msg = msg;
    if (!expectShell) {
      this._setFlag(Private.KernelFutureFlag.GotReply);
    }
    this._disposeOnDone = disposeOnDone;
  }

  /**
   * Get the original outgoing message.
   */
  get msg(): KernelMessage.IShellMessage {
    return this._msg;
  }

  /**
   * Check for message done state.
   */
  get isDone(): boolean {
    return this._testFlag(Private.KernelFutureFlag.IsDone);
  }

  /**
   * Get the reply handler.
   */
  get onReply(): (msg: KernelMessage.IShellMessage) => void {
    return this._reply;
  }

  /**
   * Set the reply handler.
   */
  set onReply(cb: (msg: KernelMessage.IShellMessage) => void) {
    this._reply = cb;
  }

  /**
   * Get the iopub handler.
   */
  get onIOPub(): (msg: KernelMessage.IIOPubMessage) => void {
    return this._iopub;
  }

  /**
   * Set the iopub handler.
   */
  set onIOPub(cb: (msg: KernelMessage.IIOPubMessage) => void) {
    this._iopub = cb;
  }

  /**
   * Get the done handler.
   */
  get onDone(): () => void  {
    return this._done;
  }

  /**
   * Set the done handler.
   */
  set onDone(cb: () => void) {
    this._done = cb;
  }

  /**
   * Get the stdin handler.
   */
  get onStdin(): (msg: KernelMessage.IStdinMessage) => void {
    return this._stdin;
  }

  /**
   * Set the stdin handler.
   */
  set onStdin(cb: (msg: KernelMessage.IStdinMessage) => void) {
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
  registerMessageHook(hook: (msg: KernelMessage.IIOPubMessage) => boolean): void {
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
  removeMessageHook(hook: (msg: KernelMessage.IIOPubMessage) => boolean): void {
    if (this.isDisposed) {
      return;
    }
    this._hooks.remove(hook);
  }

  /**
   * Dispose and unregister the future.
   */
  dispose(): void {
    this._stdin = null;
    this._iopub = null;
    this._reply = null;
    this._done = null;
    this._msg = null;
    if (this._hooks) { this._hooks.dispose(); }
    this._hooks = null;
    super.dispose();
  }

  /**
   * Handle an incoming kernel message.
   */
  handleMsg(msg: KernelMessage.IMessage): void {
    switch (msg.channel) {
    case 'shell':
      this._handleReply(msg as KernelMessage.IShellMessage);
      break;
    case 'stdin':
      this._handleStdin(msg as KernelMessage.IStdinMessage);
      break;
    case 'iopub':
      this._handleIOPub(msg as KernelMessage.IIOPubMessage);
      break;
    }
  }

  private _handleReply(msg: KernelMessage.IShellMessage): void {
    let reply = this._reply;
    if (reply) { reply(msg); }
    this._setFlag(Private.KernelFutureFlag.GotReply);
    if (this._testFlag(Private.KernelFutureFlag.GotIdle)) {
      this._handleDone();
    }
  }

  private _handleStdin(msg: KernelMessage.IStdinMessage): void {
    let stdin = this._stdin;
    if (stdin) { stdin(msg); }
  }

  private _handleIOPub(msg: KernelMessage.IIOPubMessage): void {
    let process = this._hooks.process(msg);
    let iopub = this._iopub;
    if (process && iopub) { iopub(msg); }
    if (KernelMessage.isStatusMsg(msg) &&
        msg.content.execution_state === 'idle') {
      this._setFlag(Private.KernelFutureFlag.GotIdle);
      if (this._testFlag(Private.KernelFutureFlag.GotReply)) {
        this._handleDone();
      }
    }
  }

  private _handleDone(): void {
    if (this.isDone) {
      return;
    }
    this._setFlag(Private.KernelFutureFlag.IsDone);
    let done = this._done;
    if (done) done();
    this._done = null;
    if (this._disposeOnDone) {
      this.dispose();
    }
  }

  /**
   * Test whether the given future flag is set.
   */
  private _testFlag(flag: Private.KernelFutureFlag): boolean {
    return (this._status & flag) !== 0;
  }

  /**
   * Set the given future flag.
   */
  private _setFlag(flag: Private.KernelFutureFlag): void {
    this._status |= flag;
  }

  private _msg: KernelMessage.IShellMessage = null;
  private _status = 0;
  private _stdin: (msg: KernelMessage.IStdinMessage) => void = null;
  private _iopub: (msg: KernelMessage.IIOPubMessage) => void = null;
  private _reply: (msg: KernelMessage.IShellMessage) => void = null;
  private _done: () => void = null;
  private _hooks = new Private.HookList<KernelMessage.IIOPubMessage>();
  private _disposeOnDone = true;
}

namespace Private {
  /**
   * A polyfill for a function to run code outside of the current execution context.
   */
  let defer = typeof requestAnimationFrame === "function" ? requestAnimationFrame : setImmediate;

  export
  class HookList<T> {
    /**
     * Register a hook.
     *
     * @param hook - The callback to register.
     */
    add(hook: (msg: T) => boolean): void {
      this.remove(hook);
      this._hooks.push(hook);
    }

    /**
     * Remove a hook.
     *
     * @param hook - The callback to remove.
     */
    remove(hook: (msg: T) => boolean): void {
      if (this.isDisposed) {
        return;
      }
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
     * The most recently registered hook is run first.
     * If the hook returns false, any later hooks will not run.
     * If a hook throws an error, the error is logged to the console and the next hook is run.
     * If a hook is registered during the hook processing, it won't run until the next message.
     * If a hook is removed during the hook processing, it will be deactivated immediately.
     */
    process(msg: T): boolean {
      let continueHandling: boolean;
      // most recently-added hook is called first
      for (let i = this._hooks.length-1; i>=0; i--) {
        let hook = this._hooks[i];
        if (hook === null) { continue; }
        try {
          continueHandling = hook(msg);
        } catch(err) {
          continueHandling = true;
          console.error(err);
        }
        if (continueHandling === false) {
          return false;
        }
      }
      return true;
    }

    /**
     * Test whether the HookList has been disposed.
     */
    get isDisposed(): boolean {
      return (this._hooks === null);
    }

    /**
     * Dispose the hook list.
     */
    dispose(): void {
      this._hooks = null;
    }

    /**
     * Schedule a cleanup of the list, removing any hooks that have been nulled out.
     */
    private _scheduleCompact(): void {
      if (!this._cleanupScheduled) {
        this._cleanupScheduled = true;
        defer(() => {
          this._cleanupScheduled = false;
          this._compact();
        })
      }
    }

    /**
     * Compact the list, removing any nulls.
     */
    private _compact(): void {
      if (this.isDisposed) {
        return;
      }
      let numNulls = 0;
      for (let i = 0, len = this._hooks.length; i < len; i++) {
        let hook = this._hooks[i];
        if (this._hooks[i] === null) {
          numNulls++;
        } else {
          this._hooks[i-numNulls] = hook;
        }
      }
      this._hooks.length -= numNulls;
    }

    private _hooks: ((msg: T) => boolean)[] = [];
    private _cleanupScheduled: boolean;
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
