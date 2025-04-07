/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/
import {
  createDefaultFactory,
  setToolbar,
  ToolbarRegistry
} from '@jupyterlab/apputils';
import {
  Cell,
  CellModel,
  CodeCell,
  ICellModel,
  MarkdownCell
} from '@jupyterlab/cells';
import { DocumentRegistry } from '@jupyterlab/docregistry';
import { Notebook, NotebookPanel } from '@jupyterlab/notebook';
import { IObservableList, ObservableList } from '@jupyterlab/observables';
import { ReactWidget, Toolbar } from '@jupyterlab/ui-components';
import { some } from '@lumino/algorithm';
import { CommandRegistry } from '@lumino/commands';
import { IDisposable } from '@lumino/disposable';
import { Signal } from '@lumino/signaling';
import { PanelLayout, Widget } from '@lumino/widgets';
import { IMapChange } from '@jupyter/ydoc';
import { ITranslator, nullTranslator } from '@jupyterlab/translation';

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
// @deprecated to be removed
const CELL_MENU_CLASS = 'jp-cell-menu';

/**
 * Class for a cell whose contents overlap with the cell toolbar
 */
const TOOLBAR_OVERLAP_CLASS = 'jp-toolbar-overlap';

/**
 * Watch a notebook so that a cell toolbar appears on the active cell
 */
export class CellToolbarTracker implements IDisposable {
  /**
   * CellToolbarTracker constructor
   *
   * @param panel The notebook panel
   * @param toolbar The toolbar; deprecated use {@link toolbarFactory} instead
   * @param toolbarFactory The toolbar factory
   */
  constructor(
    panel: NotebookPanel,
    toolbar?: IObservableList<ToolbarRegistry.IToolbarItem>,
    toolbarFactory?: (
      widget: Cell
    ) => IObservableList<ToolbarRegistry.IToolbarItem>,
    translator?: ITranslator
  ) {
    this._panel = panel;
    this._previousActiveCell = this._panel.content.activeCell;
    this._toolbarItems = toolbar ?? null;
    this._toolbarFactory = toolbarFactory ?? null;
    this._enabled = true; // If this has been set to false, it will be modified after settings are available
    this._trans = (translator ?? nullTranslator).load('jupyterlab');

    if (this._toolbarItems === null && this._toolbarFactory === null) {
      throw Error('You must provide the toolbarFactory or the toolbar items.');
    }

    // deprecated to be removed when we remove toolbar from input arguments
    if (!this._toolbarFactory && this._toolbarItems) {
      this._onToolbarChanged();
      this._toolbarItems.changed.connect(this._onToolbarChanged, this);
    }

    // Only add the toolbar to the notebook's active cell (if any) once it has fully rendered and been revealed.
    void panel.revealed.then(() => {
      requestAnimationFrame(() => {
        const notebook = panel.content;
        this._onActiveCellChanged(notebook);
        // Handle subsequent changes of active cell.
        notebook.activeCellChanged.connect(this._onActiveCellChanged, this);

        // Check whether the toolbar should be rendered upon a layout change
        notebook.renderingLayoutChanged.connect(
          this._onActiveCellChanged,
          this
        );

        notebook.disposed.connect(() => {
          notebook.activeCellChanged.disconnect(this._onActiveCellChanged);
        });
      });
    });
  }

  /**
   * @deprecated Will become protected in JupyterLab 5
   */
  _onMetadataChanged(model: CellModel, args: IMapChange) {
    if (args.key === 'jupyter') {
      if (
        typeof args.newValue === 'object' &&
        args.newValue.source_hidden === true &&
        (args.type === 'add' || args.type === 'change')
      ) {
        // Cell just became hidden; remove toolbar
        this._removeToolbar(model);
      }
      // Check whether input visibility changed
      else if (
        typeof args.oldValue === 'object' &&
        args.oldValue.source_hidden === true
      ) {
        // Cell just became visible; add toolbar
        this._addToolbar(model);
      }
    }
  }

  /**
   * @deprecated Will become protected in JupyterLab 5
   */
  _onActiveCellChanged(notebook: Notebook): void {
    if (this._previousActiveCell && !this._previousActiveCell.isDisposed) {
      // Disposed cells do not have a model anymore.
      this._removeToolbar(this._previousActiveCell.model);
      this._previousActiveCell.model.metadataChanged.disconnect(
        this._onMetadataChanged
      );
    }

    const activeCell = notebook.activeCell;
    // Change previously active cell.
    this._previousActiveCell = activeCell;
    if (activeCell === null || activeCell.inputHidden) {
      return;
    }

    activeCell.model.metadataChanged.connect(this._onMetadataChanged, this);

    this._addToolbar(activeCell.model);
  }

  get isDisposed(): boolean {
    return this._isDisposed;
  }

  /**
   * Whether the cell toolbar is shown, if there is enough room
   */
  get enabled(): boolean {
    return this._enabled;
  }

  /**
   * Sets whether the cell toolbar is shown, if there is enough room
   */
  set enabled(value: boolean) {
    this._enabled = value;
    this._onToolbarChanged();
  }

  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this._isDisposed = true;

    this._toolbarItems?.changed.disconnect(this._onToolbarChanged, this);
    this._toolbar?.dispose();

    this._panel = null;

    Signal.clearData(this);
  }

  private _addToolbar(model: ICellModel): void {
    // Do nothing if the toolbar shouldn't be visible.
    if (!this.enabled) {
      return;
    }

    const cell = this._getCell(model);

    if (cell && !cell.isDisposed) {
      const toolbarWidget = (this._toolbar = new Toolbar());
      // Note: CELL_MENU_CLASS is deprecated.
      toolbarWidget.addClass(CELL_MENU_CLASS);
      toolbarWidget.addClass(CELL_TOOLBAR_CLASS);

      toolbarWidget.node.setAttribute(
        'aria-label',
        this._trans.__('Cell toolbar')
      );
      const promises: Promise<void>[] = [cell.ready];
      if (this._toolbarFactory) {
        setToolbar(cell, this._toolbarFactory, toolbarWidget);
        // FIXME toolbarWidget.update() - strangely this does not work
        (toolbarWidget.layout as PanelLayout).widgets.forEach(w => {
          w.update();
        });
      } else {
        for (const { name, widget } of this._toolbarItems!) {
          toolbarWidget.addItem(name, widget);
          if (
            widget instanceof ReactWidget &&
            (widget as ReactWidget).renderPromise !== undefined
          ) {
            (widget as ReactWidget).update();
            promises.push((widget as ReactWidget).renderPromise!);
          }
        }
      }
      promises.push(cell.ready);

      // Wait for all the buttons to be rendered before attaching the toolbar.
      Promise.all(promises)
        .then(() => {
          if (cell.isDisposed || this._panel?.content.activeCell !== cell) {
            toolbarWidget.dispose();
            return;
          }

          // Hide the toolbar by default, to avoid temporary overlapping.
          cell.node.classList.add(TOOLBAR_OVERLAP_CLASS);

          (cell.inputArea!.layout as PanelLayout).insertWidget(
            0,
            toolbarWidget
          );

          // For rendered markdown, watch for resize events.
          cell.displayChanged.connect(this._resizeEventCallback, this);

          // Watch for changes in the cell's contents.
          cell.model.contentChanged.connect(this._changedEventCallback, this);

          // Hide the cell toolbar if it overlaps with cell contents
          this._updateCellForToolbarOverlap(cell);
        })
        .catch(e => {
          console.error('Error rendering buttons of the cell toolbar: ', e);
        });
    }
  }

  private _getCell(model: ICellModel): Cell | undefined {
    return this._panel?.content.widgets.find(widget => widget.model === model);
  }

  private _removeToolbar(model: ICellModel): void {
    const cell = this._getCell(model);
    if (cell && !cell.isDisposed) {
      // Attempt to remove the resize and changed event handlers.
      cell.displayChanged.disconnect(this._resizeEventCallback, this);
    }
    model.contentChanged.disconnect(this._changedEventCallback, this);
    if (
      this._toolbar?.parent === cell?.inputArea &&
      this._toolbar?.isDisposed === false
    ) {
      this._toolbar.dispose();
    }
  }

  /**
   * Call back on settings changes
   *
   * @deprecated To remove when toolbar can not be provided directly to the tracker
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
    // When we do change in cell, the browser might not have completed the layout
    // update if we don't wait, resulting in the previous width being returned
    // using `getBoundingClientRect().width` in later functions. This also wait for
    // the toolbar to be rendered the first time (on page reload), allowing us to
    // retrieve the right widgets width.
    requestIdleCallback(() => {
      // Remove the "toolbar overlap" class from the cell, rendering the cell's toolbar
      const activeCellElement = activeCell.node;
      activeCellElement.classList.remove(TOOLBAR_OVERLAP_CLASS);
      if (this._cellToolbarOverlapsContents(activeCell)) {
        // Add the "toolbar overlap" class to the cell, completely concealing the toolbar,
        // if the first line of the content overlaps with it at all
        activeCellElement.classList.add(TOOLBAR_OVERLAP_CLASS);
      }
    });
  }

  private _cellToolbarOverlapsContents(activeCell: Cell<ICellModel>): boolean {
    // Fail safe when the active cell is not ready yet
    if (!activeCell.model) {
      return false;
    }

    const cellType = activeCell.model.type;

    // If the toolbar is too large for the current cell, hide it.

    const editorRect = activeCell.editorWidget?.node.getBoundingClientRect();
    const cellLeft = editorRect?.left ?? 0;
    const cellRight = editorRect?.right ?? 0;
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

    const codeMirrorLines = editorWidget.node.getElementsByClassName('cm-line');
    if (codeMirrorLines.length < 1) {
      return false; // No lines present
    }

    let lineRight = codeMirrorLines[0].getBoundingClientRect().left;
    const range = document.createRange();
    range.selectNodeContents(codeMirrorLines[0]);
    lineRight += range.getBoundingClientRect().width;

    const toolbarLeft = this._cellToolbarLeft(activeCell);

    return toolbarLeft === null ? false : lineRight > toolbarLeft;
  }

  private _cellToolbarRect(activeCell: Cell<ICellModel>): DOMRect | null {
    if (this._toolbar?.parent !== activeCell.inputArea) {
      return null;
    }
    const activeCellToolbar = this._toolbar.node;

    return activeCellToolbar.getBoundingClientRect();
  }

  private _cellToolbarLeft(activeCell: Cell<ICellModel>): number | null {
    return this._cellToolbarRect(activeCell)?.left || null;
  }

  private _enabled: boolean;
  private _isDisposed = false;
  private _panel: NotebookPanel | null;
  private _previousActiveCell: Cell<ICellModel> | null;
  private _toolbar: Widget | null = null;
  private _toolbarItems: IObservableList<ToolbarRegistry.IToolbarItem> | null =
    null;
  private _toolbarFactory:
    | ((widget: Cell) => IObservableList<ToolbarRegistry.IToolbarItem>)
    | null = null;
  private _trans;
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
  static readonly FACTORY_NAME = 'Cell';

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
    return (this._tracker = new CellToolbarTracker(
      panel,
      undefined,
      this._toolbarFactory
    ));
  }

  /**
   * Whether the cell toolbar is displayed, if there is enough room for it
   */
  get enabled(): boolean {
    return this._tracker.enabled;
  }

  /**
   * Sets whether the cell toolbar is displayed, if there is enough room for it
   */
  set enabled(value: boolean) {
    if (this._tracker) {
      this._tracker.enabled = value;
    }
  }

  private _commands: CommandRegistry;
  private _toolbarFactory: (
    widget: Widget
  ) => IObservableList<ToolbarRegistry.IToolbarItem>;
  private _tracker: CellToolbarTracker;
}
