// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { IEditorServices } from '@jupyterlab/codeeditor';

import { SplitPanel } from '@phosphor/widgets';

import { Breakpoints } from './breakpoints';

import { Callstack } from './callstack';

import { DebuggerModel } from './model';

import { DebuggerService } from './service';

import { Sources } from './sources';

import { IDebugger } from './tokens';

import { Variables } from './variables';

/**
 * A namespace for `Debugger` statics.
 */
export namespace Debugger {
  /**
   * A debugger sidebar.
   */
  export class Sidebar extends SplitPanel {
    /**
     * Instantiate a new Debugger.Sidebar
     * @param options The instantiation options for a Debugger.Sidebar
     */
    constructor(options: Sidebar.IOptions) {
      super();
      this.id = 'jp-debugger-sidebar';
      this.title.iconClass = 'jp-BugIcon jp-SideBar-tabIcon';
      this.orientation = 'vertical';

      const { callstackCommands, editorServices, service } = options;

      this.model = new DebuggerModel();
      this.service = service as DebuggerService;
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

    /**
     * Whether the sidebar is disposed.
     */
    isDisposed: boolean;

    /**
     * Dispose the sidebar.
     */
    dispose(): void {
      if (this.isDisposed) {
        return;
      }
      this.model.dispose();
      this.service.model = null;
    }

    /**
     * The debugger model.
     */
    readonly model: DebuggerModel;

    /**
     * The debugger service.
     */
    readonly service: DebuggerService;

    /**
     * The variables widget.
     */
    readonly variables: Variables;

    /**
     * The callstack widget.
     */
    readonly callstack: Callstack;

    /**
     * The breakpoints widget.
     */
    readonly breakpoints: Breakpoints;

    /**
     * The sources widget.
     */
    readonly sources: Sources;
  }

  /**
   * A namespace for Sidebar `statics`
   */
  export namespace Sidebar {
    /**
     * Instantiation options for `Sidebar`.
     */
    export interface IOptions {
      /**
       * The debug service.
       */
      service: IDebugger;

      /**
       * The callstack toolbar commands.
       */
      callstackCommands: Callstack.ICommands;

      /**
       * The editor services.
       */
      editorServices: IEditorServices;
    }
  }
}
