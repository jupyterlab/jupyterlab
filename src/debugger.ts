// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { IEditorServices } from '@jupyterlab/codeeditor';

import { ISignal, Signal } from '@phosphor/signaling';

import { SplitPanel } from '@phosphor/widgets';

import { Breakpoints } from './breakpoints';

import { BreakpointsModel } from './breakpoints/model';

import { Callstack } from './callstack';

import { CallstackModel } from './callstack/model';

import { DebugService } from './service';

import { Sources } from './sources';

import { SourcesModel } from './sources/model';

import { IDebugger } from './tokens';

import { Variables } from './variables';
import { VariablesModel } from './variables/model';

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

      this.addClass('jp-DebuggerSidebar');
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
      this.breakpoints = new BreakpointsModel();
      this.callstack = new CallstackModel();
      this.variables = new VariablesModel();
      this.sources = new SourcesModel({
        currentFrameChanged: this.callstack.currentFrameChanged
      });
    }

    readonly breakpoints: BreakpointsModel;
    readonly callstack: CallstackModel;
    readonly variables: VariablesModel;
    readonly sources: SourcesModel;

    dispose(): void {
      if (this._isDisposed) {
        return;
      }
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

    /**
     * Clear the model.
     */
    clear() {
      this._stoppedThreads.clear();
      const breakpoints = new Map<string, IDebugger.IBreakpoint[]>();
      this.breakpoints.restoreBreakpoints(breakpoints);
      this.callstack.frames = [];
      this.variables.scopes = [];
      this.sources.currentSource = null;
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
