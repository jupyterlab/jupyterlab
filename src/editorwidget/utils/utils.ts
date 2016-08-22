// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  IDisposable
} from 'phosphor/lib/core/disposable';

/**
 * A property observer.
 */
export
class PropertyObserver<T> implements IDisposable {

  /**
   * Tests whether this observer is disposed.
   */
  isDisposed:boolean = false;

  /**
   * Callback to connect to a property. 
   */
  connect:(property:T)=>void;
  /**
   * Callback to hande changes of a property value.
   */
  onChanged:(property:T)=>void;
  /**
   * Callback to disconnecr from a property. 
   */
  disconnect:(property:T)=>void; 

  /**
   * Dispose this observer.
   */
  dispose() {
    if (this.isDisposed) {
      return;
    }
    this.isDisposed = true;
    this.disconnetFrom(this._property);
    const disposable = this._property as any;
    if (disposable && (<IDisposable>disposable).dispose) {
      disposable.dispose();
    }
    this._property = null;
  }

  /**
   * A property.
   */
  get property(): T {
    return this._property;
  }

  set property(property:T) {
    if (!property && !this._property || property === this._property) {
      return;
    }
    this.disconnetFrom(this._property);
    this._property = property;
    this.fireChanged(property);
    this.connectTo(property);
  }

  /**
   * Notify a connect callback if a property is not null. 
   */
  protected connectTo(property:T) {
    if (this.connect && property) {
      this.connect(property);
    }
  }

  /**
   * Notify a property changed callback with a new value.  
   */
  protected fireChanged(property:T) {
    if (this.onChanged) {
      this.onChanged(property);
    }
  }

  /**
   * Notify a disconnect callback if a property is not null. 
   */
  protected disconnetFrom(property:T) {
    if (this.disconnect && property) {
      this.disconnect(property);
    }
  }
  
  private _property:T;

}