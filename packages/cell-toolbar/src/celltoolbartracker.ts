/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/
import { Cell, ICellModel, MarkdownCell } from '@jupyterlab/cells';
import { DocumentRegistry } from '@jupyterlab/docregistry';
import { Notebook, NotebookPanel } from '@jupyterlab/notebook';
import {
  IObservableList,
  IObservableUndoableList
} from '@jupyterlab/observables';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { LabIcon, Toolbar, ToolbarButton } from '@jupyterlab/ui-components';

import { each } from '@lumino/algorithm';
import { CommandRegistry } from '@lumino/commands';
import { IDisposable } from '@lumino/disposable';
import { PanelLayout, Widget } from '@lumino/widgets';

const DEFAULT_LEFT_MENU: ISettingRegistry.IToolbarItem[] = [];

/**
 * Widget cell toolbar classes
 */
const CELL_TOOLBAR_CLASS = 'jp-cell-toolbar';
const CELL_MENU_CLASS = 'jp-cell-menu';

/**
 * Class for a cell whose contents overlap with the cell toolbar
 */
const TOOLBAR_OVERLAP_CLASS = 'jp-toolbar-overlap';

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

    // Only add the toolbar to the notebook's active cell (if any) once it has fully rendered and been revealed.
    panel.revealed.then(() => this._onActiveCellChanged(panel.content));

    // Handle subsequent changes of active cell.
    panel.content.activeCellChanged.connect(this._onActiveCellChanged, this);
  }

  _onActiveCellChanged(notebook: Notebook): void {
    const activeCell = notebook.activeCell;
    if (!activeCell) {
      return;
    }

    if (
      this._previousActiveCell !== null &&
      this._previousActiveCell !== undefined
    ) {
      this._removeToolbar(this._previousActiveCell.model);
    }
    this._addToolbar(activeCell.model);
    this._previousActiveCell = activeCell;

    this._updateCellForToolbarOverlap(activeCell);
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
    const activeCell: Cell<ICellModel> | null | undefined = this._panel?.content
      .activeCell;
    if (activeCell === null || activeCell === undefined) {
      return;
    }

    if (changed.oldValues.find(m => m === activeCell.model)) {
      this._removeToolbar(activeCell.model);
      this._addToolbar(activeCell.model);
    }
  }

  private _addToolbar(model: ICellModel): void {
    const cell = this._getCell(model);

    if (cell) {
      const { toolbar } = (this._settings?.composite as any) ?? {};

      const toolbarItems: ISettingRegistry.IToolbarItem[] =
        toolbar === null ? [] : toolbar ?? DEFAULT_LEFT_MENU;

      const toolbarWidget = new Toolbar();
      toolbarWidget.addClass(CELL_MENU_CLASS);

      const toolbarLayout = toolbarWidget.layout as PanelLayout;

      toolbarItems.forEach(toolbarItem => {
        if (
          toolbarItem.command !== undefined &&
          this._commands.hasCommand(toolbarItem.command)
        ) {
          toolbarLayout.addWidget(
            new ToolbarButton({
              icon: LabIcon.resolve({ icon: toolbarItem.icon ?? '' }),
              className: `jp-cell-${toolbarItem.cellType ?? 'all'}`,
              actualOnClick: true,
              tooltip: toolbarItem.tooltip
                ? toolbarItem.tooltip.toString()
                : this._commands.label(toolbarItem.command)
            })
          );
        }
      });

      toolbarWidget.addClass(CELL_TOOLBAR_CLASS);
      (cell.layout as PanelLayout).insertWidget(0, toolbarWidget);

      // For rendered markdown, watch for resize events.
      cell.displayChanged.connect(this._resizeEventCallback, this);

      // Watch for changes in the cell's contents.
      cell.model.contentChanged.connect(this._changedEventCallback, this);
    }
  }

  private _getCell(model: ICellModel): Cell | undefined {
    return this._panel?.content.widgets.find(widget => widget.model === model);
  }

  private _findToolbarWidgets(cell: Cell): Widget[] {
    const widgets = (cell.layout as PanelLayout).widgets;

    // Search for header using the CSS class or use the first one if not found.
    return widgets.filter(widget => widget.hasClass(CELL_TOOLBAR_CLASS)) || [];
  }

  private _removeToolbar(model: ICellModel): void {
    const cell = this._getCell(model);
    if (cell) {
      this._findToolbarWidgets(cell).forEach(widget => widget.dispose());
      // Attempt to remove the resize and changed event handlers.
      cell.displayChanged.disconnect(this._resizeEventCallback, this);
      cell.model.contentChanged.disconnect(this._changedEventCallback, this);
    }
  }

  /**
   * Call back on settings changes
   */
  private _onSettingsChanged(): void {
    // Reset toolbar when settings changes
    const activeCell: Cell<ICellModel> | null | undefined = this._panel?.content
      .activeCell;
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

    this._updateCellForToolbarOverlap(activeCell);
  }

  private _resizeEventCallback(): void {
    const activeCell = this._panel?.content.activeCell;
    if (activeCell === null || activeCell === undefined) {
      return;
    }

    this._updateCellForToolbarOverlap(activeCell);
  }

  private _updateCellForToolbarOverlap(activeCell: Cell<ICellModel>) {
    // Remove the "toolbar overlap" class from the cell, rendering the cell's toolbar
    const activeCellElement = activeCell.node;
    activeCellElement.classList.remove(TOOLBAR_OVERLAP_CLASS);

    if (this._cellToolbarOverlapsContents(activeCell)) {
      // Add the "toolbar overlap" class to the cell, completely concealing the toolbar,
      // if the first line of the content overlaps with it at all
      activeCellElement.classList.add(TOOLBAR_OVERLAP_CLASS);
    }
  }

  private _cellToolbarOverlapsContents(activeCell: Cell<ICellModel>): boolean {
    const cellType = activeCell.model.type;

    // If the toolbar is too large for the current cell, hide it.
    const cellLeft = this._cellEditorWidgetLeft(activeCell);
    const cellRight = this._cellEditorWidgetRight(activeCell);
    const toolbarLeft = this._cellToolbarLeft(activeCell);

    if (toolbarLeft === null) {
      return false;
    }

    // The toolbar should not take up more than 50% of the cell.
    if ((cellLeft + cellRight) / 2 > toolbarLeft) {
      return true;
    }

    if (cellType === 'markdown' && (activeCell as MarkdownCell).rendered) {
      // Check for overlap in rendered markdown content
      return this._markdownOverlapsToolbar(activeCell as MarkdownCell);
    }

    // Check for overlap in code content
    return this._codeOverlapsToolbar(activeCell);
  }

  /**
   * Check for overlap between rendered Markdown and the cell toolbar
   *
   * @param activeCell A rendered MarkdownCell
   * @returns `true` if the first line of the output overlaps with the cell toolbar, `false` otherwise
   */
  private _markdownOverlapsToolbar(activeCell: MarkdownCell): boolean {
    const markdownOutput = activeCell.inputArea; // Rendered markdown appears in the input area

    // Get the rendered markdown as a widget.
    const markdownOutputWidget = markdownOutput.renderedInput;
    const markdownOutputElement = markdownOutputWidget.node;

    const firstOutputElementChild = markdownOutputElement.firstElementChild as HTMLElement;
    if (firstOutputElementChild === null) {
      return false;
    }

    // Temporarily set the element's max width so that the bounding client rectangle only encompasses the content.
    const oldMaxWidth = firstOutputElementChild.style.maxWidth;
    firstOutputElementChild.style.maxWidth = 'max-content';

    const lineRight = firstOutputElementChild.getBoundingClientRect().right;

    // Reinstate the old max width.
    firstOutputElementChild.style.maxWidth = oldMaxWidth;

    const toolbarLeft = this._cellToolbarLeft(activeCell);

    return toolbarLeft === null ? false : lineRight > toolbarLeft;
  }

  private _codeOverlapsToolbar(activeCell: Cell<ICellModel>): boolean {
    const editorWidget = activeCell.editorWidget;
    const editor = activeCell.editor;
    if (editor.lineCount < 1) {
      return false; // Nothing in the editor
    }

    const codeMirrorLines = editorWidget.node.getElementsByClassName(
      'CodeMirror-line'
    );
    if (codeMirrorLines.length < 1) {
      return false; // No lines present
    }
    const lineRight = codeMirrorLines[0].children[0] // First span under first pre
      .getBoundingClientRect().right;

    const toolbarLeft = this._cellToolbarLeft(activeCell);

    return toolbarLeft === null ? false : lineRight > toolbarLeft;
  }

  private _cellEditorWidgetLeft(activeCell: Cell<ICellModel>): number {
    return activeCell.editorWidget.node.getBoundingClientRect().left;
  }

  private _cellEditorWidgetRight(activeCell: Cell<ICellModel>): number {
    return activeCell.editorWidget.node.getBoundingClientRect().right;
  }

  private _cellToolbarLeft(activeCell: Cell<ICellModel>): number | null {
    const toolbarWidgets = this._findToolbarWidgets(activeCell);
    if (toolbarWidgets.length < 1) {
      return null;
    }
    const activeCellToolbar = toolbarWidgets[0].node;

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
