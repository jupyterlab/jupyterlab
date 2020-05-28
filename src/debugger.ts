// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { IEditorServices } from '@jupyterlab/codeeditor';

import { bugIcon } from '@jupyterlab/ui-components';

import { Panel, SplitPanel, Widget } from '@lumino/widgets';

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
  export class Sidebar extends Panel {
    /**
     * Instantiate a new Debugger.Sidebar
     *
     * @param options The instantiation options for a Debugger.Sidebar
     */
    constructor(options: Sidebar.IOptions) {
      super();
      this.id = 'jp-debugger-sidebar';
      this.title.iconRenderer = bugIcon;
      this.addClass('jp-DebuggerSidebar');

      const { callstackCommands, editorServices, service } = options;

      this.model = service.model as DebuggerModel;
      this.service = service as DebuggerService;
      this.service.model = this.model;

      this.variables = new Variables({
        model: this.model.variables,
        commands: callstackCommands.registry,
        service
      });

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

      const header = new Sidebar.Header();

      this.addWidget(header);
      this.model.titleChanged.connect((_, title) => {
        header.title.label = title;
      });

      const body = new SplitPanel();

      body.orientation = 'vertical';
      body.addWidget(this.variables);
      body.addWidget(this.callstack);
      body.addWidget(this.breakpoints);
      body.addWidget(this.sources);
      body.addClass('jp-DebuggerSidebar-body');

      this.addWidget(body);
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
      super.dispose();
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

    /**
     * The header for a debugger sidebar.
     */
    export class Header extends Widget {
      /**
       * Instantiate a new sidebar header.
       */
      constructor() {
        super({ node: Private.createHeader() });
        this.title.changed.connect(_ => {
          this.node.querySelector('h2').textContent = this.title.label;
        });
      }
    }
  }
}

/**
 * A namespace for private module data.
 */
namespace Private {
  /**
   * Create a sidebar header node.
   */
  export function createHeader(): HTMLElement {
    const header = document.createElement('header');
    const title = document.createElement('h2');

    title.textContent = '-';
    title.classList.add('jp-left-truncated');
    header.appendChild(title);

    return header;
  }
}
