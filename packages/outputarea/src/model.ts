// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { nbformat } from '@jupyterlab/coreutils';

import { DatastoreExt, SchemaFields } from '@jupyterlab/datastore';

import { IOutputModel, OutputModel } from '@jupyterlab/rendermime';

import { UUID } from '@phosphor/coreutils';

import {
  Datastore,
  Fields,
  ListField,
  RegisterField,
  Schema
} from '@phosphor/datastore';

/**
 * The namespace for IOutputAreaModel interfaces.
 */
export namespace IOutputAreaModel {
  /**
   * An interface for the fields stored in an Output area.
   */
  export interface IFields extends SchemaFields {
    /**
     * Whether the output area is trusted.
     */
    readonly trusted: RegisterField<boolean>;

    /**
     * The list of outputs in the output area.
     */
    readonly outputs: ListField<string>;
  }

  /**
   * An interface for an output area model schema.
   */
  export interface ISchema extends Schema {
    fields: IFields;
  }

  /**
   * A concrete output area schema, available at runtime.
   */
  export const SCHEMA: ISchema = {
    /**
     * The schema id.
     */
    id: '@jupyterlab/outputarea:outputareamodel.v1',

    /**
     * The fields for the schema.
     */
    fields: {
      trusted: Fields.Boolean(),
      outputs: Fields.List<string>()
    }
  };

  export type DataLocation = {
    /**
     * A record in a datastore to hold the output area model.
     */
    record: DatastoreExt.RecordLocation<ISchema>;

    /**
     * A table in a datastore for individual outputs.
     */
    outputs: DatastoreExt.TableLocation<IOutputModel.ISchema>;
  };

  /**
   * The options used to create a output area model.
   */
  export interface IOptions {
    /**
     * The initial values for the model.
     */
    values?: nbformat.IOutput[];

    /**
     * Whether the output is trusted.  The default is false.
     */
    trusted?: boolean;

    /**
     * The output content factory used by the model.
     *
     * If not given, a default factory will be used.
     */
    contentFactory?: IContentFactory;

    /**
     * Optional places to put the data for the model.
     * If not providid, it will create its own.
     */
    loc?: DataLocation;
  }

  /**
   * The interface for an output content factory.
   */
  export interface IContentFactory {
    /**
     * Create an output model.
     */
    createOutputModel(options: IOutputModel.IOptions): IOutputModel;
  }
}

/**
 * The default implementation of the IOutputAreaModel.
 */
export namespace OutputAreaModel {
  /**
   * Create an in-memory datastore capable of holding the data for an output area.
   */
  export function createStore(): Datastore {
    return Datastore.create({
      id: 1,
      schemas: [IOutputAreaModel.SCHEMA, IOutputModel.SCHEMA]
    });
  }

  /**
   * Deserialize an output area model from JSON to a datastore location.
   */
  export function fromJSON(
    loc: IOutputAreaModel.DataLocation,
    values: nbformat.IOutput[]
  ): void {
    DatastoreExt.withTransaction(loc.record.datastore, () => {
      clear(loc);
      values.forEach(value => appendItem(loc, value));
    });
  }

  /**
   * Set whether the model is trusted.
   */
  export function setTrusted(
    loc: IOutputAreaModel.DataLocation,
    value: boolean
  ) {
    if (value === DatastoreExt.getField({ ...loc.record, field: 'trusted' })) {
      return;
    }
    DatastoreExt.withTransaction(loc.record.datastore, () => {
      const list = DatastoreExt.getField({
        ...loc.record,
        field: 'outputs'
      });
      DatastoreExt.updateField({ ...loc.record, field: 'trusted' }, true);
      for (let i = 0; i < list.length; i++) {
        const id = list[i];
        const record = { ...loc.outputs, record: id };
        DatastoreExt.updateField({ ...record, field: 'trusted' }, true);
      }
    });
  }

  /**
   * Set the value at the specified index.
   */
  export function setItem(
    loc: IOutputAreaModel.DataLocation,
    index: number,
    value: nbformat.IOutput
  ): void {
    const list = DatastoreExt.getField({
      ...loc.record,
      field: 'outputs'
    });
    const trusted = DatastoreExt.getField({
      ...loc.record,
      field: 'trusted'
    });
    // Normalize stream data.
    Private.normalize(value);
    const record = { ...loc.outputs, record: list[index] };
    OutputModel.fromJSON(record, value, trusted);
  }

  /**
   * Clear all of the output.
   */
  export function clear(loc: IOutputAreaModel.DataLocation): void {
    const list = DatastoreExt.getField({
      ...loc.record,
      field: 'outputs'
    });
    DatastoreExt.withTransaction(loc.record.datastore, () => {
      DatastoreExt.updateField(
        { ...loc.record, field: 'outputs' },
        { index: 0, remove: list.length, values: [] }
      );
      // TODO also clear items from output table.
    });
  }

  /**
   * Serialize the model to JSON.
   */
  export function toJSON(
    loc: IOutputAreaModel.DataLocation
  ): nbformat.IOutput[] {
    const list = DatastoreExt.getField({
      ...loc.record,
      field: 'outputs'
    });
    return list.map(id => OutputModel.toJSON({ ...loc.outputs, record: id }));
  }

  /**
   * Add an array of output items to the list.
   *
   * #### Notes
   * This removes overwritten characters, and consolidates items if they should
   * be combined with a previous entry rather than a new entry.
   */
  export function appendItem(
    loc: IOutputAreaModel.DataLocation,
    value: nbformat.IOutput
  ): void {
    let trusted = DatastoreExt.getField({
      ...loc.record,
      field: 'trusted'
    });

    DatastoreExt.withTransaction(loc.record.datastore, () => {
      // Normalize the value.
      Private.normalize(value);

      const list = DatastoreExt.getField({
        ...loc.record,
        field: 'outputs'
      });

      // Consolidate outputs if they are stream outputs of the same kind.
      if (list.length) {
        const index = list.length - 1;
        const id = list[index];
        const record = { ...loc.outputs, record: id };
        const lastValue = OutputModel.toJSON(record);
        if (nbformat.isStream(value) && lastValue.name === value.name) {
          lastValue.text += value.text as string;
          lastValue.text = Private.removeOverwrittenChars(
            lastValue.text as string
          );
          value.text = lastValue.text;
          OutputModel.fromJSON(record, value, trusted);
        }
        return;
      }

      if (nbformat.isStream(value)) {
        value.text = Private.removeOverwrittenChars(value.text as string);
      }

      const id = UUID.uuid4();
      const record = { ...loc.outputs, record: id };
      OutputModel.fromJSON(record, value, trusted);

      DatastoreExt.updateField(
        { ...loc.record, field: 'outputs' },
        { index: list.length, remove: 0, values: [id] }
      );
    });
  }
}

/**
 * A namespace for module-private functionality.
 */
namespace Private {
  /**
   * Normalize an output.
   */
  export function normalize(value: nbformat.IOutput): void {
    if (nbformat.isStream(value)) {
      if (Array.isArray(value.text)) {
        value.text = (value.text as string[]).join('\n');
      }
    }
  }

  /**
   * Remove characters that are overridden by backspace characters.
   */
  function fixBackspace(txt: string): string {
    let tmp = txt;
    do {
      txt = tmp;
      // Cancel out anything-but-newline followed by backspace
      tmp = txt.replace(/[^\n]\x08/gm, '');
    } while (tmp.length < txt.length);
    return txt;
  }

  /**
   * Remove chunks that should be overridden by the effect of
   * carriage return characters.
   */
  function fixCarriageReturn(txt: string): string {
    txt = txt.replace(/\r+\n/gm, '\n'); // \r followed by \n --> newline
    while (txt.search(/\r[^$]/g) > -1) {
      const base = txt.match(/^(.*)\r+/m)[1];
      let insert = txt.match(/\r+(.*)$/m)[1];
      insert = insert + base.slice(insert.length, base.length);
      txt = txt.replace(/\r+.*$/m, '\r').replace(/^.*\r/m, insert);
    }
    return txt;
  }

  /*
   * Remove characters overridden by backspaces and carriage returns
   */
  export function removeOverwrittenChars(text: string): string {
    return fixCarriageReturn(fixBackspace(text));
  }
}
