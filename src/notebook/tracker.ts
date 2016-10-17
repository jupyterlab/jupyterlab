// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  DisposableDelegate
} from 'phosphor/lib/core/disposable';

import {
  defineSignal, ISignal
} from 'phosphor/lib/core/signaling';

import {
  Token
} from 'phosphor/lib/core/token';

import {
  IInstanceTracker, InstanceTracker
} from '../common/instancetracker';

import {
  NotebookPanel
} from './';

import {
  BaseCellWidget
} from './cells';


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
  activeCell: BaseCellWidget;

  /**
   * A signal emitted when the current active cell changes.
   *
   * #### Notes
   * If there is no cell with the focus, then `null` will be emitted.
   */
  activeCellChanged: ISignal<this, BaseCellWidget>;
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
    return widget.content.activeCell || null;
  }

  /**
   * A signal emitted when the current active cell changes.
   *
   * #### Notes
   * If there is no cell with the focus, then `null` will be emitted.
   */
  activeCellChanged: ISignal<this, BaseCellWidget>;

  /**
   * Dispose of the resources held by the tracker.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    super.dispose();
    if (this._handler) {
      this._handler.dispose();
      this._handler = null;
    }
  }

  /**
   * Handle the current change event.
   */
  protected onCurrentChanged(): void {
    if (this._handler) {
      this._handler.dispose();
    }

    let widget = this.currentWidget;
    if (!widget) {
      return;
    }

    // Create a signal handler for cell changes.
    let changeHandler = (sender: any, cell: BaseCellWidget) => {
      this.activeCellChanged.emit(cell || null);
    };

    // Connect the signal handler to the current notebook panel.
    widget.content.activeCellChanged.connect(changeHandler);
    this._handler = new DisposableDelegate(() => {
      // Only disconnect if the widget still exists.
      if (!widget.isDisposed) {
        widget.content.activeCellChanged.disconnect(changeHandler);
      }
    });

    // Since the notebook has changed, immediately signal an active cell change.
    this.activeCellChanged.emit(widget.content.activeCell || null);
  }

  private _handler: DisposableDelegate = null;
}

// Define the signals for the `NotebookTracker` class.
defineSignal(InstanceTracker.prototype, 'activeCellChanged');
