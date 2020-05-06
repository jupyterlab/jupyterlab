// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  BasicKeyHandler,
  BasicMouseHandler,
  BasicSelectionModel,
  DataGrid,
  DataModel,
  TextRenderer
} from '@lumino/datagrid';

import { CommandIDs } from '..';

import { CommandRegistry } from '@lumino/commands';

import { IDebugger } from '../tokens';

import { Panel } from '@lumino/widgets';

import { variableIcon } from '../icons';

import { VariablesModel } from './model';

import { Theme } from '.';

/**
 * A Panel to show variables in a datagrid.
 */
export class VariablesBodyGrid extends Panel {
  /**
   * Instantiate a new VariablesBodyGrid.
   * @param options The instantiation options for a VariablesBodyGrid.
   */
  constructor(options: VariablesBodyGrid.IOptions) {
    super();
    const { model, commands } = options;
    this._grid = new VariablesGrid({ commands });
    this._model = model;
    const updated = (model: VariablesModel) => {
      this._grid.dataModel.setData(model.scopes);
    };
    this._model.changed.connect(updated, this);
    this.node.style.height = '100%';
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
  set theme(theme: Theme) {
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
   * @param options The instantiation options for a VariablesGrid.
   */
  constructor(options: VariablesGrid.IOptions) {
    super();
    const { commands } = options;
    const dataModel = new VariableDataGridModel();
    const grid = new DataGrid();
    grid.dataModel = dataModel;
    grid.keyHandler = new BasicKeyHandler();
    grid.mouseHandler = new BasicMouseHandler();
    grid.selectionModel = new BasicSelectionModel({
      dataModel,
      selectionMode: 'row'
    });
    grid.selectionModel.changed.connect(slot =>
      commands.execute(CommandIDs.variableDetails, {
        variableReference: dataModel.getVariableReference(slot.cursorRow),
        title: dataModel.getVariableName(slot.cursorRow)
      })
    );
    grid.stretchLastColumn = true;
    grid.node.style.height = '100%';
    this.node.style.height = '90%';
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
  set theme(theme: Theme) {
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
 * A widget to display details for a variable.
 */
export class VariableDetailsGrid extends Panel {
  /**
   * Instantiate a new Body for the datagrid of the selected variable.
   * @param options The instantiation options for VariableDetailsGrid.
   */
  constructor(options: VariablesDetails.IOptions) {
    super();
    const { details, commands, model, service, title } = options;
    model.changed.connect(this.dispose, this);

    this.title.icon = variableIcon;
    this.title.label = `${service.session?.connection?.name} - details of ${title}`;
    this._grid = new VariablesGrid({ commands });
    const detailsScope = {
      name: title,
      variables: details
    };
    this._grid.dataModel.setData([detailsScope]);
    this.node.style.height = '90%';

    this.addWidget(this._grid);
    this.addClass('jp-DebuggerVariableDetails');
  }

  /**
   * Set the theme used in JupyterLab.
   *
   * @param theme The theme for the datagrid.
   */
  set theme(theme: Theme) {
    this._grid.theme = theme;
  }

  private _grid: VariablesGrid;
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
      return column === 1 ? `Value` : `Type`;
    }
    if (region === 'corner-header') {
      return `Name`;
    }

    return column === 1 ? this._data.value[row] : this._data.type[row];
  }

  /**
   * Get the variable reference for a given row
   *
   * @param row The row in the datagrid.
   */
  getVariableReference(row: number) {
    return this._data.variablesReference[row];
  }

  /**
   * Get the variable name for a given row
   *
   * @param row The row in the datagrid.
   */
  getVariableName(row: number) {
    return this._data.name[row];
  }

  /**
   * Set the datagrid model data from the variable scopes.
   *
   * @param scopes The scopes.
   */
  setData(scopes: VariablesModel.IScope[]) {
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
  private _clearData() {
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
 * A namespace for VariablesDetails `statics`.
 */
namespace VariablesDetails {
  /**
   * Instantiation options for `VariablesDetails`.
   */
  export interface IOptions {
    /**
     * The variables model.
     */
    model: VariablesModel;
    /**
     * The details of the selected variable.
     */
    details: VariablesModel.IVariable[];
    /**
     * The debugger service.
     */
    service: IDebugger;
    /**
     * The commands registry.
     */
    commands: CommandRegistry;
    /**
     * The name of the selected variable.
     */
    title: string;
  }
}

/**
 * A namespace for DataGridTable `statics`.
 */
namespace VariablesBodyGrid {
  /**
   * Instantiation options for `DataGridTable`.
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
  }
}

/**
 * A namespace for DataGridTable `statics`.
 */
namespace VariablesGrid {
  /**
   * Instantiation options for `DataGridTable`.
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
      gridLineColor: '#424242',
      backgroundColor: '#212121',
      headerGridLineColor: '#424242',
      headerBackgroundColor: '#616161',
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
      voidColor: '#ffffff',
      gridLineColor: '#bdbdbd',
      backgroundColor: '#ffffff',
      headerGridLineColor: '#bdbdbd',
      headerBackgroundColor: '#d2d2d2',
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
}
