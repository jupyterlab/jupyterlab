// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { IObservableValue } from '@jupyterlab/observables';

import { JSONValue, JSONExt, ReadonlyJSONValue } from '@phosphor/coreutils';

import { RegisterField } from '@phosphor/datastore';

import { ISignal, Signal } from '@phosphor/signaling';

import { ObservableBase } from './base';

/**
 * A concrete implementation of an `IObservableValue`.
 */
export class ObservableValue
  extends ObservableBase<RegisterField.Change<ReadonlyJSONValue>>
  implements IObservableValue {
  /**
   * The observable type.
   */
  get type(): 'Value' {
    return 'Value';
  }

  /**
   * A signal emitted when the value has changed.
   */
  get changed(): ISignal<this, IObservableValue.IChangedArgs> {
    return this._changed;
  }

  /**
   * Get the current value, or `undefined` if it has not been set.
   */
  get(): JSONValue | undefined {
    this.ensureBackend();
    const record = this.ds!.get(this.schema).get(this.recordID);
    return record ? (record[this.fieldId] as JSONValue) : undefined;
  }

  /**
   * Set the current value.
   */
  set(value: JSONValue): void {
    let oldValue = this.get();
    if (oldValue !== undefined && JSONExt.deepEqual(oldValue, value)) {
      return;
    }
    const table = this.ds!.get(this.schema);
    this.withTransaction(() => {
      table.update({
        [this.recordID]: {
          [this.fieldId]: value
        }
      } as any);
    });
  }

  protected onChange(change: RegisterField.Change<ReadonlyJSONValue>) {
    this._changed.emit({
      oldValue: change.previous,
      newValue: change.current
    });
  }

  private _changed = new Signal<this, IObservableValue.IChangedArgs>(this);
}
