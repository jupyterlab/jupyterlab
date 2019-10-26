// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { CodeEditor } from '@jupyterlab/codeeditor';

import { IDataConnector } from '@jupyterlab/coreutils';

import { IObservableString } from '@jupyterlab/observables';

import { ReadonlyJSONValue } from '@phosphor/coreutils';

import { IDisposable } from '@phosphor/disposable';

import { Message } from '@phosphor/messaging';

import { ISignal, Signal } from '@phosphor/signaling';

import { SplitPanel } from '@phosphor/widgets';

import { Breakpoints } from './breakpoints';

import { Callstack } from './callstack';

import { DebuggerEditors } from './editors';

import { DebugService } from './service';

import { IDebugger } from './tokens';

import { Variables } from './variables';

export class Debugger extends SplitPanel {
  constructor(options: Debugger.IOptions) {
    super({ orientation: 'horizontal' });
    this.title.label = 'Debugger';
    this.title.iconClass = 'jp-BugIcon';

    this.model = new Debugger.Model({
      connector: options.connector
    });

    this.sidebar = new Debugger.Sidebar(this.model);
    this.service = new DebugService(this.model);

    const { editorFactory } = options;
    this.editors = new DebuggerEditors({ editorFactory });
    this.addWidget(this.editors);

    this.addClass('jp-Debugger');
  }

  readonly editors: DebuggerEditors;
  readonly model: Debugger.Model;
  readonly sidebar: Debugger.Sidebar;
  readonly service: DebugService;

  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this.model.dispose();
    this.service.dispose();
    super.dispose();
  }

  protected onAfterAttach(msg: Message) {
    this.addWidget(this.sidebar);
    this.sidebar.show();
  }
}

/**
 * A namespace for `Debugger` statics.
 */
export namespace Debugger {
  export interface IOptions {
    editorFactory: CodeEditor.Factory;
    connector?: IDataConnector<ReadonlyJSONValue>;
  }

  export class Sidebar extends SplitPanel {
    constructor(model: Model) {
      super();
      this.orientation = 'vertical';
      this.addClass('jp-DebuggerSidebar');

      this.variables = new Variables({ model: model.variablesModel });
      this.callstack = new Callstack({ model: model.callstackModel });
      this.breakpoints = new Breakpoints({ model: model.breakpointsModel });

      this.addWidget(this.variables);
      this.addWidget(this.callstack);
      this.addWidget(this.breakpoints);
    }

    readonly variables: Variables;
    readonly callstack: Callstack;
    readonly breakpoints: Breakpoints;
  }

  export class Model implements IDisposable {
    constructor(options: Debugger.Model.IOptions) {
      this.breakpointsModel = new Breakpoints.Model([]);
      this.callstackModel = new Callstack.Model([]);
      this.variablesModel = new Variables.Model([]);
      this.connector = options.connector || null;
      void this._populate();
    }

    readonly breakpointsModel: Breakpoints.Model;
    readonly callstackModel: Callstack.Model;
    readonly variablesModel: Variables.Model;
    readonly connector: IDataConnector<ReadonlyJSONValue> | null;

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

    get modeChanged(): ISignal<this, IDebugger.Mode> {
      return this._modeChanged;
    }

    get isDisposed(): boolean {
      return this._isDisposed;
    }

    get codeValue() {
      return this._codeValue;
    }

    set codeValue(observableString: IObservableString) {
      this._codeValue = observableString;
    }

    get currentLineChanged() {
      return this._currentLineChanged;
    }

    get linesCleared() {
      return this._linesCleared;
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

    private _codeValue: IObservableString;
    private _isDisposed = false;
    private _mode: IDebugger.Mode;
    private _modeChanged = new Signal<this, IDebugger.Mode>(this);
    private _currentLineChanged = new Signal<this, number>(this);
    private _linesCleared = new Signal<this, void>(this);
  }

  export namespace Model {
    export interface IOptions {
      connector?: IDataConnector<ReadonlyJSONValue>;
    }
  }
}
