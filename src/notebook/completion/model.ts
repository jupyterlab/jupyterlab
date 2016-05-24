// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import {
  IDisposable
} from 'phosphor-disposable';

import {
  ISignal, Signal, clearSignalData
} from 'phosphor-signaling';

import {
  ICompletionRequest, ITextChange
} from '../editor/model';


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
   * The original completion request details.
   */
  original: ICompletionRequest;

  /**
   * The current text change details.
   */
  current: ITextChange;
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
  set options(options: string[]) {
    this._options = options;
    this.optionsChanged.emit(void 0);
  }

  /**
   * The original completion request details.
   */
  get original(): ICompletionRequest {
    return this._original;
  }
  set original(request: ICompletionRequest) {
    this._original = request;
    this._current = null;
  }

  /**
   * The current text change details.
   */
  get current(): ITextChange {
    return this._current;
  }
  set current(change: ITextChange) {
    this._current = change;
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
  private _original: ICompletionRequest = null;
  private _current: ITextChange = null;
}


namespace Private {
  /**
   * A signal emitted when choosable completion options change.
   */
  export
  const optionsChangedSignal = new Signal<ICompletionModel, void>();
}
