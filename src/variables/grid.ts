// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { CommandRegistry } from '@lumino/commands';

import {
  BasicKeyHandler,
  BasicMouseHandler,
  BasicSelectionModel,
  DataGrid,
  DataModel,
  TextRenderer
} from '@lumino/datagrid';

import { ISignal, Signal } from '@lumino/signaling';

import { Panel } from '@lumino/widgets';

import { CommandIDs } from '..';

import { VariablesModel } from './model';

/**
 * A Panel to show variables in a datagrid.
 */
export class VariablesBodyGrid extends Panel {
  /**
   * Instantiate a new VariablesBodyGrid.
   *
   * @param options The instantiation options for a VariablesBodyGrid.
   */
  constructor(options: VariablesBodyGrid.IOptions) {
    super();
    const { model, commands, scopes } = options;
    this._grid = new VariablesGrid({ commands });
    this._grid.addClass('jp-DebuggerVariables-grid');
    this._model = model;
    this._grid.dataModel.setData(scopes ?? []);
    const updated = (model: VariablesModel): void => {
      this._grid.dataModel.setData(model.scopes);
    };
    this._model.changed.connect(updated, this);
    this.addWidget(this._grid);
    this.addClass('jp-DebuggerVariables-body');
  }

  /**
   * Set the variable filter list.
   *
   * @param filter The variable filter to apply.
   */
  set filter(filter: Set<string>) {
    (this._grid.dataModel as VariableDataGridModel).filter = filter;
    this._grid.dataModel.setData(this._model.scopes);
  }

  /**
   * Set the theme used in JupyterLab.
   *
   * @param theme The theme for the datagrid.
   */
  set theme(theme: VariablesGrid.Theme) {
    this._grid.theme = theme;
  }

  private _grid: VariablesGrid;
  private _model: VariablesModel;
}

/**
 * A class wrapping the underlying variables datagrid.
 */
export class VariablesGrid extends Panel {
  /**
   * Instantiate a new VariablesGrid.
   *
   * @param options The instantiation options for a VariablesGrid.
   */
  constructor(options: VariablesGrid.IOptions) {
    super();
    const { commands } = options;
    const dataModel = new VariableDataGridModel();
    const grid = new DataGrid();
    const mouseHandler = new Private.VariablesClickHandler();
    mouseHandler.doubleClicked.connect((_, hit) =>
      commands.execute(CommandIDs.inspectVariable, {
        variableReference: dataModel.getVariableReference(hit.row),
        title: dataModel.getVariableName(hit.row)
      })
    );
    grid.dataModel = dataModel;
    grid.keyHandler = new BasicKeyHandler();
    grid.mouseHandler = mouseHandler;
    grid.selectionModel = new BasicSelectionModel({
      dataModel
    });
    grid.stretchLastColumn = true;
    grid.node.style.height = '100%';
    this._grid = grid;
    this.addWidget(grid);
  }

  /**
   * Set the variable filter list.
   *
   * @param filter The variable filter to apply.
   */
  set filter(filter: Set<string>) {
    (this._grid.dataModel as VariableDataGridModel).filter = filter;
    this.update();
  }

  /**
   * Set the theme used in JupyterLab.
   *
   * @param theme The theme for the datagrid.
   */
  set theme(theme: VariablesGrid.Theme) {
    const { dataStyle, textRender } =
      theme === 'dark' ? Private.DARK_STYLE : Private.LIGHT_STYLE;
    this._grid.cellRenderers.update({}, textRender);
    this._grid.style = dataStyle;
  }

  /**
   * Get the data model for the data grid.
   */
  get dataModel(): VariableDataGridModel {
    return this._grid.dataModel as VariableDataGridModel;
  }

  private _grid: DataGrid;
}

/**
 * A DataGrid model for Variables.
 */
export class VariableDataGridModel extends DataModel {
  /**
   * Set the variable filter list.
   */
  set filter(filter: Set<string>) {
    this._filter = filter;
  }

  /**
   * Get the row count for a particular region in the data grid.
   *
   * @param region The datagrid region.
   */
  rowCount(region: DataModel.RowRegion): number {
    return region === 'body' ? this._data.name.length : 1;
  }

  /**
   * Get the column count for a particular region in the data grid.
   *
   * @param region The datagrid region.
   */
  columnCount(region: DataModel.ColumnRegion): number {
    return region === 'body' ? 2 : 1;
  }

  /**
   * Get the data count for a particular region, row and column in the data grid.
   *
   * @param region The datagrid region.
   * @param row The datagrid row
   * @param column The datagrid column
   */
  data(region: DataModel.CellRegion, row: number, column: number): any {
    if (region === 'row-header') {
      return this._data.name[row];
    }

    if (region === 'column-header') {
      return column === 1 ? 'Value' : 'Type';
    }
    if (region === 'corner-header') {
      return 'Name';
    }

    return column === 1 ? this._data.value[row] : this._data.type[row];
  }

  /**
   * Get the variable reference for a given row
   *
   * @param row The row in the datagrid.
   */
  getVariableReference(row: number): number {
    return this._data.variablesReference[row];
  }

  /**
   * Get the variable name for a given row
   *
   * @param row The row in the datagrid.
   */
  getVariableName(row: number): string {
    return this._data.name[row];
  }

  /**
   * Set the datagrid model data from the variable scopes.
   *
   * @param scopes The scopes.
   */
  setData(scopes: VariablesModel.IScope[]): void {
    this._clearData();
    this.emitChanged({
      type: 'model-reset',
      region: 'body'
    });
    scopes.forEach(scope => {
      const filtered = scope.variables.filter(
        variable => !this._filter.has(variable.evaluateName)
      );
      filtered.forEach((variable, index) => {
        this._data.name[index] = variable.evaluateName;
        this._data.type[index] = variable.type;
        this._data.value[index] = variable.value;
        this._data.variablesReference[index] = variable.variablesReference;
      });
      this.emitChanged({
        type: 'rows-inserted',
        region: 'body',
        index: 1,
        span: filtered.length
      });
    });
  }

  /**
   * Clear all the data in the datagrid.
   */
  private _clearData(): void {
    this._data = {
      name: [],
      type: [],
      value: [],
      variablesReference: []
    };
  }

  private _filter = new Set<string>();
  private _data: {
    name: string[];
    type: string[];
    value: string[];
    variablesReference: number[];
  } = {
    name: [],
    type: [],
    value: [],
    variablesReference: []
  };
}

/**
 * A namespace for VariableBodyGrid `statics`.
 */
export namespace VariablesBodyGrid {
  /**
   * Instantiation options for `VariablesBodyGrid`.
   */
  export interface IOptions {
    /**
     * The variables model.
     */
    model: VariablesModel;
    /**
     * The commands registry.
     */
    commands: CommandRegistry;
    /**
     * The optional initial scopes data.
     */
    scopes?: VariablesModel.IScope[];
  }
}

/**
 * A namespace for VariablesGrid `statics`.
 */
export namespace VariablesGrid {
  /**
   * The theme for the datagrid.
   */
  export type Theme = 'dark' | 'light';

  /**
   * Instantiation options for `VariablesGrid`.
   */
  export interface IOptions {
    /**
     * The commands registry.
     */
    commands: CommandRegistry;
  }
}

/**
 * A namespace for private data.
 */
namespace Private {
  /**
   * The dark theme for the data grid.
   */
  export const DARK_STYLE = {
    dataStyle: {
      voidColor: '#212121',
      backgroundColor: '#111111',
      headerBackgroundColor: '#424242',
      gridLineColor: 'rgba(235, 235, 235, 0.15)',
      headerGridLineColor: 'rgba(235, 235, 235, 0.25)',
      rowBackgroundColor: (i: number): string =>
        i % 2 === 0 ? '#212121' : '#111111',
      selectionFillColor: '#2196f32e'
    },
    textRender: new TextRenderer({
      font: '12px sans-serif',
      textColor: '#ffffff',
      backgroundColor: '',
      verticalAlignment: 'center',
      horizontalAlignment: 'left'
    })
  };

  /**
   * The light theme for the data grid.
   */
  export const LIGHT_STYLE = {
    dataStyle: {
      voidColor: 'white',
      backgroundColor: '#f5f5f5',
      headerBackgroundColor: '#eeeeee',
      gridLineColor: 'rgba(20, 20, 20, 0.15)',
      headerGridLineColor: 'rgba(20, 20, 20, 0.25)',
      rowBackgroundColor: (i: number): string =>
        i % 2 === 0 ? 'white' : '#f5f5f5',
      selectionFillColor: '#2196f32e'
    },
    textRender: new TextRenderer({
      font: '12px sans-serif',
      textColor: '#000000',
      backgroundColor: '',
      verticalAlignment: 'center',
      horizontalAlignment: 'left'
    })
  };

  /**
   * A custom click handler to handle clicks on the variables grid.
   */
  export class VariablesClickHandler extends BasicMouseHandler {
    /**
     * A signal emitted when the variables grid is double clicked.
     */
    get doubleClicked(): ISignal<this, DataGrid.HitTestResult> {
      return this._doubleClicked;
    }

    /**
     * Handle a mouse double-click event.
     *
     * @param grid The datagrid clicked.
     * @param event The mouse event.
     */
    onMouseDoubleClick(grid: DataGrid, event: MouseEvent): void {
      const hit = grid.hitTest(event.clientX, event.clientY);
      this._doubleClicked.emit(hit);
    }

    private _doubleClicked = new Signal<this, DataGrid.HitTestResult>(this);
  }
}
