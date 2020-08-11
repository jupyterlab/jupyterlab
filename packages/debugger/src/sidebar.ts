// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { IThemeManager } from '@jupyterlab/apputils';

import { IEditorServices } from '@jupyterlab/codeeditor';

import { nullTranslator, ITranslator } from '@jupyterlab/translation';

import { bugIcon } from '@jupyterlab/ui-components';

import { Panel, SplitPanel, Widget } from '@lumino/widgets';

import { Breakpoints as BreakpointsPanel } from './panels/breakpoints';

import { Callstack as CallstackPanel } from './panels/callstack';

import { Sources as SourcesPanel } from './panels/sources';

import { Variables as VariablesPanel } from './panels/variables';

import { IDebugger } from './tokens';

/**
 * A debugger sidebar.
 */
export class DebuggerSidebar extends Panel {
  /**
   * Instantiate a new Debugger.Sidebar
   *
   * @param options The instantiation options for a Debugger.Sidebar
   */
  constructor(options: DebuggerSidebar.IOptions) {
    super();
    this.id = 'jp-debugger-sidebar';
    this.title.iconRenderer = bugIcon;
    this.addClass('jp-DebuggerSidebar');

    const {
      callstackCommands,
      editorServices,
      service,
      themeManager
    } = options;
    const translator = options.translator || nullTranslator;
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
      model: model.breakpoints,
      translator
    });

    this.sources = new SourcesPanel({
      model: model.sources,
      service,
      editorServices,
      translator
    });

    const header = new DebuggerSidebar.Header();

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
        this.node!.querySelector('h2')!.textContent = this.title.label;
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
    const header = document.createElement('header');
    const title = document.createElement('h2');

    title.textContent = '-';
    title.classList.add('jp-left-truncated');
    header.appendChild(title);

    return header;
  }
}
