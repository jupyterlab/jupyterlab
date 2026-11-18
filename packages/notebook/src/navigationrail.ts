// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import type { ICellModel, ICodeCellModel } from '@jupyterlab/cells';
import type { IChangedArgs } from '@jupyterlab/coreutils';
import type * as nbformat from '@jupyterlab/nbformat';
import type { ITranslator, TranslationBundle } from '@jupyterlab/translation';
import { nullTranslator } from '@jupyterlab/translation';
import type { Message } from '@lumino/messaging';
import { Widget } from '@lumino/widgets';
import { NotebookActions } from './actions';
import type { Notebook } from './widget';

const NAVIGATION_RAIL_CLASS = 'jp-Notebook-navigationRail';
const TRACK_CLASS = 'jp-Notebook-navigationRail-track';
const LINE_CLASS = 'jp-Notebook-navigationRail-line';
const TOOLTIP_CLASS = 'jp-Notebook-navigationRail-tooltip';
const ACTIVE_LINE_CLASS = 'jp-mod-active';
const ERROR_LINE_CLASS = 'jp-mod-error';
const RUNNING_LINE_CLASS = 'jp-mod-running';
const LINE_SPACING = 16;
const MAX_TRACK_HEIGHT = 360;
const MIN_HIT_HEIGHT = 4;
const MAX_HIT_HEIGHT = 10;
const ANSI_ESCAPE_REGEX = new RegExp(
  `${String.fromCharCode(0x1b)}\\[[0-9;]*m`,
  'g'
);

export interface ICellErrorInfo {
  hasError: boolean;
  ename?: string;
  evalue?: string;
}

/**
 * A vertical cell navigation rail with active, running, and error indicators.
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
    this.node.setAttribute('role', 'navigation');
    this.node.setAttribute(
      'aria-label',
      this._trans.__('Cell navigation rail')
    );

    this._track = document.createElement('div');
    this._track.className = TRACK_CLASS;
    this.node.appendChild(this._track);

    this._tooltip = document.createElement('div');
    this._tooltip.className = TOOLTIP_CLASS;
    this._tooltip.setAttribute('role', 'tooltip');
    this._tooltip.style.display = 'none';
    document.body.appendChild(this._tooltip);

    this._setupNotebookListeners();
    this._updateLines();
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
  private _cellListeners: Map<string, () => void> = new Map();
  private _hoveredCellId: string | null = null;
  private _connectedModel: Notebook['model'] = null;

  /**
   * Dispose of the resources used by the widget.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }

    this._clearCellListeners();
    this._disconnectNotebookListeners();

    if (this._tooltip && this._tooltip.parentNode) {
      this._tooltip.parentNode.removeChild(this._tooltip);
    }

    super.dispose();
  }

  /**
   * Set up listeners for notebook-level events.
   */
  private _setupNotebookListeners(): void {
    this.notebook.activeCellChanged.connect(this._onActiveCellChanged, this);
    this.notebook.modelChanged.connect(this._onModelChanged, this);

    this._connectModelCells();
  }

  /**
   * Connect to the current notebook model's cell list.
   */
  private _connectModelCells(): void {
    this._connectedModel = this.notebook.model;
    this._connectedModel?.cells.changed.connect(this._onCellsChanged, this);
  }

  /**
   * Disconnect all notebook-level listeners.
   */
  private _disconnectNotebookListeners(): void {
    this.notebook.activeCellChanged.disconnect(this._onActiveCellChanged, this);
    this.notebook.modelChanged.disconnect(this._onModelChanged, this);
    this._connectedModel?.cells.changed.disconnect(this._onCellsChanged, this);
    this._connectedModel = null;
  }

  /**
   * Handle when the notebook model changes.
   */
  private _onModelChanged(): void {
    this._connectedModel?.cells.changed.disconnect(this._onCellsChanged, this);
    this._connectedModel = null;
    this._clearCellListeners();
    this._connectModelCells();
    this._updateLines();
  }

  /**
   * Handle changes in the list of cells (addition, removal, movement).
   */
  private _onCellsChanged(): void {
    this._updateLines();
  }

  /**
   * Handle changes to the active cell.
   */
  private _onActiveCellChanged(): void {
    const activeIndex = this.notebook.activeCellIndex;
    Array.from(this._track.children).forEach((line, index) => {
      const isActive = index === activeIndex;
      line.classList.toggle(ACTIVE_LINE_CLASS, isActive);
      if (isActive) {
        line.setAttribute('aria-current', 'true');
      } else {
        line.removeAttribute('aria-current');
      }
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
   * Re-render one line marker for each cell in the notebook model.
   */
  private _updateLines(): void {
    this._clearCellListeners();
    this._track.replaceChildren();

    if (!this.notebook.model) {
      this._track.style.height = '0';
      this._hideTooltip();
      return;
    }

    const cells = Array.from(this.notebook.model.cells);
    const activeIndex = this.notebook.activeCellIndex;
    const total = cells.length;
    const trackHeight = Math.min(total * LINE_SPACING, MAX_TRACK_HEIGHT);
    this._track.style.height = `${trackHeight}px`;
    if (total > 0) {
      const hitHeight = Math.max(
        MIN_HIT_HEIGHT,
        Math.min(MAX_HIT_HEIGHT, Math.floor(trackHeight / total))
      );
      this._track.style.setProperty(
        '--jp-nav-rail-hit-height',
        `${hitHeight}px`
      );
    }

    if (
      this._hoveredCellId &&
      !cells.some(cell => cell.id === this._hoveredCellId)
    ) {
      this._hideTooltip();
    }

    for (let i = 0; i < cells.length; i++) {
      const cell = cells[i];
      const line = this._createLine(cell, i, total);

      if (i === activeIndex) {
        line.classList.add(ACTIVE_LINE_CLASS);
        line.setAttribute('aria-current', 'true');
      }

      this._track.appendChild(line);
      this._attachCellListeners(cell, line, i, total);
    }
    this._updateLinePositions();
  }

  /**
   * Position markers evenly in the compact overview track.
   */
  private _updateLinePositions(): void {
    const total = this._track.children.length;
    if (total === 0) {
      return;
    }

    Array.from(this._track.children).forEach((child, index) => {
      (child as HTMLElement).style.top = `${((index + 0.5) / total) * 100}%`;
    });
  }

  /**
   * Create a line marker for one cell.
   */
  private _createLine(
    cell: ICellModel,
    index: number,
    total: number
  ): HTMLElement {
    const line = document.createElement('button');
    line.className = LINE_CLASS;
    line.type = 'button';
    line.setAttribute('tabindex', '-1');
    line.dataset.cellId = cell.id;
    line.dataset.index = `${index}`;
    line.dataset.type = cell.type;

    const errorInfo = this._getCellError(cell);
    if (errorInfo.hasError) {
      line.classList.add(ERROR_LINE_CLASS);
      line.setAttribute(
        'aria-label',
        this._trans.__(
          'Error in cell %1 of %2: %3',
          index + 1,
          total,
          errorInfo.ename ?? 'Error'
        )
      );
    } else {
      line.setAttribute(
        'aria-label',
        this._trans.__('Cell %1 of %2', index + 1, total)
      );
    }

    if (cell.type === 'code') {
      const codeModel = cell as ICodeCellModel;
      if (codeModel.executionState === 'running') {
        line.classList.add(RUNNING_LINE_CLASS);
      }
    }

    line.addEventListener('click', event => {
      event.stopPropagation();
      this._onLineClick(index);
    });

    line.addEventListener('mouseenter', () => {
      this._showTooltip(cell, index, line);
    });

    line.addEventListener('mouseleave', () => {
      this._hideTooltip();
    });

    return line;
  }

  /**
   * Attach reactive signal listeners for a cell model.
   */
  private _attachCellListeners(
    cell: ICellModel,
    line: HTMLElement,
    index: number,
    total: number
  ): void {
    const disconnects: Array<() => void> = [];

    if (cell.type === 'code') {
      const codeModel = cell as ICodeCellModel;
      const outputs = codeModel.outputs;

      const onOutputsChanged = () => {
        const errorInfo = this._getCellError(codeModel);
        line.classList.toggle(ERROR_LINE_CLASS, errorInfo.hasError);
        if (errorInfo.hasError) {
          line.setAttribute(
            'aria-label',
            this._trans.__(
              'Error in cell %1 of %2: %3',
              index + 1,
              total,
              errorInfo.ename ?? 'Error'
            )
          );
        } else {
          line.setAttribute(
            'aria-label',
            this._trans.__('Cell %1 of %2', index + 1, total)
          );
        }

        // If tooltip currently open for this cell, refresh it
        if (this._hoveredCellId === cell.id) {
          this._renderTooltipContent(cell, index);
        }
      };

      const onStateChanged = (
        _: ICellModel,
        change: IChangedArgs<unknown, unknown>
      ) => {
        if (change.name === 'executionState') {
          line.classList.toggle(
            RUNNING_LINE_CLASS,
            codeModel.executionState === 'running'
          );
        }
        if (this._hoveredCellId === cell.id) {
          this._renderTooltipContent(cell, index);
        }
      };

      if (outputs) {
        outputs.changed.connect(onOutputsChanged);
        disconnects.push(() => outputs.changed.disconnect(onOutputsChanged));
      }

      codeModel.stateChanged.connect(onStateChanged);
      disconnects.push(() => codeModel.stateChanged.disconnect(onStateChanged));
    }

    const sharedModel = cell.sharedModel;
    const onSourceChanged = () => {
      if (this._hoveredCellId === cell.id) {
        this._renderTooltipContent(cell, index);
      }
    };

    sharedModel.changed.connect(onSourceChanged);
    disconnects.push(() => sharedModel.changed.disconnect(onSourceChanged));

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
          evalue: errorJson.evalue || ''
        };
      }
    }

    return { hasError: false };
  }

  /**
   * Handle clicking a line to scroll to and focus its cell.
   */
  private _onLineClick(index: number): void {
    if (index < 0 || index >= this._track.children.length) {
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
   * Display the floating preview card for a cell line.
   */
  private _showTooltip(
    cell: ICellModel,
    index: number,
    lineElement: HTMLElement
  ): void {
    this._hoveredCellId = cell.id;
    this._renderTooltipContent(cell, index);

    // Calculate position next to the line marker
    const rect = lineElement.getBoundingClientRect();
    let tooltipX = rect.right + 10;
    let tooltipY = Math.max(8, rect.top - 10);

    this._tooltip.style.display = 'block';
    this._tooltip.style.left = `${tooltipX}px`;
    this._tooltip.style.top = `${tooltipY}px`;

    // Ensure within window bounds
    const tooltipRect = this._tooltip.getBoundingClientRect();
    if (tooltipX + tooltipRect.width > window.innerWidth - 12) {
      tooltipX = Math.max(12, window.innerWidth - tooltipRect.width - 12);
      this._tooltip.style.left = `${tooltipX}px`;
    }
    if (tooltipY + tooltipRect.height > window.innerHeight - 12) {
      tooltipY = Math.max(8, window.innerHeight - tooltipRect.height - 12);
      this._tooltip.style.top = `${tooltipY}px`;
    }
  }

  /**
   * Populate the tooltip DOM content using native cell typography.
   */
  private _renderTooltipContent(cell: ICellModel, index: number): void {
    const errorInfo = this._getCellError(cell);
    const source = (cell.sharedModel.getSource() || '').trim();
    const lines = source ? source.split('\n') : [];
    const totalCells = Math.max(
      this.notebook.model?.cells.length ?? 0,
      this._track.children.length
    );
    const cellLabel = this._trans.__('Cell %1 of %2', index + 1, totalCells);

    this._tooltip.replaceChildren();

    const header = document.createElement('div');
    header.className = 'jp-Notebook-navigationRail-tooltip-header';
    header.textContent = cellLabel;
    this._tooltip.appendChild(header);

    if (cell.type === 'markdown') {
      if (lines.length > 0) {
        const container = document.createElement('div');
        container.className = 'jp-Notebook-navigationRail-tooltip-markdown';

        const headingMatch = /^#{1,6}[ \t]+(\S.*)$/.exec(lines[0]);
        if (headingMatch) {
          const heading = document.createElement('div');
          heading.className =
            'jp-Notebook-navigationRail-tooltip-markdown-heading';
          heading.textContent = headingMatch[1];
          container.appendChild(heading);
        }

        const bodyLines = (headingMatch ? lines.slice(1, 4) : lines.slice(0, 4))
          .map(line => line.trim())
          .filter(Boolean);
        if (bodyLines.length > 0) {
          const body = document.createElement('div');
          body.className = 'jp-Notebook-navigationRail-tooltip-markdown-body';
          body.textContent =
            bodyLines.join('\n') + (lines.length > 4 ? '\n...' : '');
          container.appendChild(body);
        }

        this._tooltip.appendChild(container);
      } else {
        const empty = document.createElement('div');
        empty.className = 'jp-Notebook-navigationRail-tooltip-empty';
        empty.textContent = this._trans.__('Empty markdown cell');
        this._tooltip.appendChild(empty);
      }
    } else if (lines.length > 0) {
      const code = document.createElement('pre');
      code.className = 'jp-Notebook-navigationRail-tooltip-code';
      code.textContent =
        lines.slice(0, 4).join('\n') + (lines.length > 4 ? '\n...' : '');
      this._tooltip.appendChild(code);
    } else {
      const empty = document.createElement('div');
      empty.className = 'jp-Notebook-navigationRail-tooltip-empty';
      empty.textContent =
        cell.type === 'raw'
          ? this._trans.__('Empty raw cell')
          : this._trans.__('Empty cell');
      this._tooltip.appendChild(empty);
    }

    if (errorInfo.hasError) {
      const errorEl = document.createElement('div');
      errorEl.className = 'jp-Notebook-navigationRail-tooltip-error';

      const nameEl = document.createElement('span');
      nameEl.className = 'jp-Notebook-navigationRail-tooltip-error-name';
      nameEl.textContent = errorInfo.ename || this._trans.__('Error');
      errorEl.appendChild(nameEl);

      const evalue = this._stripAnsi(
        errorInfo.evalue || this._trans.__('Execution failed')
      );
      errorEl.appendChild(document.createTextNode(`: ${evalue}`));
      this._tooltip.appendChild(errorEl);
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
   * Strip ANSI escape sequences from traceback and error strings.
   */
  private _stripAnsi(str: string): string {
    return str.replace(ANSI_ESCAPE_REGEX, '');
  }

  /**
   * Show or hide the navigation rail, ensuring any open tooltip is closed.
   */
  setHidden(hidden: boolean): void {
    if (hidden) {
      this._hideTooltip();
    }
    super.setHidden(hidden);
  }

  /**
   * Handle after-attach event.
   */
  protected onAfterAttach(msg: Message): void {
    super.onAfterAttach(msg);
    this._updateLines();
  }

  /**
   * Handle before-hide event.
   */
  protected onBeforeHide(msg: Message): void {
    this._hideTooltip();
    super.onBeforeHide(msg);
  }

  /**
   * Handle before-detach event.
   */
  protected onBeforeDetach(msg: Message): void {
    this._hideTooltip();
    super.onBeforeDetach(msg);
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
