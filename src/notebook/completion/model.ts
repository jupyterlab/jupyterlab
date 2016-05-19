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
  optionsChanged: ISignal<ICompletionModel, string[]>;
}

/**
 * An implementation of a console model.
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
  get optionsChanged(): ISignal<ICompletionModel, string[]> {
    return Private.optionsChangedSignal.bind(this);
  }

  /**
   * Dispose of the resources held by the model.
   *
   * #### Notes
   * This method is only really necessary in order for outstanding promises to
   * ignore their incoming results if no longer necessary.
   */
  dispose(): void {
    if (this.isDisposed) return;
    clearSignalData(this);
    this._isDisposed = true;
  }

  private _isDisposed = false;
}

namespace Private {
  /**
   * A signal emitted when choosable completion options change.
   */
  export
  const optionsChangedSignal = new Signal<ICompletionModel, string[]>();
}
