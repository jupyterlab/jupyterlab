// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Signal } from '@phosphor/signaling';

import { Datastore, Schema } from '@phosphor/datastore';

import { ReadonlyJSONValue } from '@phosphor/coreutils';

/**
 *
 */
export abstract class ObservableBase<T extends ReadonlyJSONValue> {
  /**
   *
   */
  constructor(
    datastore: Datastore,
    schema: Schema,
    recordId: string,
    fieldId: string
  ) {
    this.ds = datastore;
    this.schema = schema;
    this.fieldId = fieldId;
    this.recordID = recordId;
    this.ds.changed.connect(
      this._onChange,
      this
    );
  }

  /**
   * Dispose of the resources held by the string.
   */
  dispose(): void {
    if (this._isDisposed) {
      return;
    }
    this._isDisposed = true;
    Signal.clearData(this);
  }

  /**
   * Test whether the object has been disposed.
   *
   * #### Notes
   * This property is always safe to access.
   */
  get isDisposed(): boolean {
    return this._isDisposed;
  }

  private _onChange(ds: Datastore, args: Datastore.IChangedArgs) {
    const local = Private.getLocalChange(
      ds,
      this.schema,
      this.recordID,
      this.fieldId,
      args.change
    );
    this.onChange(local as T);
  }

  protected abstract onChange(change: T): void;

  protected ds: Datastore;
  protected schema: Schema;
  protected fieldId: string;
  protected recordID: string;
  private _isDisposed = false;
}

namespace Private {
  export function getLocalChange(
    ds: Datastore,
    schema: Schema,
    recordId: string,
    fieldId: string,
    change: Datastore.Change
  ) {
    if (
      change[schema.id] === undefined ||
      change[schema.id][recordId] === undefined
    ) {
      return undefined;
    }
    return change[schema.id][recordId][fieldId];
  }
}
