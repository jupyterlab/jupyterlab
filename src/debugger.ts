// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { IEditorServices } from '@jupyterlab/codeeditor';

import { ISignal, Signal } from '@phosphor/signaling';

import { SplitPanel } from '@phosphor/widgets';

import { Breakpoints } from './breakpoints';

import { Callstack } from './callstack';

import { Sources } from './sources';

import { DebugService } from './service';

import { IDebugger } from './tokens';

import { Variables } from './variables';

/**
 * A namespace for `Debugger` statics.
 */
export namespace Debugger {
  export class Sidebar extends SplitPanel {
    constructor(options: Sidebar.IOptions) {
      super();
      this.id = 'jp-debugger-sidebar';
      this.title.iconClass = 'jp-BugIcon jp-SideBar-tabIcon';
      this.orientation = 'vertical';

      this.addClass('jp-DebuggerSidebar');

      const { callstackCommands, editorServices, service } = options;

      this.model = new Debugger.Model();
      this.service = service as DebugService;
      this.service.model = this.model;

      this.variables = new Variables({ model: this.model.variables });
      this.callstack = new Callstack({
        commands: callstackCommands,
        model: this.model.callstack
      });
      this.breakpoints = new Breakpoints({
        service,
        model: this.model.breakpoints
      });
      this.sources = new Sources({
        model: this.model.sources,
        service,
        editorServices
      });

      this.addWidget(this.variables);
      this.addWidget(this.callstack);
      this.addWidget(this.breakpoints);
      this.addWidget(this.sources);
    }

    isDisposed: boolean;

    dispose(): void {
      if (this.isDisposed) {
        return;
      }
      this.model.dispose();
      this.service.model = null;
    }

    readonly model: Debugger.Model;
    readonly service: DebugService;
    readonly variables: Variables;
    readonly callstack: Callstack;
    readonly breakpoints: Breakpoints;
    readonly sources: Sources;
  }

  export class Model implements IDebugger.IModel {
    constructor() {
      this.breakpoints = new Breakpoints.Model();
      this.callstack = new Callstack.Model([]);
      this.variables = new Variables.Model([]);
      this.sources = new Sources.Model({
        currentFrameChanged: this.callstack.currentFrameChanged
      });
    }

    readonly breakpoints: Breakpoints.Model;
    readonly callstack: Callstack.Model;
    readonly variables: Variables.Model;
    readonly sources: Sources.Model;

    dispose(): void {
      this._isDisposed = true;
      this._disposed.emit();
    }

    /**
     * A signal emitted when the debugger widget is disposed.
     */
    get disposed(): ISignal<this, void> {
      return this._disposed;
    }

    get isDisposed(): boolean {
      return this._isDisposed;
    }

    /**
     * The set of threads in stopped state.
     */
    get stoppedThreads(): Set<number> {
      return this._stoppedThreads;
    }

    /**
     * Assigns the parameters to the set of threads in stopped state.
     */
    set stoppedThreads(threads: Set<number>) {
      this._stoppedThreads = threads;
    }

    private _isDisposed = false;
    private _stoppedThreads = new Set<number>();
    private _disposed = new Signal<this, void>(this);
  }

  export namespace Sidebar {
    export interface IOptions {
      service: IDebugger;
      callstackCommands: Callstack.ICommands;
      editorServices: IEditorServices;
    }
  }
}
