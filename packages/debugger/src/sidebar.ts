// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { IThemeManager } from '@jupyterlab/apputils';

import { IEditorServices } from '@jupyterlab/codeeditor';

import { ITranslator, nullTranslator } from '@jupyterlab/translation';

import { bugIcon, SidePanel } from '@jupyterlab/ui-components';

import { Widget } from '@lumino/widgets';

import { Breakpoints as BreakpointsPanel } from './panels/breakpoints';

import { Callstack as CallstackPanel } from './panels/callstack';

import { Sources as SourcesPanel } from './panels/sources';

import { KernelSources as KernelSourcesPanel } from './panels/kernelSources';

import { Variables as VariablesPanel } from './panels/variables';

import { IDebugger } from './tokens';

/**
 * A debugger sidebar.
 */
export class DebuggerSidebar extends SidePanel {
  /**
   * Instantiate a new Debugger.Sidebar
   *
   * @param options The instantiation options for a Debugger.Sidebar
   */
  constructor(options: DebuggerSidebar.IOptions) {
    const translator = options.translator || nullTranslator;
    super({ translator });
    this.id = 'jp-debugger-sidebar';
    this.title.icon = bugIcon;
    this.addClass('jp-DebuggerSidebar');

    const {
      callstackCommands,
      breakpointsCommands,
      editorServices,
      service,
      themeManager
    } = options;
    const model = service.model;

    this.variables = new VariablesPanel({
      model: model.variables,
      commands: callstackCommands.registry,
      service,
      themeManager,
      translator
    });

    this.callstack = new CallstackPanel({
      commands: callstackCommands,
      model: model.callstack,
      translator
    });

    this.breakpoints = new BreakpointsPanel({
      service,
      commands: breakpointsCommands,
      model: model.breakpoints,
      translator
    });

    this.sources = new SourcesPanel({
      model: model.sources,
      service,
      editorServices,
      translator
    });

    this.kernelSources = new KernelSourcesPanel({
      model: model.kernelSources,
      service,
      translator
    });

    const header = new DebuggerSidebar.Header();

    this.header.addWidget(header);
    model.titleChanged.connect((_, title) => {
      header.title.label = title;
    });

    this.content.addClass('jp-DebuggerSidebar-body');

    this.addWidget(this.variables);
    this.addWidget(this.callstack);
    this.addWidget(this.breakpoints);
    this.addWidget(this.sources);
    this.addWidget(this.kernelSources);
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

  readonly kernelSources: KernelSourcesPanel;
}

/**
 * A namespace for DebuggerSidebar statics
 */
export namespace DebuggerSidebar {
  /**
   * Instantiation options for `DebuggerSidebar`.
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
     * The callstack toolbar commands.
     */
    breakpointsCommands: BreakpointsPanel.ICommands;

    /**
     * The editor services.
     */
    editorServices: IEditorServices;

    /**
     * An optional application theme manager to detect theme changes.
     */
    themeManager?: IThemeManager | null;

    /**
     * An optional application language translator.
     */
    translator?: ITranslator;
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
        this.node.textContent = this.title.label;
      });
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
    const title = document.createElement('h2');

    title.textContent = '-';
    title.classList.add('jp-text-truncated');

    return title;
  }
}
