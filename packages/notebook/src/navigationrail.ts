// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import type { ICellModel, ICodeCellModel } from '@jupyterlab/cells';
import type { IChangedArgs } from '@jupyterlab/coreutils';
import type * as nbformat from '@jupyterlab/nbformat';
import type { IObservableList } from '@jupyterlab/observables';
import type { ITranslator, TranslationBundle } from '@jupyterlab/translation';
import { nullTranslator } from '@jupyterlab/translation';
import type { Message } from '@lumino/messaging';
import { Widget } from '@lumino/widgets';
import { NotebookActions } from './actions';
import type { Notebook } from './widget';

const NAVIGATION_RAIL_CLASS = 'jp-Notebook-navigationRail';
const TRACK_CLASS = 'jp-Notebook-navigationRail-track';
const DOT_CLASS = 'jp-Notebook-navigationRail-dot';
const TOOLTIP_CLASS = 'jp-Notebook-navigationRail-tooltip';
const ACTIVE_DOT_CLASS = 'jp-mod-active';
const ERROR_DOT_CLASS = 'jp-mod-error';
const RUNNING_DOT_CLASS = 'jp-mod-running';

export interface ICellErrorInfo {
  hasError: boolean;
  ename?: string;
  evalue?: string;
  traceback?: string[];
}

/**
 * A navigation rail widget providing a vertical strip of dots for prompt navigation
 * and error indicators with hover tooltips.
 */
export class NotebookNavigationRail extends Widget {
  /**
   * Construct a new navigation rail widget.
   */
  constructor(options: NotebookNavigationRail.IOptions) {
    super();
    this.addClass(NAVIGATION_RAIL_CLASS);
    this.notebook = options.notebook;
    this.translator = options.translator ?? nullTranslator;
    this._trans = this.translator.load('jupyterlab');

    this._track = document.createElement('div');
    this._track.className = TRACK_CLASS;
    this.node.appendChild(this._track);

    this._tooltip = document.createElement('div');
    this._tooltip.className = TOOLTIP_CLASS;
    this._tooltip.style.display = 'none';
    document.body.appendChild(this._tooltip);

    this._setupNotebookListeners();
    this.updateDots();
  }

  /**
   * The notebook associated with this navigation rail.
   */
  readonly notebook: Notebook;

  /**
   * The translator used for internationalization.
   */
  readonly translator: ITranslator;

  private _trans: TranslationBundle;
  private _track: HTMLElement;
  private _tooltip: HTMLElement;
  private _dots: Map<string, HTMLElement> = new Map();
  private _cellListeners: Map<string, () => void> = new Map();
  private _hoverTimeout: number | null = null;
  private _hoveredCellId: string | null = null;

  /**
   * Dispose of the resources used by the widget.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }

    if (this._hoverTimeout !== null) {
      window.clearTimeout(this._hoverTimeout);
      this._hoverTimeout = null;
    }

    this._clearCellListeners();
    this._disconnectNotebookListeners();

    if (this._tooltip && this._tooltip.parentNode) {
      this._tooltip.parentNode.removeChild(this._tooltip);
    }

    this._dots.clear();
    super.dispose();
  }

  /**
   * Set up listeners for notebook-level events.
   */
  private _setupNotebookListeners(): void {
    this.notebook.activeCellChanged.connect(this._onActiveCellChanged, this);
    this.notebook.modelChanged.connect(this._onModelChanged, this);

    const model = this.notebook.model;
    if (model) {
      model.cells.changed.connect(this._onCellsChanged, this);
    }
  }

  /**
   * Disconnect all notebook-level listeners.
   */
  private _disconnectNotebookListeners(): void {
    this.notebook.activeCellChanged.disconnect(this._onActiveCellChanged, this);
    this.notebook.modelChanged.disconnect(this._onModelChanged, this);

    const model = this.notebook.model;
    if (model) {
      model.cells.changed.disconnect(this._onCellsChanged, this);
    }
  }

  /**
   * Handle when the notebook model changes.
   */
  private _onModelChanged(): void {
    this._clearCellListeners();
    const model = this.notebook.model;
    if (model) {
      model.cells.changed.connect(this._onCellsChanged, this);
    }
    this.updateDots();
  }

  /**
   * Handle changes in the list of cells (addition, removal, movement).
   */
  private _onCellsChanged(
    sender: IObservableList<ICellModel>,
    args: IObservableList.IChangedArgs<ICellModel>
  ): void {
    this.updateDots();
  }

  /**
   * Handle changes to the active cell.
   */
  private _onActiveCellChanged(): void {
    const activeModel = this.notebook.activeCell?.model;
    this._dots.forEach((dot, cellId) => {
      const isActive = activeModel && activeModel.id === cellId;
      dot.classList.toggle(ACTIVE_DOT_CLASS, !!isActive);
    });
  }

  /**
   * Remove all cell-specific signal listeners.
   */
  private _clearCellListeners(): void {
    this._cellListeners.forEach(disconnect => disconnect());
    this._cellListeners.clear();
  }

  /**
   * Re-render all navigation dots based on current notebook cells.
   */
  updateDots(): void {
    this._clearCellListeners();
    this._track.innerHTML = '';
    this._dots.clear();

    const model = this.notebook.model;
    if (!model) {
      return;
    }

    const cells = model.cells;
    const activeModel = this.notebook.activeCell?.model;

    for (let i = 0; i < cells.length; i++) {
      const cell = cells.get(i);
      const dot = this._createDot(cell, i);

      if (activeModel && activeModel.id === cell.id) {
        dot.classList.add(ACTIVE_DOT_CLASS);
      }

      this._track.appendChild(dot);
      this._dots.set(cell.id, dot);
      this._attachCellListeners(cell, dot, i);
    }
  }

  /**
   * Create a dot element for a cell.
   */
  private _createDot(cell: ICellModel, index: number): HTMLElement {
    const dot = document.createElement('button');
    dot.className = DOT_CLASS;
    dot.setAttribute('role', 'button');
    dot.setAttribute('tabindex', '-1');
    dot.dataset.cellId = cell.id;
    dot.dataset.index = `${index}`;
    dot.dataset.type = cell.type;

    const errorInfo = this._getCellError(cell);
    if (errorInfo.hasError) {
      dot.classList.add(ERROR_DOT_CLASS);
      dot.setAttribute(
        'aria-label',
        this._trans.__(
          'Error in cell %1: %2',
          index + 1,
          errorInfo.ename ?? 'Error'
        )
      );
    } else {
      dot.setAttribute('aria-label', this._trans.__('Cell %1', index + 1));
    }

    if (cell.type === 'code') {
      const codeModel = cell as ICodeCellModel;
      if (codeModel.executionState === 'running') {
        dot.classList.add(RUNNING_DOT_CLASS);
      }
    }

    dot.addEventListener('click', event => {
      event.stopPropagation();
      this._onDotClick(index);
    });

    dot.addEventListener('mouseenter', () => {
      this._showTooltip(cell, index, dot);
    });

    dot.addEventListener('mouseleave', () => {
      this._hideTooltip();
    });

    return dot;
  }

  /**
   * Attach reactive signal listeners for a cell model.
   */
  private _attachCellListeners(
    cell: ICellModel,
    dot: HTMLElement,
    index: number
  ): void {
    const disconnects: Array<() => void> = [];

    if (cell.type === 'code') {
      const codeModel = cell as ICodeCellModel;

      const onOutputsChanged = () => {
        const errorInfo = this._getCellError(codeModel);
        dot.classList.toggle(ERROR_DOT_CLASS, errorInfo.hasError);
        if (errorInfo.hasError) {
          dot.setAttribute(
            'aria-label',
            this._trans.__(
              'Error in cell %1: %2',
              index + 1,
              errorInfo.ename ?? 'Error'
            )
          );
        } else {
          dot.setAttribute('aria-label', this._trans.__('Cell %1', index + 1));
        }

        // If tooltip currently open for this cell, refresh it
        if (this._hoveredCellId === cell.id) {
          this._renderTooltipContent(cell, index);
        }
      };

      const onStateChanged = (
        _: ICellModel,
        change: IChangedArgs<
          any,
          any,
          'trusted' | 'isDirty' | 'executionCount' | 'executionState'
        >
      ) => {
        if (change.name === 'executionState') {
          dot.classList.toggle(
            RUNNING_DOT_CLASS,
            codeModel.executionState === 'running'
          );
        }
        if (this._hoveredCellId === cell.id) {
          this._renderTooltipContent(cell, index);
        }
      };

      codeModel.outputs.changed.connect(onOutputsChanged);
      disconnects.push(() =>
        codeModel.outputs.changed.disconnect(onOutputsChanged)
      );

      codeModel.stateChanged.connect(onStateChanged);
      disconnects.push(() => codeModel.stateChanged.disconnect(onStateChanged));
    }

    const onSourceChanged = () => {
      if (this._hoveredCellId === cell.id) {
        this._renderTooltipContent(cell, index);
      }
    };

    cell.sharedModel.changed.connect(onSourceChanged);
    disconnects.push(() => cell.sharedModel.changed.disconnect(onSourceChanged));

    this._cellListeners.set(cell.id, () => {
      disconnects.forEach(fn => fn());
    });
  }

  /**
   * Inspect a cell model to see if it produced an execution error.
   */
  private _getCellError(cell: ICellModel): ICellErrorInfo {
    if (cell.type !== 'code') {
      return { hasError: false };
    }

    const model = cell as ICodeCellModel;
    if (!model.outputs) {
      return { hasError: false };
    }

    for (let i = 0; i < model.outputs.length; i++) {
      const output = model.outputs.get(i);
      if (output.type === 'error') {
        const errorJson = output.toJSON() as nbformat.IError;
        return {
          hasError: true,
          ename: errorJson.ename || 'Error',
          evalue: errorJson.evalue || '',
          traceback: errorJson.traceback || []
        };
      }
    }

    return { hasError: false };
  }

  /**
   * Handle clicking on a dot to scroll and focus the target cell.
   */
  private _onDotClick(index: number): void {
    if (index < 0 || index >= this.notebook.widgets.length) {
      return;
    }

    this.notebook.activeCellIndex = index;
    const cellWidget = this.notebook.widgets[index];
    if (cellWidget) {
      void this.notebook.scrollToCell(cellWidget, 'center');
    } else {
      void this.notebook.scrollToItem(index, 'center');
    }
    void NotebookActions.focusActiveCell(this.notebook);
  }

  /**
   * Display the floating preview card / tooltip for a dot.
   */
  private _showTooltip(
    cell: ICellModel,
    index: number,
    dotElement: HTMLElement
  ): void {
    this._hoveredCellId = cell.id;
    this._renderTooltipContent(cell, index);

    // Calculate position next to the dot
    const rect = dotElement.getBoundingClientRect();
    const tooltipX = rect.right + 10;
    let tooltipY = rect.top - 10;

    this._tooltip.style.display = 'block';
    this._tooltip.style.left = `${tooltipX}px`;
    this._tooltip.style.top = `${tooltipY}px`;

    // Ensure within window bounds
    const tooltipRect = this._tooltip.getBoundingClientRect();
    if (tooltipY + tooltipRect.height > window.innerHeight - 20) {
      tooltipY = Math.max(20, window.innerHeight - tooltipRect.height - 20);
      this._tooltip.style.top = `${tooltipY}px`;
    }
  }

  /**
   * Populate the tooltip HTML content based on cell state.
   */
  private _renderTooltipContent(cell: ICellModel, index: number): void {
    const errorInfo = this._getCellError(cell);
    const source = (cell.sharedModel.getSource() || '').trim();
    const lines = source ? source.split('\n') : [];
    const totalCells = this.notebook.model?.cells.length ?? 1;

    if (errorInfo.hasError) {
      const preview = lines.slice(0, 3).join('\n') + (lines.length > 3 ? '\n...' : '');
      this._tooltip.innerHTML = `
        <div class="jp-Notebook-navigationRail-tooltip-title jp-mod-error">${this._escape(
          errorInfo.ename ?? 'Error'
        )}</div>
        <div class="jp-Notebook-navigationRail-tooltip-message">${this._escape(
          this._stripAnsi(errorInfo.evalue ?? 'Execution failed')
        )}</div>
        ${
          preview
            ? `<pre class="jp-Notebook-navigationRail-tooltip-code">${this._escape(
                preview
              )}</pre>`
            : ''
        }
        <div class="jp-Notebook-navigationRail-tooltip-footer">Cell ${
          index + 1
        } of ${totalCells}</div>
      `;
    } else {
      const isMarkdown = cell.type === 'markdown';
      const firstLine = lines[0] || (isMarkdown ? 'Markdown Cell' : 'Empty Cell');
      const restLines = lines.slice(1, 4).join('\n') + (lines.length > 4 ? '\n...' : '');

      this._tooltip.innerHTML = `
        <div class="jp-Notebook-navigationRail-tooltip-title">${this._escape(
          firstLine
        )}</div>
        ${
          restLines
            ? `<pre class="jp-Notebook-navigationRail-tooltip-code">${this._escape(
                restLines
              )}</pre>`
            : ''
        }
        <div class="jp-Notebook-navigationRail-tooltip-footer">Cell ${
          index + 1
        } of ${totalCells}</div>
      `;
    }
  }

  /**
   * Hide the floating tooltip.
   */
  private _hideTooltip(): void {
    this._hoveredCellId = null;
    this._tooltip.style.display = 'none';
  }

  /**
   * Truncate code or markdown source to a reasonable number of lines.
   */
  private _truncateSource(source: string, maxLines: number): string {
    const lines = source.trim().split('\n');
    if (lines.length <= maxLines) {
      return lines.join('\n');
    }
    return lines.slice(0, maxLines).join('\n') + '\n...';
  }

  /**
   * Escape special HTML characters.
   */
  private _escape(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Strip ANSI escape sequences from traceback and error strings.
   */
  private _stripAnsi(str: string): string {
    // eslint-disable-next-line no-control-regex
    return str.replace(/\u001b\[[0-9;]*m/g, '');
  }

  /**
   * Handle after-attach event.
   */
  protected onAfterAttach(msg: Message): void {
    super.onAfterAttach(msg);
    this.updateDots();
  }
}

/**
 * Namespace for NotebookNavigationRail options.
 */
export namespace NotebookNavigationRail {
  export interface IOptions {
    /**
     * The notebook instance.
     */
    notebook: Notebook;

    /**
     * The translation bundle.
     */
    translator?: ITranslator;
  }
}
