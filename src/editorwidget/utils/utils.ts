// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  IDisposable
} from 'phosphor/lib/core/disposable';

export
class PropertyObserver<T> implements IDisposable {

  isDisposed:boolean;

  connect:(property:T)=>void;
  onChanged:(property:T)=>void;
  disconnect:(property:T)=>void; 

  private _property:T

  dispose() {
    if (this.isDisposed) {
      return;
    }
    this.isDisposed = true;
    if(this.disconnect) {
      this.disconnect(this._property);
    }
    const disposable = this._property as any;
    if (disposable && (<IDisposable>disposable).dispose) {
      disposable.dispose();
    }
    this._property = null;
  }

  get property(): T {
    return this._property;
  }

  set property(property:T) {
    if (!property && !this._property || property === this._property) {
      return;
    }
    if(this.connect) {
      this.connect(this._property);
    }
    this._property = property;
    if (this.onChanged) {
      this.onChanged(property);
    }
    if(this.disconnect) {
      this.disconnect(property);
    }
  }

}