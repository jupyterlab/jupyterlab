// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  IInspector, Inspector
} from './';


/**
 * A class that manages inspector widget instances and offers persistent
 * `IInspector` instance that other plugins can communicate with.
 */
export
class InspectorManager implements IInspector {
  /**
   * The current inspector widget.
   */
  get inspector(): Inspector {
    return this._inspector;
  }
  set inspector(inspector: Inspector) {
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
  get source(): Inspector.IInspectable {
    return this._source;
  }
  set source(source: Inspector.IInspectable) {
    if (this._source !== source) {
      if (this._source) {
        this._source.disposed.disconnect(this._onSourceDisposed, this);
      }
      this._source = source;
      this._source.disposed.connect(this._onSourceDisposed, this);
    }
    if (this._inspector && !this._inspector.isDisposed) {
      this._inspector.source = this._source;
    }
  }

  /**
   * Handle the source disposed signal.
   */
  private _onSourceDisposed() {
    this._source = null;
  }

  private _inspector: Inspector = null;
  private _source: Inspector.IInspectable = null;
}
