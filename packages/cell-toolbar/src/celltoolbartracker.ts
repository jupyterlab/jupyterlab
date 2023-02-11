/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/
import { createDefaultFactory, ToolbarRegistry } from '@jupyterlab/apputils';
import { Cell, CodeCell, ICellModel, MarkdownCell } from '@jupyterlab/cells';
import { DocumentRegistry } from '@jupyterlab/docregistry';
import { Notebook, NotebookPanel } from '@jupyterlab/notebook';
import { IObservableList, ObservableList } from '@jupyterlab/observables';
import { ReactWidget, Toolbar } from '@jupyterlab/ui-components';
import { some } from '@lumino/algorithm';
import { CommandRegistry } from '@lumino/commands';
import { IDisposable } from '@lumino/disposable';
import { Signal } from '@lumino/signaling';
import { PanelLayout, Widget } from '@lumino/widgets';

/*
 * Text mime types
 */
const TEXT_MIME_TYPES = [
  'text/plain',
  'application/vnd.jupyter.stdout',
  'application/vnd.jupyter.stderr'
];

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
    toolbar: IObservableList<ToolbarRegistry.IToolbarItem>
  ) {
    this._panel = panel;
    this._previousActiveCell = this._panel.content.activeCell;
    this._toolbar = toolbar;

    this._onToolbarChanged();
    this._toolbar.changed.connect(this._onToolbarChanged, this);

    // Only add the toolbar to the notebook's active cell (if any) once it has fully rendered and been revealed.
    void panel.revealed.then(() => {
      // Wait one frame (at 60 fps) for the panel to render the first cell, then display the cell toolbar on it if possible.
      setTimeout(() => {
        this._onActiveCellChanged(panel.content);
      }, 1000 / 60);
    });

    // Check whether the toolbar should be rendered upon a layout change
    panel.content.renderingLayoutChanged.connect(
      this._onActiveCellChanged,
      this
    );

    // Handle subsequent changes of active cell.
    panel.content.activeCellChanged.connect(this._onActiveCellChanged, this);
  }

  _onActiveCellChanged(notebook: Notebook): void {
    if (this._previousActiveCell && !this._previousActiveCell.isDisposed) {
      // Disposed cells do not have a model anymore.
      this._removeToolbar(this._previousActiveCell.model);
    }

    const activeCell = notebook.activeCell;
    if (activeCell === null || activeCell.inputHidden) {
      return;
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

    this._toolbar.changed.disconnect(this._onToolbarChanged, this);

    const cells = this._panel?.context.model.cells;
    if (cells) {
      for (const model of cells) {
        this._removeToolbar(model);
      }
    }

    this._panel = null;

    Signal.clearData(this);
  }

  private _addToolbar(model: ICellModel): void {
    const cell = this._getCell(model);

    if (cell) {
      const toolbarWidget = new Toolbar();
      toolbarWidget.addClass(CELL_MENU_CLASS);

      const promises: Promise<void>[] = [];
      for (const { name, widget } of this._toolbar) {
        toolbarWidget.addItem(name, widget);
        if (
          widget instanceof ReactWidget &&
          (widget as ReactWidget).renderPromise !== undefined
        ) {
          promises.push((widget as ReactWidget).renderPromise!);
        }
      }

      // Wait for all the buttons to be rendered before attaching the toolbar.
      Promise.all(promises)
        .then(() => {
          toolbarWidget.addClass(CELL_TOOLBAR_CLASS);
          (cell.layout as PanelLayout).insertWidget(0, toolbarWidget);

          // For rendered markdown, watch for resize events.
          cell.displayChanged.connect(this._resizeEventCallback, this);

          // Watch for changes in the cell's contents.
          cell.model.contentChanged.connect(this._changedEventCallback, this);
        })
        .catch(() => {
          console.error('Error rendering buttons of the cell toolbar');
        });
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
      this._findToolbarWidgets(cell).forEach(widget => {
        widget.dispose();
      });
      // Attempt to remove the resize and changed event handlers.
      cell.displayChanged.disconnect(this._resizeEventCallback, this);
    }
    model.contentChanged.disconnect(this._changedEventCallback, this);
  }

  /**
   * Call back on settings changes
   */
  private _onToolbarChanged(): void {
    // Reset toolbar when settings changes
    const activeCell: Cell<ICellModel> | null | undefined =
      this._panel?.content.activeCell;
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
    if (this._panel?.content.renderingLayout === 'default') {
      return this._codeOverlapsToolbar(activeCell);
    } else {
      return this._outputOverlapsToolbar(activeCell);
    }
  }

  /**
   * Check for overlap between rendered Markdown and the cell toolbar
   *
   * @param activeCell A rendered MarkdownCell
   * @returns `true` if the first line of the output overlaps with the cell toolbar, `false` otherwise
   */
  private _markdownOverlapsToolbar(activeCell: MarkdownCell): boolean {
    const markdownOutput = activeCell.inputArea; // Rendered markdown appears in the input area
    if (!markdownOutput) {
      return false;
    }

    // Get the rendered markdown as a widget.
    const markdownOutputWidget = markdownOutput.renderedInput;
    const markdownOutputElement = markdownOutputWidget.node;

    const firstOutputElementChild =
      markdownOutputElement.firstElementChild as HTMLElement;
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

  private _outputOverlapsToolbar(activeCell: Cell<ICellModel>): boolean {
    const outputArea = (activeCell as CodeCell).outputArea.node;
    if (outputArea) {
      const outputs = outputArea.querySelectorAll('[data-mime-type]');
      const toolbarRect = this._cellToolbarRect(activeCell);
      if (toolbarRect) {
        const { left: toolbarLeft, bottom: toolbarBottom } = toolbarRect;
        return some(outputs, output => {
          const node = output.firstElementChild;
          if (node) {
            const range = new Range();
            if (
              TEXT_MIME_TYPES.includes(
                output.getAttribute('data-mime-type') || ''
              )
            ) {
              // If the node is plain text, it's in a <pre>. To get the true bounding box of the
              // text, the node contents need to be selected.
              range.selectNodeContents(node);
            } else {
              range.selectNode(node);
            }
            const { right: nodeRight, top: nodeTop } =
              range.getBoundingClientRect();

            // Note: y-coordinate increases toward the bottom of page
            return nodeRight > toolbarLeft && nodeTop < toolbarBottom;
          }
          return false;
        });
      }
    }
    return false;
  }

  private _codeOverlapsToolbar(activeCell: Cell<ICellModel>): boolean {
    const editorWidget = activeCell.editorWidget;
    const editor = activeCell.editor;
    if (!editorWidget || !editor) {
      return false;
    }

    if (editor.lineCount < 1) {
      return false; // Nothing in the editor
    }

    const codeMirrorLines =
      editorWidget.node.getElementsByClassName('CodeMirror-line');
    if (codeMirrorLines.length < 1) {
      return false; // No lines present
    }
    const lineRight = codeMirrorLines[0].children[0] // First span under first pre
      .getBoundingClientRect().right;

    const toolbarLeft = this._cellToolbarLeft(activeCell);

    return toolbarLeft === null ? false : lineRight > toolbarLeft;
  }

  private _cellEditorWidgetLeft(activeCell: Cell<ICellModel>): number {
    return activeCell.editorWidget?.node.getBoundingClientRect().left ?? 0;
  }

  private _cellEditorWidgetRight(activeCell: Cell<ICellModel>): number {
    return activeCell.editorWidget?.node.getBoundingClientRect().right ?? 0;
  }

  private _cellToolbarRect(activeCell: Cell<ICellModel>): DOMRect | null {
    const toolbarWidgets = this._findToolbarWidgets(activeCell);
    if (toolbarWidgets.length < 1) {
      return null;
    }
    const activeCellToolbar = toolbarWidgets[0].node;

    return activeCellToolbar.getBoundingClientRect();
  }

  private _cellToolbarLeft(activeCell: Cell<ICellModel>): number | null {
    return this._cellToolbarRect(activeCell)?.left || null;
  }

  private _isDisposed = false;
  private _panel: NotebookPanel | null;
  private _previousActiveCell: Cell<ICellModel> | null;
  private _toolbar: IObservableList<ToolbarRegistry.IToolbarItem>;
}

const defaultToolbarItems: ToolbarRegistry.IWidget[] = [
  {
    command: 'notebook:duplicate-below',
    name: 'duplicate-cell'
  },
  {
    command: 'notebook:move-cell-up',
    name: 'move-cell-up'
  },
  {
    command: 'notebook:move-cell-down',
    name: 'move-cell-down'
  },
  {
    command: 'notebook:insert-cell-above',
    name: 'insert-cell-above'
  },
  {
    command: 'notebook:insert-cell-below',
    name: 'insert-cell-below'
  },
  {
    command: 'notebook:delete-cell',
    name: 'delete-cell'
  }
];

/**
 * Widget extension that creates a CellToolbarTracker each time a notebook is
 * created.
 */
export class CellBarExtension implements DocumentRegistry.WidgetExtension {
  static FACTORY_NAME = 'Cell';

  constructor(
    commands: CommandRegistry,
    toolbarFactory?: (
      widget: Widget
    ) => IObservableList<ToolbarRegistry.IToolbarItem>
  ) {
    this._commands = commands;
    this._toolbarFactory = toolbarFactory ?? this.defaultToolbarFactory;
  }

  protected get defaultToolbarFactory(): (
    widget: Widget
  ) => IObservableList<ToolbarRegistry.IToolbarItem> {
    const itemFactory = createDefaultFactory(this._commands);
    return (widget: Widget) =>
      new ObservableList({
        values: defaultToolbarItems.map(item => {
          return {
            name: item.name,
            widget: itemFactory(CellBarExtension.FACTORY_NAME, widget, item)
          };
        })
      });
  }

  createNew(panel: NotebookPanel): IDisposable {
    return new CellToolbarTracker(panel, this._toolbarFactory(panel));
  }

  private _commands: CommandRegistry;
  private _toolbarFactory: (
    widget: Widget
  ) => IObservableList<ToolbarRegistry.IToolbarItem>;
}
