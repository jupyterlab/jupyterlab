/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import React from 'react';

import { Dialog } from '@jupyterlab/apputils';
import { Cell, ICellModel } from '@jupyterlab/cells';
import {
  IObservableList,
  IObservableUndoableList
} from '@jupyterlab/observables';
import { interactiveItem } from '@jupyterlab/statusbar';
import { ITranslator, nullTranslator } from '@jupyterlab/translation';
import {
  notTrustedIcon,
  trustedIcon,
  VDomModel,
  VDomRenderer
} from '@jupyterlab/ui-components';
import { toArray } from '@lumino/algorithm';

import { INotebookModel } from './model';
import { NotebookPanel } from './panel';
import { Notebook } from './widget';

/**
 * Determine the notebook trust status message.
 */
function cellTrust(
  props: NotebookTrustComponent.IProps | NotebookTrustStatus.Model,
  translator?: ITranslator
): string[] {
  translator = translator || nullTranslator;
  const trans = translator.load('jupyterlab');

  if (props.trustedCells === props.totalCells) {
    return [
      trans.__(
        'Notebook trusted: %1 of %2 cells trusted.',
        props.trustedCells,
        props.totalCells
      ),
      'jp-StatusItem-trusted'
    ];
  } else if (props.activeCellTrusted) {
    return [
      trans.__(
        'Active cell trusted: %1 of %2 cells trusted.',
        props.trustedCells,
        props.totalCells
      ),
      'jp-StatusItem-trusted'
    ];
  } else {
    return [
      trans.__(
        'Notebook not trusted: %1 of %2 cells trusted.',
        props.trustedCells,
        props.totalCells
      ),
      'jp-StatusItem-untrusted'
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
export class NotebookTrustStatus extends VDomRenderer<NotebookTrustStatus.Model> {
  /**
   * Construct a new status item.
   */
  constructor(translator?: ITranslator) {
    super(new NotebookTrustStatus.Model());
    this.translator = translator || nullTranslator;
    this.addClass(interactiveItem);
  }

  /**
   * Open a dialog on NotebookTrust status item click event.
   * Users can choose to untrust, trust or always trust the contents of
   * the notebook.
   */
  async trustIconOnClick(): Promise<void> {
    const dialog = NotebookTrustStatus.trustDialog(this.translator);
    const result = await dialog.launch();
    let action = result.button.actions[0] as
      | 'no'
      | 'yes'
      | 'always'
      | undefined;
    if (!action) {
      return;
    }
    this.model.toggleTrustNotebook(action !== 'no');
    if (action === 'always') {
      this.model.alwaysTrustNotebook();
    }
    this.update();
  }

  /**
   * Render the NotebookTrust status item.
   */
  render(): JSX.Element | null {
    if (!this.model) {
      return null;
    }
    this.node.title = cellTrust(this.model, this.translator)[0];
    return (
      <div onClick={this.trustIconOnClick.bind(this)}>
        <NotebookTrustComponent
          allCellsTrusted={this.model.trustedCells === this.model.totalCells}
          activeCellTrusted={this.model.activeCellTrusted}
          totalCells={this.model.totalCells}
          trustedCells={this.model.trustedCells}
        />
      </div>
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
     * The number of trusted cells in the current notebook.
     */
    get trustedCells(): number {
      return this._trustedCells;
    }

    /**
     * The total number of cells in the current notebook.
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
    get notebook(): NotebookPanel | null {
      return this._notebook;
    }
    set notebook(model: NotebookPanel | null) {
      const oldNotebook = this._notebook?.content;
      if (oldNotebook) {
        oldNotebook.activeCellChanged.disconnect(
          this._onActiveCellChanged,
          this
        );
        if (oldNotebook.model) {
          oldNotebook.model.cells.changed.disconnect(this.trustCell);
        }
        oldNotebook.modelContentChanged.disconnect(this._onModelChanged, this);
      }

      const oldState = this._getAllState();
      this._notebook = model;
      const newNotebook = this._notebook?.content;
      if (this._notebook === null || !newNotebook) {
        this._trustedCells = 0;
        this._totalCells = 0;
        this._activeCellTrusted = false;
      } else {
        // Add listeners
        newNotebook.activeCellChanged.connect(this._onActiveCellChanged, this);
        newNotebook.modelContentChanged.connect(this._onModelChanged, this);

        // Derive values
        if (newNotebook.activeCell) {
          this._activeCellTrusted = newNotebook.activeCell.model.trusted;
        } else {
          this._activeCellTrusted = false;
        }

        const { total, trusted } = this._deriveCellTrustState(
          this._notebook.model
        );

        this._totalCells = total;
        this._trustedCells = trusted;
        newNotebook.disposed.connect(() => {
          if (newNotebook.model) {
            newNotebook.model.cells.changed.disconnect(this.trustCell);
          }
        });
      }

      this._triggerChange(oldState, this._getAllState());
    }

    /**
     * When the cell list is changed, trust the added cell.
     */
    trustCell(
      _: IObservableUndoableList<ICellModel>,
      args: IObservableList.IChangedArgs<ICellModel>
    ): void {
      if (args.type === 'add') {
        args.newValues.forEach(cell => {
          cell.trusted = true;
        });
      }
    }

    /**
     * Toggle the trust status of all cells in notebook
     */
    toggleTrustNotebook(trust: boolean): void {
      if (this._notebook) {
        const { context, content } = this._notebook;
        if (!content.model) {
          return;
        }
        const cells = toArray(content.model.cells);
        cells.forEach(cell => (cell.trusted = trust));
        context.save().catch(console.error);
        if (!trust) {
          content.model.cells.changed.disconnect(this.trustCell);
        }
        this._onModelChanged(content);
      }
    }

    /**
     * Trust all current cells and any new cell added to the
     * notebook automatically.
     */
    alwaysTrustNotebook(): void {
      if (this._notebook) {
        const { content } = this._notebook;
        if (!content.model) {
          return;
        }
        this.toggleTrustNotebook(true);
        content.model.cells.changed.connect(this.trustCell);
      }
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
     * Given a notebook model, figure out how many of the cells are trusted.
     */
    private _deriveCellTrustState(model: INotebookModel | null): {
      total: number;
      trusted: number;
    } {
      if (model === null) {
        return { total: 0, trusted: 0 };
      }
      const cells = toArray(model.cells);

      const trusted = cells.reduce((accum, current) => {
        if (current.trusted) {
          return accum + 1;
        } else {
          return accum;
        }
      }, 0);

      const total = cells.length;

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
    private _notebook: NotebookPanel | null = null;
  }

  /**
   * Create the trust dialog asking users for the trust status of notebook.
   */
  export function trustDialog(translator?: ITranslator): Dialog<any> {
    const trans =
      translator?.load('jupyterlab') || nullTranslator.load('jupyterlab');
    const yesButton = Dialog.okButton({
      label: trans.__('Yes'),
      actions: ['yes']
    });
    const alwaysButton = Dialog.okButton({
      label: trans.__('Always'),
      actions: ['always']
    });
    const noButton = Dialog.warnButton({
      label: trans.__('No'),
      actions: ['no']
    });
    const trustMessage = (
      <p>
        {trans.__(
          'A trusted Jupyter notebook may execute hidden malicious code when you open it or from other users in a collaborative session.'
        )}
        <br />
        {trans.__(
          'Selecting "Yes" will re-render this notebook in a trusted state.'
        )}
        <br />
        {trans.__(
          'Selecting "Always" will trust all current contents and new contents coming from other users.'
        )}
        <br />
        {trans.__('For more information, see')}{' '}
        <a
          href="https://jupyter-server.readthedocs.io/en/stable/operators/security.html"
          target="_blank"
          rel="noopener noreferrer"
        >
          {trans.__('the Jupyter security documentation')}
        </a>
        .
      </p>
    );
    const options = {
      title: trans.__('Trust notebook content?'),
      body: trustMessage,
      buttons: [noButton, yesButton, alwaysButton]
    };
    const dialog = new Dialog(options);
    return dialog;
  }
}
