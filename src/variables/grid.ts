// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  BasicKeyHandler,
  BasicMouseHandler,
  BasicSelectionModel,
  DataGrid,
  DataModel,
  SelectionModel,
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
 * A Panel to show variables as Table by DataGrid.
 */
export class VariablesBodyGrid extends Panel {
  /**
   * Instantiate a new VariablesBodyGrid.
   * @param options The instantiation options for a VariablesBodyGrid.
   */
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

  /**
   * Set the theme used in JupyterLab.
   */
  set theme(theme: Theme) {
    this._grid.theme = theme;
  }

  private _grid: VariableGrid;
  private _model: VariablesModel;
}

/**
 * A class representing variable grid in JupyterLab-Debugger.
 */
export class VariableGrid extends Panel {
  /**
   * Instantiate a new VariableGrid.
   * @param options The instantiation options for a VariableGrid.
   */
  constructor(options: VariableGrid.IOptions) {
    super();
    const grid = new DataGrid();
    const { commands } = options;
    const dataModel = new VariableDataGridModel({ commands });
    grid.dataModel = dataModel;
    grid.keyHandler = new BasicKeyHandler();
    grid.mouseHandler = new BasicMouseHandler();
    grid.selectionModel = new VariableSelection({
      dataModel,
      selectionMode: 'row'
    });
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

  /**
   * Set the theme used in JupyterLab.
   */
  set theme(theme: Theme) {
    const { dataStyle, textRender } =
      theme === 'dark' ? Private.DARK_STYLE : Private.LIGHT_STYLE;
    this._grid.cellRenderers.update({}, textRender);
    this._grid.style = dataStyle;
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
   * Instantiate a new Body for the detail dataGrid of the selected variable.
   * @param options The instantiation options for VariableDetailsGrid.
   */
  constructor(options: VariablesDetails.IOptions) {
    super();
    const { details, commands, model, service, title } = options;

    this.title.icon = variableIcon;
    this.title.label = `${service.session?.connection?.name} - details of ${title}`;
    this._grid = new VariableGrid({ commands });
    const detailsScope = {
      name: title,
      variables: details
    };
    this._grid.dataModel.setData([detailsScope]);
    this.node.style.height = '90%';
    model.changed.connect(this._onModelChanged, this);

    this.addWidget(this._grid);
    this.addClass('jp-DebuggerVariableDetails');
  }

  /**
   * Set the theme used in JupyterLab.
   */
  set theme(theme: Theme) {
    this._grid.theme = theme;
  }

  private _onModelChanged() {
    this.dispose();
  }

  private _grid: VariableGrid;
}

/**
 * A DataGrid model for Variables.
 */
export class VariableDataGridModel extends DataModel {
  /**
   * Instantiate a new VariableDataGridModel.
   * @param options The instantiation options for a VariableDataGridModel.
   */
  constructor(options: VariableDataGridModel.IOptions) {
    super();
    this._commands = options.commands;
  }

  /**
   * Set the variable filter list.
   */
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

  /**
   * Get from row dataGrid variable reference
   * @param row row number of variable
   */
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

  /**
   * Set data from scopes for DataGrid Model
   * @param scopes array of scope's variables
   */
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

/**
 * A DataGrid model selection for Variables.
 */
export class VariableSelection extends BasicSelectionModel {
  /**
   * Instantiate a new VariableSelection.
   * @param options The instantiation options for a VariableSelection.
   */
  constructor(options: VariableSelection.IOptions) {
    super(options);
    this.changed.connect(slot =>
      options.dataModel.getVariableReference(slot.cursorRow)
    );
  }
}

/**
 * A namespace for VariableSelection `statics`.
 */
export namespace VariableSelection {
  /**
   * Instantiation options for `VariableSelection`.
   */
  export interface IOptions extends SelectionModel.IOptions {
    /**
     * The variable dataGrid model.
     */
    dataModel: VariableDataGridModel;
  }
}

/**
 * A namespace for VariableDataGridModel `statics`.
 */
export namespace VariableDataGridModel {
  /**
   * Instantiation options for `VariableDataGridModel`.
   */
  export interface IOptions extends DataGrid.IOptions {
    /**
     * The commands registry.
     */
    commands: CommandRegistry;
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

namespace Private {
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
