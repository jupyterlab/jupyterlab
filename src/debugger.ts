// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { IDataConnector } from '@jupyterlab/coreutils';

import { ReadonlyJSONValue } from '@phosphor/coreutils';

import { INotebookTracker } from '@jupyterlab/notebook';

import { IClientSession } from '@jupyterlab/apputils';

import { IDisposable } from '@phosphor/disposable';

import { ISignal, Signal } from '@phosphor/signaling';

import { BoxPanel } from '@phosphor/widgets';

import { DebugSession } from './session';

export class Debugger extends BoxPanel {
  constructor(options: Debugger.IOptions) {
    super({ direction: 'left-to-right' });
    this.model = new Debugger.Model(options);
    // this.sidebar = new DebuggerSidebar(this.model);
    this.title.label = 'Debugger-' + options.id;

    this.addClass('jp-Debugger');
    // this.addWidget(this.sidebar);
  }

  readonly model: Debugger.Model;

  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this.model.dispose();
    super.dispose();
  }
}

/**
 * A namespace for `Debugger` statics.
 */
export namespace Debugger {
  export interface IOptions {
    connector?: IDataConnector<ReadonlyJSONValue>;
    id?: string;
    session?: IClientSession;
  }

  export class Model implements IDisposable {
    constructor(options: Debugger.Model.IOptions) {
      this.connector = options.connector || null;
      this.session = new DebugSession({ client: options.session });
      this.id = options.id;
      void this._populate();
    }

    readonly connector: IDataConnector<ReadonlyJSONValue> | null;

    readonly id: string;

    get session() {
      return this._session;
    }

    set session(session: DebugSession | null) {
      if (this._session === session) {
        return;
      }
      if (this._session) {
        this._session.dispose();
      }
      this._session = session;
      this._sessionChanged.emit(undefined);
    }

    get sessionChanged(): ISignal<this, void> {
      return this._sessionChanged;
    }

    get isDisposed(): boolean {
      return this._isDisposed;
    }

    get notebookTracker() {
      return this._notebook;
    }

    dispose(): void {
      this._isDisposed = true;
    }

    private async _populate(): Promise<void> {
      const { connector } = this;

      if (!connector) {
        return;
      }
    }

    private _isDisposed = false;
    private _notebook: INotebookTracker;
    private _session: DebugSession | null;
    private _sessionChanged = new Signal<this, void>(this);
    private _sidebar: IDebuggerSidebar;
  }

  export namespace Model {
    export interface IOptions extends Debugger.IOptions {}
  }
}
