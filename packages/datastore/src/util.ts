// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Datastore, Record, Schema } from '@phosphor/datastore';

import { DisposableDelegate, IDisposable } from '@phosphor/disposable';

export namespace DatastoreExt {
  export function withTransaction(
    datastore: Datastore,
    update: (id: string) => void
  ): void {
    const id = datastore.beginTransaction();
    try {
      update(id);
    } finally {
      datastore.endTransaction();
    }
  }

  export interface IRecordLocation<S extends Schema> {
    datastore: Datastore;
    schema: S;
    record: string;
  }

  export interface IFieldLocation<
    S extends Schema,
    F extends keyof S['fields']
  > extends IRecordLocation<S> {
    field: F;
  }

  export function getRecord<S extends Schema>(
    loc: IRecordLocation<S>
  ): Record.Value<S> | undefined {
    return loc.datastore.get(loc.schema).get(loc.record);
  }

  export function getField<S extends Schema, F extends keyof S['fields']>(
    loc: IFieldLocation<S, F>
  ): S['fields'][F]['ValueType'] {
    const record = loc.datastore.get(loc.schema).get(loc.record);
    if (!record) {
      throw Error(`The record ${loc.record} could not be found`);
    }
    return record[loc.field];
  }

  export function updateRecord<S extends Schema>(
    loc: IRecordLocation<S>,
    update: Record.Update<S>
  ): void {
    let table = loc.datastore.get(loc.schema);
    table.update({
      [loc.record]: update
    });
  }

  export function updateField<S extends Schema, F extends keyof S['fields']>(
    loc: IFieldLocation<S, F>,
    update: S['fields'][F]['UpdateType']
  ): void {
    let table = loc.datastore.get(loc.schema);
    table.update({
      [loc.record]: {
        [loc.field]: update
      } as Record.Update<S>
    });
  }

  export function listenRecord<S extends Schema>(
    loc: IRecordLocation<S>,
    slot: (source: Datastore, args: Record.Change<S>) => void,
    thisArg?: any
  ): IDisposable {
    const wrapper = (source: Datastore, args: Datastore.IChangedArgs) => {
      if (
        !args.change[loc.schema.id] ||
        !args.change[loc.schema.id][loc.record]
      ) {
        return;
      }
      slot(source, args.change[loc.schema.id][loc.record] as Record.Change<S>);
    };
    loc.datastore.changed.connect(wrapper, thisArg);
    return new DisposableDelegate(() => {
      loc.datastore.changed.disconnect(wrapper, thisArg);
    });
  }

  export function listenField<S extends Schema, F extends keyof S['fields']>(
    loc: IFieldLocation<S, F>,
    slot: (source: Datastore, args: S['fields'][F]['ChangeType']) => void,
    thisArg?: any
  ): IDisposable {
    const wrapper = (source: Datastore, args: Datastore.IChangedArgs) => {
      if (
        !args.change[loc.schema.id] ||
        !args.change[loc.schema.id][loc.record] ||
        !args.change[loc.schema.id][loc.record][loc.field as string]
      ) {
        return;
      }
      slot(source, args.change[loc.schema.id][loc.record][loc.field as string]);
    };
    loc.datastore.changed.connect(wrapper, thisArg);
    return new DisposableDelegate(() => {
      loc.datastore.changed.disconnect(wrapper, thisArg);
    });
  }
}
