// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Signal } from '@phosphor/signaling';

import { Datastore, Schema } from '@phosphor/datastore';

import { ReadonlyJSONValue } from '@phosphor/coreutils';

import { DatastoreManager } from '../manager';

/**
 *
 */
export abstract class ObservableBase<T extends ReadonlyJSONValue> {
  /**
   *
   */
  constructor(
    manager: DatastoreManager,
    schema: Schema,
    recordId: string,
    fieldId: string
  ) {
    this.manager = manager;
    this.schema = schema;
    this.fieldId = fieldId;
    this.recordID = recordId;
    this.ds = manager.datastore;
    manager.datastoreChanged.connect(
      this._onDsChange,
      this
    );
    const ds = this.ds;
    if (ds) {
      ds.changed.connect(
        this._onChange,
        this
      );
    }
  }

  /**
   * Dispose of the resources held by the string.
   */
  dispose(): void {
    if (this._isDisposed) {
      return;
    }
    if (this.manager) {
      this.manager = undefined!;
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

  protected ensureBackend(): void {
    if (this.ds === null) {
      throw new Error('Cannot use model db before connection completed!');
    }
  }

  protected abstract onChange(change: T): void;

  private _onDsChange(
    manager: DatastoreManager,
    args: DatastoreManager.IChangedArgs
  ) {
    this.ds = args.datastore;
    this.ds.changed.connect(
      this._onChange,
      this
    );
  }

  private _onChange(ds: Datastore, args: Datastore.IChangedArgs) {
    const local = Private.getLocalChange<T>(
      ds,
      this.schema,
      this.recordID,
      this.fieldId,
      args.change
    );
    if (local !== undefined) {
      this.onChange(local);
    }
  }

  protected withTransaction(fn: () => void): void {
    this.ensureBackend();
    if (this.ds!.inTransaction) {
      return fn();
    }
    this.ds!.beginTransaction();
    try {
      fn();
    } finally {
      this.ds!.endTransaction();
    }
  }

  protected manager: DatastoreManager;
  protected schema: Schema;
  protected fieldId: string;
  protected recordID: string;
  protected ds: Datastore | null;
  private _isDisposed = false;
}

namespace Private {
  export function getLocalChange<T>(
    ds: Datastore,
    schema: Schema,
    recordId: string,
    fieldId: string,
    change: Datastore.Change
  ): T | undefined {
    if (
      change[schema.id] === undefined ||
      change[schema.id][recordId] === undefined
    ) {
      return undefined;
    }
    return change[schema.id][recordId][fieldId] as T | undefined;
  }
}
