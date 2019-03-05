// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { IObservableString } from '@jupyterlab/observables';

import { ISignal, Signal } from '@phosphor/signaling';

import { TextField } from '@phosphor/datastore';

import { ObservableBase } from './base';

/**
 *
 */
export class ObservableString extends ObservableBase<TextField.Change>
  implements IObservableString {
  /**
   * The type of this object.
   */
  get type(): 'String' {
    return 'String';
  }

  /**
   * A signal emitted when the string has changed.
   */
  get changed(): ISignal<this, IObservableString.IChangedArgs> {
    return this._changed;
  }

  /**
   * The value of the string.
   */
  get text(): string | undefined {
    if (this.ds === null) {
      return undefined;
    }
    const record = this.ds!.get(this.schema).get(this.recordID);
    return record ? (record[this.fieldId] as string) : '';
  }

  set text(value: string | undefined) {
    if (this.ds === null && value === undefined) {
      return;
    }
    this.ensureBackend();
    let old = this.text;
    if (old === value) {
      return;
    }
    const table = this.ds!.get(this.schema);
    this.withTransaction(() => {
      table.update({
        [this.recordID]: {
          [this.fieldId]: {
            index: 0,
            remove: old ? old.length : 0,
            text: value
          }
        }
      } as any);
    });
  }

  /**
   * Insert a substring.
   *
   * @param index - The starting index.
   *
   * @param text - The substring to insert.
   */
  insert(index: number, text: string): void {
    this.ensureBackend();
    const table = this.ds!.get(this.schema);
    this.withTransaction(() => {
      table.update({
        [this.recordID]: {
          [this.fieldId]: {
            index,
            remove: 0,
            text
          }
        }
      } as any);
    });
  }

  /**
   * Remove a substring.
   *
   * @param start - The starting index.
   *
   * @param end - The ending index.
   */
  remove(start: number, end: number): void {
    this.ensureBackend();
    const table = this.ds!.get(this.schema);
    this.withTransaction(() => {
      table.update({
        [this.recordID]: {
          [this.fieldId]: {
            index: start,
            remove: end - start,
            text: ''
          }
        }
      } as any);
    });
  }

  /**
   * Set the ObservableString to an empty string.
   */
  clear(): void {
    this.ensureBackend();
    const table = this.ds!.get(this.schema);
    const current = this.text;
    this.withTransaction(() => {
      table.update({
        [this.recordID]: {
          [this.fieldId]: {
            index: 0,
            remove: current ? current.length : 0,
            text: ''
          }
        }
      } as any);
    });
  }

  protected onChange(change: TextField.Change) {
    for (let c of change) {
      if (c.removed) {
        this._changed.emit({
          type: 'remove',
          start: c.index,
          end: c.index + c.removed.length,
          value: c.removed
        });
      }
      if (c.inserted) {
        this._changed.emit({
          type: 'insert',
          start: c.index,
          end: c.index,
          value: c.inserted
        });
      }
    }
  }

  private _changed = new Signal<this, IObservableString.IChangedArgs>(this);
}
