// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  defineSignal, ISignal
} from '@phosphor/signaling';

import {
  Token
} from '@phosphor/application';

import {
  IInstanceTracker, InstanceTracker
} from '../common/instancetracker';

import {
  NotebookPanel, Notebook
} from './';

import {
  BaseCellWidget
} from '../cells';


/**
 * An object that tracks notebook widgets.
 */
export
interface INotebookTracker extends IInstanceTracker<NotebookPanel> {
  /**
   * The currently focused cell.
   *
   * #### Notes
   * If there is no cell with the focus, then this value is `null`.
   */
  readonly activeCell: BaseCellWidget;

  /**
   * A signal emitted when the current active cell changes.
   *
   * #### Notes
   * If there is no cell with the focus, then `null` will be emitted.
   */
  readonly activeCellChanged: ISignal<this, BaseCellWidget>;

  /**
   * A signal emitted when the selection state changes.
   */
  readonly selectionChanged: ISignal<this, void>;
}


/* tslint:disable */
/**
 * The notebook tracker token.
 */
export
const INotebookTracker = new Token<INotebookTracker>('jupyter.services.notebooks');
/* tslint:enable */


export
class NotebookTracker extends InstanceTracker<NotebookPanel> implements INotebookTracker {
  /**
   * The currently focused cell.
   *
   * #### Notes
   * This is a read-only property. If there is no cell with the focus, then this
   * value is `null`.
   */
  get activeCell(): BaseCellWidget {
    let widget = this.currentWidget;
    if (!widget) {
      return null;
    }
    return widget.notebook.activeCell || null;
  }

  /**
   * A signal emitted when the current active cell changes.
   *
   * #### Notes
   * If there is no cell with the focus, then `null` will be emitted.
   */
  readonly activeCellChanged: ISignal<this, BaseCellWidget>;

  /**
   * A signal emitted when the selection state changes.
   */
  readonly selectionChanged: ISignal<this, void>;

  /**
   * Add a new notebook panel to the tracker.
   *
   * @param panel - The notebook panel being added.
   */
  add(panel: NotebookPanel): Promise<void> {
    const promise = super.add(panel);
    panel.notebook.activeCellChanged.connect(this._onActiveCellChanged, this);
    panel.notebook.selectionChanged.connect(this._onSelectionChanged, this);
    return promise;
  }

  /**
   * Dispose of the resources held by the tracker.
   */
  dispose(): void {
    this._activeCell = null;
    super.dispose();
  }

  /**
   * Handle the current change event.
   */
  protected onCurrentChanged(): void {
    // Store an internal reference to active cell to prevent false positives.
    let activeCell = this.activeCell;
    if (activeCell && activeCell === this._activeCell) {
      return;
    }
    this._activeCell = activeCell;

    let widget = this.currentWidget;
    if (!widget) {
      return;
    }

    // Since the notebook has changed, immediately signal an active cell change.
    this.activeCellChanged.emit(widget.notebook.activeCell || null);
  }

  private _onActiveCellChanged(sender: Notebook, cell: BaseCellWidget): void {
    // Check if the active cell change happened for the current notebook.
    if (this.currentWidget && this.currentWidget.notebook === sender) {
      this._activeCell = cell || null;
      this.activeCellChanged.emit(this._activeCell);
    }
  }

  private _onSelectionChanged(sender: Notebook): void {
    // Check if the selection change happened for the current notebook.
    if (this.currentWidget && this.currentWidget.notebook === sender) {
      this.selectionChanged.emit(void 0);
    }
  }

  private _activeCell: BaseCellWidget | null = null;
}

// Define the signals for the `NotebookTracker` class.
defineSignal(NotebookTracker.prototype, 'activeCellChanged');
defineSignal(NotebookTracker.prototype, 'selectionChanged');
