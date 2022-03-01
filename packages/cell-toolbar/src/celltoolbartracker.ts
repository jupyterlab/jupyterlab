import { Cell, ICellModel } from '@jupyterlab/cells';
import { DocumentRegistry } from '@jupyterlab/docregistry';
import { Notebook, NotebookPanel } from '@jupyterlab/notebook';
import {
  IObservableList,
  IObservableUndoableList,
} from '@jupyterlab/observables';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { LabIcon } from '@jupyterlab/ui-components';
import { each } from '@lumino/algorithm';
import { CommandRegistry } from '@lumino/commands';
import { IDisposable } from '@lumino/disposable';
import { PanelLayout, Widget } from '@lumino/widgets';
import { CellToolbarWidget } from './celltoolbarwidget';
import { PositionedButton } from './positionedbutton';
import { EXTENSION_ID, ICellMenuItem } from './tokens';

// icon svg import statements
import addAboveSvg from '../style/icons/addabove.svg';
import addBelowSvg from '../style/icons/addbelow.svg';
import deleteSvg from '../style/icons/delete.svg';
import moveDownSvg from '../style/icons/movedown.svg';
import moveUpSvg from '../style/icons/moveup.svg';

const DEFAULT_LEFT_MENU: ICellMenuItem[] = [
];

const DEFAULT_HELPER_BUTTONS: ICellMenuItem[] = [
];

/**
 * Widget cell toolbar class
 */
const CELL_BAR_CLASS = 'jp-cell-bar';

/**
 * Icons for use in toolbar.
 * 
 * These are copied from icon.ts, which is not part of the webpack bundle
 * because nothing is imported from it.
 */
export const addAboveIcon = new LabIcon({
  name: `${EXTENSION_ID}:add-above`,
  svgstr: addAboveSvg
});
export const addBelowIcon = new LabIcon({
  name: `${EXTENSION_ID}:add-below`,
  svgstr: addBelowSvg
});
export const deleteIcon = new LabIcon({
  name: `${EXTENSION_ID}:delete`,
  svgstr: deleteSvg
});
export const moveDownIcon = new LabIcon({
  name: `${EXTENSION_ID}:move-down`,
  svgstr: moveDownSvg
});
export const moveUpIcon = new LabIcon({
  name: `${EXTENSION_ID}:move-up`,
  svgstr: moveUpSvg
});

/**
 * Watch a notebook so that a cell toolbar appears on the active cell
 */
export class CellToolbarTracker implements IDisposable {
  constructor(
    panel: NotebookPanel,
    commands: CommandRegistry,
    settings: ISettingRegistry.ISettings | null
  ) {
    this._commands = commands;
    this._panel = panel;
    this._settings = settings;
    this._previousActiveCell = this._panel.content.activeCell;

    if (this._settings) {
      this._onSettingsChanged();
      this._settings.changed.connect(this._onSettingsChanged, this);
    }

    const notebookModel = this._panel.context.model;
    const cells = notebookModel.cells;
    cells.changed.connect(this.updateConnectedCells, this);

    this._onActiveCellChanged(this._panel.content);
    panel.content.activeCellChanged.connect(this._onActiveCellChanged, this);
  }

  _onActiveCellChanged(notebook: Notebook): void {
    const activeCell = notebook.activeCell;
    if (!activeCell) {
      return;
    }

    if (this._previousActiveCell !== null && this._previousActiveCell !== undefined) {
      this._removeToolbar(this._previousActiveCell.model);
    }
    this._addToolbar(activeCell.model);
    this._previousActiveCell = activeCell;

    this._updateCellForToolbarOverlap(activeCell.node);
  }

  get isDisposed(): boolean {
    return this._isDisposed;
  }

  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this._isDisposed = true;

    if (this._settings) {
      this._settings.changed.disconnect(this._onSettingsChanged, this);
    }

    const cells = this._panel?.context.model.cells;
    if (cells) {
      cells.changed.disconnect(this.updateConnectedCells, this);
      each(cells.iter(), model => this._removeToolbar(model));
    }

    this._panel = null;
  }

  /**
   * Callback to react to cells list changes
   *
   * @param cells List of notebook cells
   * @param changed Modification of the list
   */
  updateConnectedCells(
    cells: IObservableUndoableList<ICellModel>,
    changed: IObservableList.IChangedArgs<ICellModel>
  ): void {
    const activeCell: Cell<ICellModel> | null | undefined = this._panel?.content.activeCell;
    if (activeCell === null || activeCell === undefined) {
      return;
    }

    if (changed.oldValues.find((m) => m === activeCell.model)) {
      this._removeToolbar(activeCell.model);
      this._addToolbar(activeCell.model);
    }
  }

  private _addToolbar(model: ICellModel): void {
    const cell = this._getCell(model);

    if (cell) {
      const {
        helperButtons,
        leftMenu,
      } = (this._settings?.composite as any) ?? {};

      const helperButtons_ =
        helperButtons === null
          ? []
          : helperButtons ??
            DEFAULT_HELPER_BUTTONS.map(entry => entry.command.split(':')[1]);
      const leftMenu_ = leftMenu === null ? [] : leftMenu ?? DEFAULT_LEFT_MENU;

      const toolbar = new CellToolbarWidget(
        this._commands,
        leftMenu_,
      );
      toolbar.addClass(CELL_BAR_CLASS);
      (cell.layout as PanelLayout).insertWidget(0, toolbar);

      // For rendered markdown, watch for resize events.
      cell.node.addEventListener('resize', this._resizeEventCallback);

      // Watch for changes in the code editor.
      cell.model.contentChanged.connect(this._changedEventCallback, this);

      DEFAULT_HELPER_BUTTONS.filter(entry =>
        (helperButtons_ as string[]).includes(entry.command.split(':')[1])
      ).forEach(entry => {
        if (this._commands.hasCommand(entry.command)) {
          const { cellType, command, tooltip, ...others } = entry;
          const shortName = command.split(':')[1];
          const button = new PositionedButton({
            ...others,
            callback: (): void => {
              this._commands.execute(command);
            },
            className: shortName && `jp-cell-${shortName}`,
            tooltip: tooltip || this._commands.label(entry.command)
          });
          button.addClass(CELL_BAR_CLASS);
          button.addClass(`jp-cell-${cellType || 'all'}`);
          (cell.layout as PanelLayout).addWidget(button);
        }
      });
    }
  }

  private _getCell(model: ICellModel): Cell | undefined {
    return this._panel?.content.widgets.find(widget => widget.model === model);
  }

  private _findToolbarWidgets(cell: Cell): Widget[] {
    const widgets = (cell.layout as PanelLayout).widgets;

    // Search for header using the CSS class or use the first one if not found.
    return widgets.filter(widget => widget.hasClass(CELL_BAR_CLASS)) || [];
  }

  private _removeToolbar(model: ICellModel): void {
    const cell = this._getCell(model);
    if (cell) {
      this._findToolbarWidgets(cell).forEach(widget => widget.dispose());
      // Attempt to remove the resize and changed event handlers.
      cell.node.removeEventListener('resize', this._resizeEventCallback);
      cell.model.contentChanged.disconnect(this._changedEventCallback, this);
    }
  }

  /**
   * Call back on settings changes
   */
  private _onSettingsChanged(): void {
    // Reset toolbar when settings changes
    const activeCell: Cell<ICellModel> | null | undefined = this._panel?.content.activeCell;
    if (activeCell) {
        this._removeToolbar(activeCell.model);
        this._addToolbar(activeCell.model);
    }
  }

  private _changedEventCallback(): void {
    const activeCell = this._panel?.content.activeCell;
    if (activeCell === null || activeCell === undefined) {
      return;
    }

    this._updateCellForToolbarOverlap(activeCell.node);
  }

  private _resizeEventCallback(event: UIEvent): void {
    const activeCell = this._panel?.content.activeCell;
    if (activeCell === null || activeCell === undefined) {
      return;
    }

    this._updateCellForToolbarOverlap(activeCell.node);
  }

  private _updateCellForToolbarOverlap(activeCellElement: HTMLElement) {
    // Remove the "toolbar overlap" class from the cell, rendering the cell's toolbar
    activeCellElement.classList.remove('jp-toolbar-overlap');
  
    let cellContentOverlapsToolbar: boolean = false;
  
    if (activeCellElement.classList.contains("jp-mod-rendered")) {
      // Check for overlap in rendered markdown content
      cellContentOverlapsToolbar = this._markdownOverlapsToolbar(activeCellElement);
    }
    else {
    // Check for overlap in code content
      cellContentOverlapsToolbar = this._codeOverlapsToolbar(activeCellElement);
    }
  
    if (cellContentOverlapsToolbar) {
      // Add the "toolbar overlap" class to the cell, completely concealing the toolbar,
      // if the first line of the content overlaps with it at all
      activeCellElement.classList.add('jp-toolbar-overlap');
    }
  }
  
  private _markdownOverlapsToolbar(activeCellElement: HTMLElement): boolean {
    const markdownOutputElements = activeCellElement.getElementsByClassName("jp-MarkdownOutput");
    if (markdownOutputElements.length < 1) {
      return false;
    }
  
    const firstOutputElementChild = markdownOutputElements[0].firstElementChild as HTMLElement;
    if (firstOutputElementChild === null) {
      return false;
    }
  
    // Temporarily set the element's max width so that the bounding client rectangle only encompasses the content.
    const oldMaxWidth = firstOutputElementChild.style.maxWidth;
    firstOutputElementChild.style.maxWidth = 'max-content';
  
    const lineRight = firstOutputElementChild.getBoundingClientRect().right;
  
    // Reinstate the old max width.
    firstOutputElementChild.style.maxWidth = oldMaxWidth;
  
    const toolbarLeft = this._cellToolbarLeft(activeCellElement);
  
    return toolbarLeft === null ? false : lineRight > toolbarLeft;
  }
  
  private _codeOverlapsToolbar(activeCellElement: HTMLElement): boolean {
    const lineRight = activeCellElement
      .getElementsByClassName('jp-InputArea-editor')[0]
      .getElementsByClassName('CodeMirror-line')[0].children[0] // First span under first pre
      .getBoundingClientRect().right;
  
    const toolbarLeft = this._cellToolbarLeft(activeCellElement);
  
    return toolbarLeft === null ? false : lineRight > toolbarLeft;
  }
  
  private _cellToolbarLeft(activeCellElement: HTMLElement): number | null {
    const activeCellToolbar = activeCellElement.querySelector('.jp-cell-bar');
    
    if (activeCellToolbar === null || activeCellToolbar === undefined) { 
      return null;
    }
  
    return activeCellToolbar.getBoundingClientRect().left;
  }  

  private _commands: CommandRegistry;
  private _isDisposed = false;
  private _panel: NotebookPanel | null;
  private _previousActiveCell: Cell<ICellModel> | null;
  private _settings: ISettingRegistry.ISettings | null;
}

/**
 * Widget extension that creates a CellToolbarTracker each time a notebook is
 * created.
 */
export class CellBarExtension implements DocumentRegistry.WidgetExtension {
  constructor(
    commands: CommandRegistry,
    settings: ISettingRegistry.ISettings | null
  ) {
    this._commands = commands;
    this._settings = settings;
  }

  createNew(panel: NotebookPanel): IDisposable {
    return new CellToolbarTracker(panel, this._commands, this._settings);
  }

  private _commands: CommandRegistry;
  private _settings: ISettingRegistry.ISettings | null;
}
