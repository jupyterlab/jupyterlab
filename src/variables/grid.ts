// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  BasicKeyHandler,
  BasicMouseHandler,
  BasicSelectionModel,
  DataGrid,
  DataModel
} from '@lumino/datagrid';

import { CommandRegistry } from '@lumino/commands';

import { Panel } from '@lumino/widgets';

import { VariablesModel } from './model';

export class DataGridTable extends Panel {
  constructor(options: DataGridTable.IOptions) {
    super();
    const grid = new DataGrid();
    const dataModel = new VariableDataModel(options.model);
    grid.dataModel = dataModel;
    grid.keyHandler = new BasicKeyHandler();
    grid.mouseHandler = new BasicMouseHandler();
    grid.selectionModel = new BasicSelectionModel({ dataModel });
    grid.stretchLastColumn = true;
    this.node.style.height = '100%';
    grid.node.style.height = '100%';
    this._grid = grid;
    this.addWidget(grid);
    this.addClass('jp-DebuggerVariables-body');
  }

  /**
   * Set the variable filter list.
   */
  set filter(filter: Set<string>) {
    (this._grid.dataModel as VariableDataModel).filter = filter;
    this.update();
  }

  private _grid: DataGrid;
}

/**
 * A namespace for DataGridTable `statics`.
 */
namespace DataGridTable {
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

export class VariableDataModel extends DataModel {
  constructor(model: VariablesModel) {
    super();
    this._model = model;
    const updated = (model: VariablesModel) => {
      this.setData(model.scopes);
    };

    model.changed.connect(updated, this);
  }

  set filter(filter: Set<string>) {
    this._filter = filter;
    this.setData(this._model.scopes);
  }

  rowCount(region: DataModel.RowRegion): number {
    return region === 'body' ? this._data.name.length : 1;
  }

  columnCount(region: DataModel.ColumnRegion): number {
    return region === 'body' ? 2 : 1;
  }

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

  private setData(scopes: VariablesModel.IScope[]) {
    if (!scopes || scopes.length === 0) {
      this.clearData();
      this.emitChanged({
        type: 'model-reset',
        region: 'body',
        index: 1,
        span: 1
      });
      return;
    }
    scopes.forEach(scope => {
      let index = 0;
      scope.variables.forEach(variable => {
        if (!this._filter.has(variable.evaluateName)) {
          console.log(variable);
          this._data.name[index] = variable.name;
          this._data.type[index] = variable.type;
          this._data.value[index] = variable.value;
          this.emitChanged({
            type: 'rows-inserted',
            region: 'body',
            index: 1,
            span: 1
          });
          ++index;
        }
      });
    });
  }

  private clearData() {
    this._data = {
      name: [],
      type: [],
      value: []
    };
  }

  private _filter = new Set<string>();
  private _model: VariablesModel;
  private _data: { name: string[]; type: string[]; value: string[] } = {
    name: [],
    type: [],
    value: []
  };
}
