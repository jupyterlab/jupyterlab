/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { Cell } from '@jupyterlab/cells';
import { ITranslator, nullTranslator } from '@jupyterlab/translation';
import {
  notTrustedIcon,
  trustedIcon,
  VDomModel,
  VDomRenderer
} from '@jupyterlab/ui-components';
import React from 'react';
import { INotebookModel, Notebook } from '.';

const TRUST_CLASS = 'jp-StatusItem-trust';

/**
 * Determine the notebook trust status message.
 */
function cellTrust(
  props: NotebookTrustComponent.IProps | NotebookTrustStatus.Model,
  translator?: ITranslator
): string {
  translator = translator || nullTranslator;
  const trans = translator.load('jupyterlab');

  if (props.trustedCells === props.totalCells) {
    return trans.__(
      'Notebook trusted: %1 of %2 code cells trusted.',
      props.trustedCells,
      props.totalCells
    );
  } else if (props.activeCellTrusted) {
    return trans.__(
      'Active cell trusted: %1 of %2 code cells trusted.',
      props.trustedCells,
      props.totalCells
    );
  } else {
    return trans.__(
      'Notebook not trusted: %1 of %2 code cells trusted.',
      props.trustedCells,
      props.totalCells
    );
  }
}

/**
 * A pure function for a notebook trust status component.
 *
 * @param props the props for the component.
 *
 * @returns a tsx component for notebook trust.
 */
function NotebookTrustComponent(
  props: NotebookTrustComponent.IProps
): React.ReactElement<NotebookTrustComponent.IProps> {
  if (props.allCellsTrusted) {
    return <trustedIcon.react top={'2px'} stylesheet={'statusBar'} />;
  } else {
    return <notTrustedIcon.react top={'2px'} stylesheet={'statusBar'} />;
  }
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
     * The total number of code cells for the current notebook.
     */
    totalCells: number;

    /**
     * The number of trusted code cells for the current notebook.
     */
    trustedCells: number;
  }
}

/**
 * The NotebookTrust status item.
 */
export class NotebookTrustStatus extends VDomRenderer<NotebookTrustStatus.Model> {
  /**
   * Construct a new status item.
   */
  constructor(translator?: ITranslator) {
    super(new NotebookTrustStatus.Model());
    this.translator = translator || nullTranslator;
    this.node.classList.add(TRUST_CLASS);
  }

  /**
   * Render the NotebookTrust status item.
   */
  render(): JSX.Element | null {
    if (!this.model) {
      return null;
    }
    const newTitle = cellTrust(this.model, this.translator);
    if (newTitle !== this.node.title) {
      this.node.title = newTitle;
    }
    return (
      <NotebookTrustComponent
        allCellsTrusted={this.model.trustedCells === this.model.totalCells}
        activeCellTrusted={this.model.activeCellTrusted}
        totalCells={this.model.totalCells}
        trustedCells={this.model.trustedCells}
      />
    );
  }

  translator: ITranslator;
}

/**
 * A namespace for NotebookTrust statics.
 */
export namespace NotebookTrustStatus {
  /**
   * A VDomModel for the NotebookTrust status item.
   */
  export class Model extends VDomModel {
    /**
     * The number of trusted code cells in the current notebook.
     */
    get trustedCells(): number {
      return this._trustedCells;
    }

    /**
     * The total number of code cells in the current notebook.
     */
    get totalCells(): number {
      return this._totalCells;
    }

    /**
     * Whether the active cell is trusted.
     */
    get activeCellTrusted(): boolean {
      return this._activeCellTrusted;
    }

    /**
     * The current notebook for the model.
     */
    get notebook(): Notebook | null {
      return this._notebook;
    }
    set notebook(model: Notebook | null) {
      const oldNotebook = this._notebook;
      if (oldNotebook !== null) {
        oldNotebook.activeCellChanged.disconnect(
          this._onActiveCellChanged,
          this
        );

        oldNotebook.modelContentChanged.disconnect(this._onModelChanged, this);
      }

      const oldState = this._getAllState();
      this._notebook = model;
      if (this._notebook === null) {
        this._trustedCells = 0;
        this._totalCells = 0;
        this._activeCellTrusted = false;
      } else {
        // Add listeners
        this._notebook.activeCellChanged.connect(
          this._onActiveCellChanged,
          this
        );
        this._notebook.modelContentChanged.connect(this._onModelChanged, this);

        // Derive values
        if (this._notebook.activeCell) {
          this._activeCellTrusted = this._notebook.activeCell.model.trusted;
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
    private _onActiveCellChanged(model: Notebook, cell: Cell | null): void {
      const oldState = this._getAllState();
      if (cell) {
        this._activeCellTrusted = cell.model.trusted;
      } else {
        this._activeCellTrusted = false;
      }
      this._triggerChange(oldState, this._getAllState());
    }

    /**
     * Given a notebook model, figure out how many of the code cells are trusted.
     */
    private _deriveCellTrustState(model: INotebookModel | null): {
      total: number;
      trusted: number;
    } {
      if (model === null) {
        return { total: 0, trusted: 0 };
      }
      let total = 0;
      let trusted = 0;
      for (const cell of model.cells) {
        if (cell.type !== 'code') {
          continue;
        }
        total++;
        if (cell.trusted) {
          trusted++;
        }
      }
      return { total, trusted };
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
}
