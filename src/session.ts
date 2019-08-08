import { IClientSession } from '@jupyterlab/apputils';

import { CodeEditor } from '@jupyterlab/codeeditor';

import { ISignal, Signal } from '@phosphor/signaling';

import { IDebugger } from './tokens';

export class DebugSession implements IDebugger.ISession {
  /**
   * Instantiate a new debug session
   *
   * @param options - The debug session instantiation options.
   */
  constructor(options: DebugSession.IOptions) {
    this.client = options.client;
  }

  /**
   * Dispose the debug session.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this._isDisposed = true;
    this._disposed.emit();
  }

  /**
   * A signal emitted when the debug session is disposed.
   */
  get disposed(): ISignal<this, void> {
    return this._disposed;
  }

  /**
   * Whether the debug session is disposed.
   */
  get isDisposed(): boolean {
    return this._isDisposed;
  }

  client: IClientSession;
  editors: CodeEditor.IEditor[];

  private _disposed = new Signal<this, void>(this);
  private _isDisposed: boolean = false;
}

/**
 * A namespace for `DebugSession` statics.
 */
export namespace DebugSession {
  export interface IOptions {
    /**
     * The client session used by the debug session.
     */
    client: IClientSession;
  }
}
