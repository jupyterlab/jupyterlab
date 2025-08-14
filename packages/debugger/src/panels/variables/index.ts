// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { IThemeManager } from '@jupyterlab/apputils';
import { ITranslator, nullTranslator } from '@jupyterlab/translation';
import {
  PanelWithToolbar,
  tableRowsIcon,
  ToolbarButton,
  treeViewIcon
} from '@jupyterlab/ui-components';
import { CommandRegistry } from '@lumino/commands';
import { Panel, Widget } from '@lumino/widgets';
import { IDebugger } from '../../tokens';
import { VariablesBodyGrid } from './grid';
import { ScopeSwitcher } from './scope';
import { VariablesBodyTree } from './tree';

/**
 * A Panel to show a variable explorer.
 */
export class Variables extends PanelWithToolbar {
  /**
   * Instantiate a new Variables Panel.
   *
   * @param options The instantiation options for a Variables Panel.
   */
  constructor(options: Variables.IOptions) {
    super(options);
    const { model, service, commands, themeManager } = options;
    const translator = options.translator || nullTranslator;
    const trans = translator.load('jupyterlab');
    this.title.label = trans.__('Variables');
    this.toolbar.addClass('jp-DebuggerVariables-toolbar');
    this.toolbar.node.setAttribute('aria-label', trans.__('Variables toolbar'));
    this._tree = new VariablesBodyTree({
      model,
      service,
      commands,
      translator
    });
    this._table = new VariablesBodyGrid({
      model,
      commands,
      themeManager,
      translator
    });
    this._table.hide();

    this.toolbar.addItem(
      'scope-switcher',
      new ScopeSwitcher({
        translator,
        model,
        tree: this._tree,
        grid: this._table
      })
    );

    const onViewChange = (): void => {
      if (this._table.isHidden) {
        this._tree.hide();
        this._table.show();
        this.node.setAttribute('data-jp-table', 'true');
        markViewButtonSelection('table');
      } else {
        this._tree.show();
        this._table.hide();
        this.node.removeAttribute('data-jp-table');
        markViewButtonSelection('tree');
      }
      this.update();
    };

    const treeViewButton = new ToolbarButton({
      icon: treeViewIcon,
      className: 'jp-TreeView-Button',
      onClick: onViewChange,
      tooltip: trans.__('Tree View')
    });

    const tableViewButton = new ToolbarButton({
      icon: tableRowsIcon,
      className: 'jp-TableView-Button',
      onClick: onViewChange,
      tooltip: trans.__('Table View')
    });

    const markViewButtonSelection = (selectedView: string): void => {
      tableViewButton.pressed = selectedView !== 'tree';
      treeViewButton.pressed = !tableViewButton.pressed;
    };

    markViewButtonSelection(this._table.isHidden ? 'tree' : 'table');

    this.toolbar.addItem('view-VariableTreeView', treeViewButton);

    this.toolbar.addItem('view-VariableTableView', tableViewButton);

    this.addWidget(this._tree);
    this.addWidget(this._table);
    this.addClass('jp-DebuggerVariables');
  }

  /**
   * Set the variable filter for both the tree and table views.
   */
  set filter(filter: Set<string>) {
    this._tree.filter = filter;
    this._table.filter = filter;
  }

  /**
   * A message handler invoked on a `'resize'` message.
   *
   * @param msg The Lumino message to process.
   */
  protected onResize(msg: Widget.ResizeMessage): void {
    super.onResize(msg);
    this._resizeBody(msg);
  }

  /**
   * Resize the body.
   *
   * @param msg The resize message.
   */
  private _resizeBody(msg: Widget.ResizeMessage): void {
    const height = msg.height - this.toolbar.node.offsetHeight;
    this._tree.node.style.height = `${height}px`;
  }

  private _tree: VariablesBodyTree;
  private _table: VariablesBodyGrid;
}

/**
 * Convert a variable to a primitive type.
 *
 * @param variable The variable.
 */
export const convertType = (variable: IDebugger.IVariable): string | number => {
  const { type, value } = variable;
  switch (type) {
    case 'int':
      return parseInt(value, 10);
    case 'float':
      return parseFloat(value);
    case 'bool':
      return value;
    case 'str':
      if (variable.presentationHint?.attributes?.includes('rawString')) {
        return value.slice(1, value.length - 1);
      } else {
        return value;
      }
    default:
      return type ?? value;
  }
};

/**
 * A namespace for Variables `statics`.
 */
export namespace Variables {
  /**
   * Instantiation options for `Variables`.
   */
  export interface IOptions extends Panel.IOptions {
    /**
     * The variables model.
     */
    model: IDebugger.Model.IVariables;
    /**
     * The debugger service.
     */
    service: IDebugger;
    /**
     * The commands registry.
     */
    commands: CommandRegistry;

    /**
     * An optional application theme manager to detect theme changes.
     */
    themeManager?: IThemeManager | null;

    /**
     * The application language translator
     */
    translator?: ITranslator;
  }
}
