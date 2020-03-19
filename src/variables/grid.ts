// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  BasicKeyHandler,
  BasicMouseHandler,
  BasicSelectionModel,
  DataGrid,
  DataModel,
  SelectionModel
} from '@lumino/datagrid';

import { CommandRegistry } from '@lumino/commands';

import { Panel } from '@lumino/widgets';

import { variableIcon } from '../icons';

import { VariablesModel } from './model';

import { CommandIDs } from '..';

import { IDebugger } from '../tokens';

export class VariablesBodyGrid extends Panel {
  constructor(options: VariablesBodyGrid.IOptions) {
    super();
    this.node.style.height = '100%';
    const { model, commands } = options;
    this._grid = new VariableGrid({ commands });
    this._model = model;
    const updated = (model: VariablesModel) => {
      this._grid.dataModel.setData(model.scopes);
    };

    this._model.changed.connect(updated, this);
    this.addWidget(this._grid);
    this.addClass('jp-DebuggerVariables-body');
  }

  /**
   * Set the variable filter list.
   */
  set filter(filter: Set<string>) {
    (this._grid.dataModel as VariableDataGridModel).filter = filter;
    this._grid.dataModel.setData(this._model.scopes);
  }

  private _grid: VariableGrid;
  private _model: VariablesModel;
}

export class VariableGrid extends Panel {
  constructor(options: VariableGrid.IOptions) {
    super();
    const grid = new DataGrid();
    const { commands } = options;
    const dataModel = new VariableDataGridModel(commands);
    grid.dataModel = dataModel;
    grid.keyHandler = new BasicKeyHandler();
    grid.mouseHandler = new BasicMouseHandler();
    grid.selectionModel = new VariableSelection({ dataModel });
    grid.stretchLastColumn = true;
    grid.node.style.height = '100%';
    this.node.style.height = '90%';
    this._grid = grid;
    this.addWidget(grid);
  }

  /**
   * Set the variable filter list.
   */
  set filter(filter: Set<string>) {
    (this._grid.dataModel as VariableDataGridModel).filter = filter;
    this.update();
  }

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
   * Instantiate a new Body for the detail table of the selected variable.
   * @param options The instantiation options for VariableDetails.
   */
  constructor(options: VariablesDetails.IOptions) {
    super();
    const { details, commands, model, service, title } = options;

    this.title.icon = variableIcon;
    this.title.label = `${service.session?.connection?.name} - details of ${title}`;
    this._grid = new VariableGrid({ commands });
    const detailsScope = {
      name: 'TEst',
      variables: details
    };
    this._grid.dataModel.setData([detailsScope]);
    this.node.style.height = '90%';
    model.changed.connect(this._onModelChanged, this);

    this.addWidget(this._grid);
    this.addClass('jp-DebuggerVariableDetails');
  }

  /**
   * Handle when the debug model changes.
   */
  private _onModelChanged() {
    this.dispose();
  }

  private _grid: VariableGrid;
}

export class VariableDataGridModel extends DataModel {
  constructor(commands: CommandRegistry) {
    super();
    this._commands = commands;
  }

  set filter(filter: Set<string>) {
    this._filter = filter;
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

  async getVariableReference(row: number) {
    const variablesReference = this._data.variablesReference[row];
    const name = this._data.name[row];
    if (!variablesReference) {
      return;
    }

    await this._commands.execute(CommandIDs.variableDetails, {
      variableReference: variablesReference,
      title: name
    });
  }

  setData(scopes: VariablesModel.IScope[]) {
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
          this._data.name[index] = variable.evaluateName;
          this._data.type[index] = variable.type;
          this._data.value[index] = variable.value;
          this._data.variablesReference[index] = variable.variablesReference;
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
      value: [],
      variablesReference: []
    };
  }

  private _commands: CommandRegistry;
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

export class VariableSelection extends BasicSelectionModel {
  constructor(options: VariableSelection.IOptions) {
    super(options);
    this.changed.connect(slot =>
      options.dataModel.getVariableReference(slot.cursorRow)
    );
  }
}

export namespace VariableSelection {
  export interface IOptions extends SelectionModel.IOptions {
    dataModel: VariableDataGridModel;
  }
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
namespace VariableGrid {
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
