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

import { IThemeManager } from '@jupyterlab/apputils';
import {
  ITranslator,
  nullTranslator,
  TranslationBundle
} from '@jupyterlab/translation';

import { IDebugger } from '../../tokens';
import { Debugger } from '../../';

/**
 * A class wrapping the underlying variables datagrid.
 */
export class Grid extends Panel {
  /**
   * Instantiate a new VariablesGrid.
   *
   * @param options The instantiation options for a VariablesGrid.
   */
  constructor(options: Grid.IOptions) {
    super();
    const { commands, model, themeManager } = options;
    this.model = model;
    const dataModel = new GridModel(options.translator);
    const grid = new DataGrid();
    const mouseHandler = new Private.MouseHandler();
    mouseHandler.doubleClicked.connect((_, hit) =>
      commands.execute(Debugger.CommandIDs.inspectVariable, {
        variableReference: dataModel.getVariableReference(hit.row),
        name: dataModel.getVariableName(hit.row)
      })
    );
    mouseHandler.selected.connect((_, hit) => {
      const { row } = hit;
      this.model.selectedVariable = {
        name: dataModel.getVariableName(row),
        value: dataModel.data('body', row, 1),
        type: dataModel.data('body', row, 2),
        variablesReference: dataModel.getVariableReference(row)
      };
    });
    grid.dataModel = dataModel;
    grid.keyHandler = new BasicKeyHandler();
    grid.mouseHandler = mouseHandler;
    grid.selectionModel = new BasicSelectionModel({
      dataModel
    });
    grid.stretchLastColumn = true;
    grid.node.style.height = '100%';
    this._grid = grid;

    // Compute the grid's styles based on the current theme.
    if (themeManager) {
      themeManager.themeChanged.connect(this._updateStyles, this);
    }
    this.addWidget(grid);
  }

  /**
   * Set the variable filter list.
   *
   * @param filter The variable filter to apply.
   */
  set filter(filter: Set<string>) {
    (this._grid.dataModel as GridModel).filter = filter;
    this.update();
  }

  /**
   * Set the scope for the variables data model.
   *
   * @param scope The scopes for the variables
   */
  set scope(scope: string) {
    (this._grid.dataModel as GridModel).scope = scope;
    this.update();
  }

  /**
   * Get the data model for the data grid.
   */
  get dataModel(): GridModel {
    return this._grid.dataModel as GridModel;
  }

  /**
   * Handle `after-attach` messages.
   *
   * @param message - The `after-attach` message.
   */
  protected onAfterAttach(message: any): void {
    super.onAfterAttach(message);
    this._updateStyles();
  }

  /**
   * Update the computed style for the data grid on theme change.
   */
  private _updateStyles(): void {
    const { style, textRenderer } = Private.computeStyle();
    this._grid.cellRenderers.update({}, textRenderer);
    this._grid.style = style;
  }

  private _grid: DataGrid;
  protected model: IDebugger.Model.IVariables;
}

/**
 * A namespace for VariablesGrid `statics`.
 */
namespace Grid {
  /**
   * Instantiation options for `VariablesGrid`.
   */
  export interface IOptions {
    /**
     * The commands registry.
     */
    commands: CommandRegistry;

    /**
     * The variables model.
     */
    model: IDebugger.Model.IVariables;

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
 * A data grid model for variables.
 */
export class GridModel extends DataModel {
  /**
   * Create grid model
   * @param translator optional translator
   */
  constructor(translator?: ITranslator) {
    super();
    this._trans = (translator || nullTranslator).load('jupyterlab');
  }

  /**
   * The variable filter list.
   */
  get filter(): Set<string> {
    return this._filter;
  }
  set filter(filter: Set<string>) {
    this._filter = filter;
  }

  /**
   * The current scope for the variables.
   */
  get scope(): string {
    return this._scope;
  }
  set scope(scope: string) {
    this._scope = scope;
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
      return column === 1 ? this._trans.__('Value') : this._trans.__('Type');
    }
    if (region === 'corner-header') {
      return this._trans.__('Name');
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
   * Set the datagrid model data from the list of variables.
   *
   * @param scopes The list of variables.
   */
  setData(scopes: IDebugger.IScope[]): void {
    this._clearData();
    this.emitChanged({
      type: 'model-reset'
    });
    const scope = scopes.find(scope => scope.name === this._scope) ?? scopes[0];
    const variables = scope?.variables ?? [];
    const filtered = variables.filter(
      variable => variable.name && !this._filter.has(variable.name)
    );
    filtered.forEach((variable, index) => {
      this._data.name[index] = variable.name;
      this._data.type[index] = variable.type ?? '';
      this._data.value[index] = variable.value;
      this._data.variablesReference[index] = variable.variablesReference;
    });
    this.emitChanged({
      type: 'rows-inserted',
      region: 'body',
      index: 1,
      span: filtered.length
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
  private _scope = '';
  private _trans: TranslationBundle;
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
 * A namespace for private data.
 */
namespace Private {
  /**
   * Create a color palette element.
   */
  function createPalette(): HTMLDivElement {
    const div = document.createElement('div');
    div.className = 'jp-DebuggerVariables-colorPalette';
    div.innerHTML = `
        <div class="jp-mod-void"></div>
        <div class="jp-mod-background"></div>
        <div class="jp-mod-header-background"></div>
        <div class="jp-mod-grid-line"></div>
        <div class="jp-mod-header-grid-line"></div>
        <div class="jp-mod-selection"></div>
        <div class="jp-mod-text"></div>
      `;
    return div;
  }

  /**
   * Compute the style and renderer for a data grid.
   */
  export function computeStyle(): {
    style: DataGrid.Style;
    textRenderer: TextRenderer;
  } {
    const palette = createPalette();
    document.body.appendChild(palette);
    let node: HTMLDivElement | null;
    node = palette.querySelector('.jp-mod-void');
    const voidColor = getComputedStyle(node!).color;
    node = palette.querySelector('.jp-mod-background');
    const backgroundColor = getComputedStyle(node!).color;
    node = palette.querySelector('.jp-mod-header-background');
    const headerBackgroundColor = getComputedStyle(node!).color;
    node = palette.querySelector('.jp-mod-grid-line');
    const gridLineColor = getComputedStyle(node!).color;
    node = palette.querySelector('.jp-mod-header-grid-line');
    const headerGridLineColor = getComputedStyle(node!).color;
    node = palette.querySelector('.jp-mod-selection');
    const selectionFillColor = getComputedStyle(node!).color;
    node = palette.querySelector('.jp-mod-text');
    const textColor = getComputedStyle(node!).color;
    document.body.removeChild(palette);
    return {
      style: {
        voidColor,
        backgroundColor,
        headerBackgroundColor,
        gridLineColor,
        headerGridLineColor,
        rowBackgroundColor: (i: number): string =>
          i % 2 === 0 ? voidColor : backgroundColor,
        selectionFillColor
      },
      textRenderer: new TextRenderer({
        font: '12px sans-serif',
        textColor,
        backgroundColor: '',
        verticalAlignment: 'center',
        horizontalAlignment: 'left'
      })
    };
  }

  /**
   * A custom click handler to handle clicks on the variables grid.
   */
  export class MouseHandler extends BasicMouseHandler {
    /**
     * A signal emitted when the variables grid is double clicked.
     */
    get doubleClicked(): ISignal<this, DataGrid.HitTestResult> {
      return this._doubleClicked;
    }

    /**
     * A signal emitted when the variables grid received mouse down or context menu event.
     */
    get selected(): ISignal<this, DataGrid.HitTestResult> {
      return this._selected;
    }

    /**
     * Dispose of the resources held by the mouse handler.
     */
    dispose(): void {
      if (this.isDisposed) {
        return;
      }

      Signal.disconnectSender(this);

      super.dispose();
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

    /**
     * Handle the mouse down event for the data grid.
     *
     * @param grid - The data grid of interest.
     *
     * @param event - The mouse down event of interest.
     */
    onMouseDown(grid: DataGrid, event: MouseEvent): void {
      // Unpack the event.
      let { clientX, clientY } = event;

      // Hit test the grid.
      let hit = grid.hitTest(clientX, clientY);

      this._selected.emit(hit);

      // Propagate event to Lumino DataGrid BasicMouseHandler.
      super.onMouseDown(grid, event);
    }

    /**
     * Handle the context menu event for the data grid.
     *
     * @param grid - The data grid of interest.
     *
     * @param event - The context menu event of interest.
     */
    onContextMenu(grid: DataGrid, event: MouseEvent): void {
      // Unpack the event.
      let { clientX, clientY } = event;

      // Hit test the grid.
      let hit = grid.hitTest(clientX, clientY);

      this._selected.emit(hit);
    }

    private _doubleClicked = new Signal<this, DataGrid.HitTestResult>(this);
    private _selected = new Signal<this, DataGrid.HitTestResult>(this);
  }
}
