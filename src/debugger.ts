// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { CodeEditor } from '@jupyterlab/codeeditor';

import { IDataConnector } from '@jupyterlab/coreutils';

import { ReadonlyJSONValue } from '@phosphor/coreutils';

import { IClientSession } from '@jupyterlab/apputils';

import { IDisposable } from '@phosphor/disposable';

import { ISignal, Signal } from '@phosphor/signaling';

import { BoxPanel } from '@phosphor/widgets';

import { CodeEditors } from './editors';

import { DebuggerSidebar } from './sidebar';

import { IDebugger } from './tokens';

export class Debugger extends BoxPanel {
  constructor(options: Debugger.IOptions) {
    super({ direction: 'left-to-right' });
    this.title.label = 'Debugger';
    this.title.iconClass = 'jp-BugIcon';

    this.model = new Debugger.Model(options);

    this.sidebar = new DebuggerSidebar(this.model);
    this.model.sidebar = this.sidebar;

    const { editorFactory } = options;
    this.editors = new CodeEditors({ editorFactory });
    this.addWidget(this.editors);

    this.addClass('jp-Debugger');
  }

  readonly editors: CodeEditors;
  readonly model: Debugger.Model;
  readonly sidebar: DebuggerSidebar;

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
    editorFactory: CodeEditor.Factory;
    connector?: IDataConnector<ReadonlyJSONValue>;
    id?: string;
    session?: IClientSession;
  }

  export class Model implements IDisposable {
    constructor(options: Debugger.Model.IOptions) {
      this.connector = options.connector || null;
      // Avoids setting session with invalid client
      // session should be set only when a notebook or
      // a console get the focus.
      // TODO: also checks that the notebook or console
      // runs a kernel with debugging ability
      this.session = null;
      this.id = options.id;
      void this._populate();
    }

    readonly connector: IDataConnector<ReadonlyJSONValue> | null;
    readonly id: string;

    get mode(): IDebugger.Mode {
      return this._mode;
    }

    set mode(mode: IDebugger.Mode) {
      if (this._mode === mode) {
        return;
      }
      this._mode = mode;
      this._modeChanged.emit(mode);
    }

    get sidebar() {
      return this._sidebar;
    }

    set sidebar(sidebar: DebuggerSidebar) {
      this._sidebar = sidebar;
    }

    get modeChanged(): ISignal<this, IDebugger.Mode> {
      return this._modeChanged;
    }

    get session(): IDebugger.ISession {
      return this._session;
    }

    set session(session: IDebugger.ISession | null) {
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

    dispose(): void {
      this._isDisposed = true;
    }

    private async _populate(): Promise<void> {
      const { connector } = this;

      if (!connector) {
        return;
      }
    }

    private _sidebar: DebuggerSidebar;
    private _isDisposed = false;
    private _mode: IDebugger.Mode;
    private _modeChanged = new Signal<this, IDebugger.Mode>(this);
    private _session: IDebugger.ISession | null;
    private _sessionChanged = new Signal<this, void>(this);
  }

  export namespace Model {
    export interface IOptions extends Debugger.IOptions {}
  }
}
