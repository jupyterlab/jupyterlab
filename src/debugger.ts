// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { IEditorServices } from '@jupyterlab/codeeditor';

import { bugIcon } from '@jupyterlab/ui-components';

import { Panel, SplitPanel, Widget } from '@lumino/widgets';

import { murmur2 } from 'murmurhash-js';

import { DebuggerModel } from './model';

import { Breakpoints as BreakpointsPanel } from './panels/breakpoints';

import { Callstack as CallstackPanel } from './panels/callstack';

import { Sources as SourcesPanel } from './panels/sources';

import { Variables as VariablesPanel } from './panels/variables';

import { DebuggerService } from './service';

import { DebuggerSources } from './sources';

import { IDebugger } from './tokens';

/**
 * A namespace for `Debugger` statics.
 */
export namespace Debugger {
  /**
   * A class that holds debugger configuration for a kernel.
   */
  export class Config implements IDebugger.IConfig {
    /**
     * Returns an id based on the given code.
     *
     * @param code The source code.
     * @param kernel The kernel name from current session.
     */
    getCodeId(code: string, kernel: string): string {
      const { prefix, suffix } = this._fileParams.get(kernel);
      const hash = this._hashMethods.get(kernel);

      if (!hash) {
        throw new Error(`Kernel (${kernel}) has no hashing params.`);
      }

      return `${prefix}${hash(code)}${suffix}`;
    }

    /**
     * Sets the hash parameters for a kernel.
     *
     * @param params - Hashing parameters for a kernel.
     */
    setHashParams(params: IDebugger.IConfig.HashParams): void {
      const { kernel, method, seed } = params;
      switch (method) {
        case 'Murmur2':
          this._hashMethods.set(kernel, code => murmur2(code, seed).toString());
          break;
        default:
          throw new Error(`Hash method (${method}) is not supported.`);
      }
    }

    /**
     * Sets the parameters used by the kernel to create temp files (e.g. cells).
     *
     * @param params - Temporary file prefix and suffix for a kernel.
     */
    setTmpFileParams(params: IDebugger.IConfig.FileParams): void {
      const { kernel, prefix, suffix } = params;
      this._fileParams.set(kernel, { kernel, prefix, suffix });
    }

    private _fileParams = new Map<string, IDebugger.IConfig.FileParams>();
    private _hashMethods = new Map<string, (code: string) => string>();
  }

  /**
   * A model for a debugger.
   */
  export class Model extends DebuggerModel {}

  /**
   * The main IDebugger implementation.
   */
  export class Service extends DebuggerService {}

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

      const model = service.model as Debugger.Model;

      this.variables = new VariablesPanel({
        model: model.variables,
        commands: callstackCommands.registry,
        service
      });

      this.callstack = new CallstackPanel({
        commands: callstackCommands,
        model: model.callstack
      });

      this.breakpoints = new BreakpointsPanel({
        service,
        model: model.breakpoints
      });

      this.sources = new SourcesPanel({
        model: model.sources,
        service,
        editorServices
      });

      const header = new Sidebar.Header();

      this.addWidget(header);
      model.titleChanged.connect((_, title) => {
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
      super.dispose();
    }

    /**
     * The variables widget.
     */
    readonly variables: VariablesPanel;

    /**
     * The callstack widget.
     */
    readonly callstack: CallstackPanel;

    /**
     * The breakpoints widget.
     */
    readonly breakpoints: BreakpointsPanel;

    /**
     * The sources widget.
     */
    readonly sources: SourcesPanel;
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
      callstackCommands: CallstackPanel.ICommands;
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

  /**
   * The source and editor manager for a debugger instance.
   */
  export class Sources extends DebuggerSources {}
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
