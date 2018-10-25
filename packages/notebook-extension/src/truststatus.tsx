import React from 'react';

import { JupyterLabPlugin, JupyterLab } from '@jupyterlab/application';

import { VDomRenderer, VDomModel } from '@jupyterlab/apputils';

import {
  INotebookTracker,
  NotebookPanel,
  INotebookModel,
  Notebook
} from '@jupyterlab/notebook';

import { Cell } from '@jupyterlab/cells';

import { IconItem, IStatusBar } from '@jupyterlab/statusbar';

import { toArray } from '@phosphor/algorithm';

/**
 * Determine the notebook trust status message.
 */
function cellTrust(
  props: NotebookTrustComponent.IProps | NotebookTrust.Model
): string[] {
  if (props.trustedCells === props.totalCells) {
    return [
      `Notebook trusted: ${props.trustedCells} of ${
        props.totalCells
      } cells trusted.`,
      'trusted-item'
    ];
  } else if (props.activeCellTrusted) {
    return [
      `Active cell trusted: ${props.trustedCells} of ${
        props.totalCells
      } cells trusted. `,
      'trusted-item'
    ];
  } else {
    return [
      `Notebook not trusted: ${props.trustedCells} of ${
        props.totalCells
      } cells trusted.`,
      'not-trusted-item'
    ];
  }
}

/**
 * A pure function for a notebook trust status component.
 *
 * @param props: the props for the component.
 *
 * @returns a tsx component for notebook trust.
 */
function NotebookTrustComponent(
  props: NotebookTrustComponent.IProps
): React.ReactElement<NotebookTrustComponent.IProps> {
  const source = cellTrust(props)[1];
  return <IconItem source={source} offset={{ x: 0, y: 2 }} />;
}

/**
 * A namespace for NotebookTrustComponent statics.
 */
namespace NotebookTrustComponent {
  /**
   * Props for the NotebookTrustComponent.
   */
  export interface IProps {
    /**
     * Whether all the cells are trusted.
     */
    allCellsTrusted: boolean;

    /**
     * Whether the currently active cell is trusted.
     */
    activeCellTrusted: boolean;

    /**
     * The total number of cells for the current notebook.
     */
    totalCells: number;

    /**
     * The number of trusted cells for the current notebook.
     */
    trustedCells: number;
  }
}

/**
 * The NotebookTrust status item.
 */
class NotebookTrust extends VDomRenderer<NotebookTrust.Model> {
  /**
   * Construct a new status item.
   */
  constructor(opts: NotebookTrust.IOptions) {
    super();
    this._tracker = opts.tracker;
    this._tracker.currentChanged.connect(this._onNotebookChange);
    this.model = new NotebookTrust.Model(
      this._tracker.currentWidget && this._tracker.currentWidget.content
    );

    this.title.caption = cellTrust(this.model)[0];
  }

  /**
   * Render the NotebookTrust status item.
   */
  render() {
    this.node.title = cellTrust(this.model)[0];
    return (
      <div>
        <NotebookTrustComponent
          allCellsTrusted={this.model.trustedCells === this.model.totalCells}
          activeCellTrusted={this.model.activeCellTrusted}
          totalCells={this.model.totalCells}
          trustedCells={this.model.trustedCells}
        />
      </div>
    );
  }

  /**
   * Dispose of the notebook trust item.
   */
  dispose() {
    super.dispose();
    this._tracker.currentChanged.disconnect(this._onNotebookChange);
  }

  /**
   * When update the trust model when the notebook changes.
   */
  private _onNotebookChange(
    tracker: INotebookTracker,
    notebook: NotebookPanel | null
  ): void {
    if (notebook === null) {
      this.model.notebook = null;
    } else {
      this.model.notebook = notebook.content;
    }
  }

  private _tracker: INotebookTracker;
}

/**
 * A namespace for NotebookTrust statics.
 */
namespace NotebookTrust {
  /**
   * A VDomModel for the NotebookTrust status item.
   */
  export class Model extends VDomModel {
    /**
     * Construct a new NotebookTrust model.
     */
    constructor(notebook: Notebook | null) {
      super();
      this.notebook = notebook;
    }

    /**
     * The number of trusted cells in the current notebook.
     */
    get trustedCells(): number {
      return this._trustedCells;
    }

    /**
     * The total number of cells in the current notebook.
     */
    get totalCells() {
      return this._totalCells;
    }

    /**
     * Whether the active cell is trusted.
     */
    get activeCellTrusted() {
      return this._activeCellTrusted;
    }

    /**
     * The current notebook for the model.
     */
    get notebook() {
      return this._notebook;
    }
    set notebook(model: Notebook | null) {
      const oldNotebook = this._notebook;
      if (oldNotebook !== null) {
        oldNotebook.activeCellChanged.disconnect(this._onActiveCellChanged);

        oldNotebook.modelContentChanged.disconnect(this._onModelChanged);
      }

      const oldState = this._getAllState();
      this._notebook = model;
      if (this._notebook === null) {
        this._trustedCells = 0;
        this._totalCells = 0;
        this._activeCellTrusted = false;
      } else {
        // Add listeners
        this._notebook.activeCellChanged.connect(this._onActiveCellChanged);
        this._notebook.modelContentChanged.connect(this._onModelChanged);

        // Derive values
        if (this._notebook.activeCell !== undefined) {
          this._activeCellTrusted = this._notebook!.activeCell!.model.trusted;
        } else {
          this._activeCellTrusted = false;
        }

        const { total, trusted } = this._deriveCellTrustState(
          this._notebook.model
        );

        this._totalCells = total;
        this._trustedCells = trusted;
      }

      this._triggerChange(oldState, this._getAllState());
    }

    /**
     * When the notebook model changes, update the trust state.
     */
    private _onModelChanged(notebook: Notebook): void {
      const oldState = this._getAllState();
      const { total, trusted } = this._deriveCellTrustState(notebook.model);

      this._totalCells = total;
      this._trustedCells = trusted;
      this._triggerChange(oldState, this._getAllState());
    }

    /**
     * When the active cell changes, update the trust state.
     */
    private _onActiveCellChanged = (model: Notebook, cell: Cell | null) => {
      const oldState = this._getAllState();
      if (cell) {
        this._activeCellTrusted = cell.model.trusted;
      } else {
        this._activeCellTrusted = false;
      }
      this._triggerChange(oldState, this._getAllState());
    };

    /**
     * Given a notebook model, figure out how many of the cells are trusted.
     */
    private _deriveCellTrustState(
      model: INotebookModel
    ): { total: number; trusted: number } {
      let cells = toArray(model.cells);

      let trusted = cells.reduce((accum, current) => {
        if (current.trusted) {
          return accum + 1;
        } else {
          return accum;
        }
      }, 0);

      let total = cells.length;

      return {
        total,
        trusted
      };
    }

    /**
     * Get the current state of the model.
     */
    private _getAllState(): [number, number, boolean] {
      return [this._trustedCells, this._totalCells, this.activeCellTrusted];
    }

    /**
     * Trigger a change in the renderer.
     */
    private _triggerChange(
      oldState: [number, number, boolean],
      newState: [number, number, boolean]
    ) {
      if (
        oldState[0] !== newState[0] ||
        oldState[1] !== newState[1] ||
        oldState[2] !== newState[2]
      ) {
        this.stateChanged.emit(void 0);
      }
    }

    private _trustedCells: number = 0;
    private _totalCells: number = 0;
    private _activeCellTrusted: boolean = false;
    private _notebook: Notebook | null = null;
  }

  /**
   * Options for creating a NotebookTrust status item.
   */
  export interface IOptions {
    tracker: INotebookTracker;
  }
}

/**
 * A plugin that adds a notebook trust status item to the status bar.
 */
export const notebookTrustItem: JupyterLabPlugin<void> = {
  id: '@jupyterlab/notebook-extension:trust-status',
  autoStart: true,
  requires: [IStatusBar, INotebookTracker],
  activate: (
    app: JupyterLab,
    statusBar: IStatusBar,
    tracker: INotebookTracker
  ) => {
    const item = new NotebookTrust({ tracker });

    statusBar.registerStatusItem('notebook-trust-item', item, {
      align: 'right',
      rank: 3,
      isActive: () =>
        app.shell.currentWidget &&
        tracker.currentWidget &&
        app.shell.currentWidget === tracker.currentWidget
    });
  }
};
