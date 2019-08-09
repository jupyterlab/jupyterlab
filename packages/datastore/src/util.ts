// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Datastore, Record, Schema, Table } from '@phosphor/datastore';

import { DisposableDelegate, IDisposable } from '@phosphor/disposable';

/**
 * A namespace for Datastore helper functions.
 */
export namespace DatastoreExt {
  /**
   * A helper function to wrap an update to the datastore in calls to
   * `beginTransaction` and `endTransaction`.
   *
   * @param datastore: the datastore to which to apply the update.
   *
   * @param update: A function that performs the update on the datastore.
   *   The function is called with a transaction id string, in case the
   *   user wishes to store the transaction ID for later use.
   *
   * @returns the transaction ID.
   */
  export function withTransaction(
    datastore: Datastore,
    update: (id: string) => void
  ): string {
    const id = datastore.beginTransaction();
    try {
      update(id);
    } finally {
      datastore.endTransaction();
    }
    return id;
  }

  /**
   * An interface for referring to a specific record in a datastore.
   */
  export type RecordLocation<S extends Schema> = {
    /**
     * The datastore in question.
     */
    datastore: Datastore;

    /**
     * The schema in question. This schema must exist in the datastore,
     * or an error may result in its usage.
     */
    schema: S;

    /**
     * The record in question.
     */
    record: string;
  };

  /**
   * An interface for referring to a specific field in a datastore.
   *
   * #### Notes
   * The field must exist in the schema.
   */
  export type FieldLocation<
    S extends Schema,
    F extends keyof S['fields']
  > = RecordLocation<S> & {
    /**
     * The field in question.
     */
    field: F;
  };

  /**
   * Get a given record by its location.
   *
   * @param loc: The record location.
   *
   * @returns the record, or undefined if it does not exist.
   */
  export function getRecord<S extends Schema>(
    loc: RecordLocation<S>
  ): Record.Value<S> | undefined {
    return loc.datastore.get(loc.schema).get(loc.record);
  }

  /**
   * Get a given field by its location.
   *
   * @param loc: the field location.
   *
   * @returns the field in question.
   *
   * #### Notes
   * This will throw an error if the record does not exist in the given table.
   */
  export function getField<S extends Schema, F extends keyof S['fields']>(
    loc: FieldLocation<S, F>
  ): S['fields'][F]['ValueType'] {
    const record = loc.datastore.get(loc.schema).get(loc.record);
    if (!record) {
      throw Error(`The record ${loc.record} could not be found`);
    }
    return record[loc.field];
  }

  /**
   * Update a record in a table.
   *
   * @param loc: the record location.
   *
   * @param update: the update to the record.
   *
   * #### Notes
   * This does not begin a transaction, so usage of this function should be
   * combined with `beginTransaction`/`endTransaction`, or `withTransaction`.
   */
  export function updateRecord<S extends Schema>(
    loc: RecordLocation<S>,
    update: Record.Update<S>
  ): void {
    let table = loc.datastore.get(loc.schema);
    table.update({
      [loc.record]: update
    });
  }

  /**
   * Update a field in a table.
   *
   * @param loc: the field location.
   *
   * @param update: the update to the field.
   *
   * #### Notes
   * This does not begin a transaction, so usage of this function should be
   * combined with `beginTransaction`/`endTransaction`, or `withTransaction`.
   */
  export function updateField<S extends Schema, F extends keyof S['fields']>(
    loc: FieldLocation<S, F>,
    update: S['fields'][F]['UpdateType']
  ): void {
    let table = loc.datastore.get(loc.schema);
    // TODO: this cast may be made unnecessary once microsoft/TypeScript#13573
    // is fixed, possibly by microsoft/TypeScript#26797 lands.
    table.update({
      [loc.record]: {
        [loc.field]: update
      } as Record.Update<S>
    });
  }

  /**
   * Listen to changes in a record in a table. Changes to other tables and
   * other records in the same table are ignored.
   *
   * @param loc: the record location.
   *
   * @param slot: a callback function to invoke when the record changes.
   *
   * @returns an `IDisposable` that can be disposed to remove the listener.
   */
  export function listenRecord<S extends Schema>(
    loc: RecordLocation<S>,
    slot: (source: Datastore, args: Record.Change<S>) => void,
    thisArg?: any
  ): IDisposable {
    // A wrapper change signal connection function.
    const wrapper = (source: Datastore, args: Datastore.IChangedArgs) => {
      // Ignore changes that don't match the requested record.
      if (
        !args.change[loc.schema.id] ||
        !args.change[loc.schema.id][loc.record]
      ) {
        return;
      }
      // Otherwise, call the slot.
      const tc = args.change[loc.schema.id]! as Table.Change<S>;
      slot.bind(thisArg)(source, tc[loc.record]);
    };
    loc.datastore.changed.connect(wrapper);
    return new DisposableDelegate(() => {
      loc.datastore.changed.disconnect(wrapper);
    });
  }

  /**
   * Listen to changes in a fields in a table. Changes to other tables, other
   * records in the same table, and other fields in the same record are ignored.
   *
   * @param loc: the field location.
   *
   * @param slot: a callback function to invoke when the field changes.
   *
   * @returns an `IDisposable` that can be disposed to remove the listener.
   */
  export function listenField<S extends Schema, F extends keyof S['fields']>(
    loc: FieldLocation<S, F>,
    slot: (source: Datastore, args: S['fields'][F]['ChangeType']) => void,
    thisArg?: any
  ): IDisposable {
    const wrapper = (source: Datastore, args: Datastore.IChangedArgs) => {
      // Ignore changes that don't match the requested field.
      if (
        !args.change[loc.schema.id] ||
        !args.change[loc.schema.id][loc.record] ||
        !args.change[loc.schema.id][loc.record][loc.field as string]
      ) {
        return;
      }
      // Otherwise, call the slot.
      const tc = args.change[loc.schema.id]! as Table.Change<S>;
      slot.bind(thisArg)(source, tc[loc.record][loc.field]);
    };
    loc.datastore.changed.connect(wrapper);
    return new DisposableDelegate(() => {
      loc.datastore.changed.disconnect(wrapper);
    });
  }
}
