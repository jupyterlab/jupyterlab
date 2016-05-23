// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import {
  IDisposable
} from 'phosphor-disposable';

import {
  ISignal, Signal, clearSignalData
} from 'phosphor-signaling';


export
interface ICompletionModel extends IDisposable {
  /**
   * A signal emitted when choosable completion options change.
   */
  optionsChanged: ISignal<ICompletionModel, void>;

  /**
   * The list of filtered options, including any `<mark>`ed characters.
   */
  options: string[];

  /**
   * The query string used to filter options.
   */
  query: string;
}

/**
 * An implementation of a completion model.
 */
export
class CompletionModel implements ICompletionModel {
  /**
   * Get whether the model is disposed.
   */
  get isDisposed(): boolean {
    return this._isDisposed;
  }

  /**
   * A signal emitted when choosable completion options change.
   */
  get optionsChanged(): ISignal<ICompletionModel, void> {
    return Private.optionsChangedSignal.bind(this);
  }

  /**
   * The list of filtered options, including any `<mark>`ed characters.
   *
   * #### Notes
   * Setting the options means the raw, unfiltered complete list of options are
   * reset. Getting must only ever return the subset of options that have been
   * filtered against a query.
   */
  get options(): string[] {
    return this._filter();
  }
  set options(newValue: string[]) {
    // If the new value and the old value are falsey, return;
    if (newValue === this._options || !newValue && !this._options) {
      return;
    }
    if (newValue && this._options && newValue.join() === this._options.join()) {
      return;
    }
    this._options = newValue;
    this.optionsChanged.emit(void 0);
  }

  /**
   * The query string used to filter options.
   */
  get query(): string {
    return this._query;
  }
  set query(newValue: string) {
    this._query = newValue;
  }

  /**
   * Dispose of the resources held by the model.
   */
  dispose(): void {
    // Do nothing if already disposed.
    if (this.isDisposed) {
      return;
    }
    clearSignalData(this);
    this._isDisposed = true;
  }

  /**
   * Apply the query to the complete options list to return the matching subset.
   */
  private _filter(): string[] {
    return this._options;
  }

  private _isDisposed = false;
  private _options: string[] = null;
  private _query = '';
}


namespace Private {
  /**
   * A signal emitted when choosable completion options change.
   */
  export
  const optionsChangedSignal = new Signal<ICompletionModel, void>();
}
