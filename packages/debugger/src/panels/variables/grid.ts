// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import type { IThemeManager } from '@jupyterlab/apputils';

import type { ITranslator } from '@jupyterlab/translation';

import type { CommandRegistry } from '@lumino/commands';

import type { Message } from '@lumino/messaging';

import { Panel } from '@lumino/widgets';

import type { IDebugger } from '../../tokens';

import type * as GridPanelModule from './gridpanel';

/**
 * A data grid that displays variables in a debugger session.
 */
export class VariablesBodyGrid extends Panel {
  /**
   * Instantiate a new VariablesBodyGrid.
   *
   * @param options The instantiation options for a VariablesBodyGrid.
   */
  constructor(options: VariablesBodyGrid.IOptions) {
    super();
    this.commands = options.commands;
    this.model = options.model;
    this.themeManager = options.themeManager;
    this.translator = options.translator;
    this._initialScopes = options.scopes;
    this.model.changed.connect(() => {
      // The model took over the scopes given at instantiation.
      this._initialScopes = undefined;
      this.update();
    }, this);
    this.addClass('jp-DebuggerVariables-body');
  }

  /**
   * The variable filter list.
   */
  get filter(): Set<string> {
    return this._filter;
  }
  set filter(filter: Set<string>) {
    this._filter = filter;
    this.update();
  }

  /**
   * The current scope of the variables.
   */
  get scope(): string {
    return this._scope;
  }
  set scope(scope: string) {
    this._scope = scope;
    if (scope !== 'Globals') {
      this.addClass('jp-debuggerVariables-local');
    } else {
      this.removeClass('jp-debuggerVariables-local');
    }
    this.update();
  }

  protected commands: CommandRegistry;
  protected model: IDebugger.Model.IVariables;
  protected themeManager: IThemeManager | null | undefined;
  protected translator: ITranslator | undefined;

  /**
   * Load the grid panel implementation and instantiate a grid.
   */
  protected async initialize(): Promise<void> {
    if (this._grid || this._pending) {
      return;
    }

    // Lazily load the datagrid module when the first grid is requested.
    const { Grid } = await (this._pending = import('./gridpanel'));
    if (this.isDisposed) {
      this._pending = null;
      return;
    }
    const { commands, model, themeManager, translator } = this;

    this._grid = new Grid({ commands, model, themeManager, translator });
    this._grid.addClass('jp-DebuggerVariables-grid');
    this._pending = null;
    this.addWidget(this._grid);
    this.update();
  }

  /**
   * Wait until actually displaying the grid to trigger initialization.
   */
  protected onBeforeShow(msg: Message): void {
    void this.initialize();
    super.onBeforeShow(msg);
  }

  /**
   * Trigger initialization for a grid which is displayed as soon as it is
   * attached, as it never gets a `before-show` message.
   */
  protected onAfterAttach(msg: Message): void {
    super.onAfterAttach(msg);
    if (this.isVisible) {
      void this.initialize();
    }
  }

  /**
   * Handle `update-request` messages.
   */
  protected onUpdateRequest(msg: Message): void {
    if (this._grid) {
      const { dataModel } = this._grid;
      dataModel.filter = this._filter;
      dataModel.scope = this._scope;
      dataModel.setData(this._initialScopes ?? this.model.scopes ?? []);
    }
    super.onUpdateRequest(msg);
  }

  private _filter: Set<string> = new Set();
  private _grid: GridPanelModule.Grid | null = null;
  private _initialScopes: IDebugger.IScope[] | undefined;
  private _pending: Promise<unknown> | null = null;
  private _scope: string;
}

/**
 * A namespace for `VariablesBodyGrid` statics.
 */
export namespace VariablesBodyGrid {
  /**
   * Instantiation options for `VariablesBodyGrid`.
   */
  export interface IOptions {
    /**
     * The variables model.
     */
    model: IDebugger.Model.IVariables;

    /**
     * The commands registry.
     */
    commands: CommandRegistry;

    /**
     * The optional initial scopes data.
     */
    scopes?: IDebugger.IScope[];

    /**
     * An optional application theme manager to detect theme changes.
     */
    themeManager?: IThemeManager | null;

    /**
     * The application language translator.
     */
    translator?: ITranslator;
  }
}
