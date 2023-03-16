// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { IThemeManager } from '@jupyterlab/apputils';

import { CommandRegistry } from '@lumino/commands';

import { Panel } from '@lumino/widgets';

import { IDebugger } from '../../tokens';

import { VariablesModel } from './model';
import { ITranslator } from '@jupyterlab/translation';

import type * as GridPanelModule from './gridpanel';
import { PromiseDelegate } from '@lumino/coreutils';
import { Message } from '@lumino/messaging';

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

    this._model = options.model;
    this._options = options;

    this.addClass('jp-DebuggerVariables-body');
  }

  /**
   * Wait until actually displaying the grid to trigger initialization.
   */
  protected onBeforeShow(msg: Message): void {
    if (!this._grid) {
      void this.initialize();
    }
  }

  /**
   * Load the grid panel implementation.
   */
  protected async initialize(): Promise<void> {
    const { model, commands, themeManager, scopes, translator } = this._options;
    const { Grid } = await Private.ensureGridPanel();
    this._grid = new Grid({ commands, model, themeManager, translator });
    this._grid.addClass('jp-DebuggerVariables-grid');
    this._model.changed.connect((model: VariablesModel): void => {
      this._update();
    }, this);
    this._grid.dataModel.setData(scopes ?? []);
    this.addWidget(this._grid);
  }

  /**
   * Set the variable filter list.
   *
   * @param filter The variable filter to apply.
   */
  set filter(filter: Set<string>) {
    (this._grid.dataModel as GridPanelModule.GridModel).filter = filter;
    this._update();
  }

  /**
   * Set the current scope.
   *
   * @param scope The current scope for the variables.
   */
  set scope(scope: string) {
    (this._grid.dataModel as GridPanelModule.GridModel).scope = scope;
    this._update();
  }

  /**
   * Update the underlying data model
   */
  private _update(): void {
    this._grid.dataModel.setData(this._model.scopes ?? []);
  }

  private _grid: GridPanelModule.Grid;
  private _model: IDebugger.Model.IVariables;
  private _options: VariablesBodyGrid.IOptions;
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

/**
 * A private namespace for managing lazy loading of the underlying grid panel.
 */
namespace Private {
  let gridPanelLoaded: PromiseDelegate<typeof GridPanelModule> | null = null;

  /**
   * Lazily load the datagrid module when the first grid is requested.
   */
  export async function ensureGridPanel(): Promise<typeof GridPanelModule> {
    if (gridPanelLoaded == null) {
      gridPanelLoaded = new PromiseDelegate();
      gridPanelLoaded.resolve(await import('./gridpanel'));
    }
    return gridPanelLoaded.promise;
  }
}
