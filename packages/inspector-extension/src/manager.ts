// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  IDisposable
} from '@phosphor/disposable';

import {
  IInspector, InspectorPanel
} from '@jupyterlab/inspector';


/**
 * A class that manages inspector widget instances and offers persistent
 * `IInspector` instance that other plugins can communicate with.
 */
export
class InspectorManager implements IInspector {
  /**
   * The current inspector widget.
   */
  get inspector(): InspectorPanel {
    return this._inspector;
  }
  set inspector(inspector: InspectorPanel) {
    if (this._inspector === inspector) {
      return;
    }
    this._inspector = inspector;
    // If an inspector was added and it has no source
    if (inspector && !inspector.source) {
      inspector.source = this._source;
    }
  }

  /**
   * The source of events the inspector panel listens for.
   */
  get source(): IInspector.IInspectable {
    return this._source;
  }
  set source(source: IInspector.IInspectable) {
    if (this._source === source) {
      return;
    }

    if (this._source) {
      this._source.disposed.disconnect(this._onSourceDisposed, this);
    }

    this._source = source;

    if (this._inspector && !this._inspector.isDisposed) {
      this._inspector.source = this._source;
    }

    if (this._source) {
      this._source.disposed.connect(this._onSourceDisposed, this);
    }
  }

  /**
   * Create an inspector child item and return a disposable to remove it.
   *
   * @param item - The inspector child item being added to the inspector.
   *
   * @returns A disposable that removes the child item from the inspector.
   */
  add(item: IInspector.IInspectorItem): IDisposable {
    if (!this._inspector) {
      throw new Error('Cannot add child item before creating an inspector.');
    }
    return this._inspector.add(item);
  }

  /**
   * Handle the source disposed signal.
   */
  private _onSourceDisposed() {
    this._source = null;
  }

  private _inspector: InspectorPanel = null;
  private _source: IInspector.IInspectable = null;
}
