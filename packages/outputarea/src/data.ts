// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { nbformat } from '@jupyterlab/coreutils';

import { DatastoreExt } from '@jupyterlab/datastore';

import { IOutputData, OutputData, OutputModel } from '@jupyterlab/rendermime';

import { UUID } from '@phosphor/coreutils';

import {
  Datastore,
  Fields,
  ListField,
  RegisterField
} from '@phosphor/datastore';

/**
 * The namespace for IOutputAreaData interfaces.
 */
export namespace IOutputAreaData {
  /**
   * An type alias for an output area data schema.
   */
  export type Schema = {
    /**
     * The id for the schema.
     */
    id: string;

    /**
     * The data fields in the schema.
     */
    fields: {
      /**
       * Whether the output area is trusted.
       */
      readonly trusted: RegisterField<boolean>;

      /**
       * The list of outputs in the output area.
       */
      readonly outputs: ListField<string>;
    };
  };

  /**
   * A set of locations in a datastore in which an output area
   * stores its data.
   */
  export type DataLocation = DatastoreExt.DataLocation & {
    /**
     * A record in a datastore to hold the output area model.
     */
    record: DatastoreExt.RecordLocation<Schema>;

    /**
     * A table in a datastore for individual outputs.
     */
    outputs: DatastoreExt.TableLocation<IOutputData.Schema>;
  };
}

/**
 * Functions for performing operations on IOutputAreaData.
 */
export namespace OutputAreaData {
  /**
   * A concrete output area schema, available at runtime.
   */
  export const SCHEMA: IOutputAreaData.Schema = {
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

  /**
   * Create an in-memory datastore capable of holding the data for an output area.
   */
  export function createStore(id: number = 1): Datastore {
    return Datastore.create({
      id,
      schemas: [SCHEMA, OutputData.SCHEMA]
    });
  }

  /**
   * Deserialize an output area model from JSON to a datastore location.
   */
  export function fromJSON(
    loc: IOutputAreaData.DataLocation,
    values: nbformat.IOutput[]
  ): void {
    DatastoreExt.withTransaction(loc.datastore, () => {
      clear(loc);
      values.forEach(value => appendItem(loc, value));
    });
  }

  /**
   * Set whether the model is trusted.
   */
  export function setTrusted(
    loc: IOutputAreaData.DataLocation,
    value: boolean
  ) {
    const { datastore, record, outputs } = loc;
    if (
      value ===
      DatastoreExt.getField(datastore, { ...record, field: 'trusted' })
    ) {
      return;
    }
    DatastoreExt.withTransaction(datastore, () => {
      const list = DatastoreExt.getField(datastore, {
        ...record,
        field: 'outputs'
      });
      DatastoreExt.updateField(
        datastore,
        { ...record, field: 'trusted' },
        true
      );
      for (let i = 0; i < list.length; i++) {
        const id = list[i];
        const outputRecord = { ...outputs, record: id };
        DatastoreExt.updateField(
          datastore,
          { ...outputRecord, field: 'trusted' },
          true
        );
      }
    });
  }

  /**
   * Set the value at the specified index.
   */
  export function setItem(
    loc: IOutputAreaData.DataLocation,
    index: number,
    value: nbformat.IOutput
  ): void {
    const { datastore, record, outputs } = loc;
    const list = DatastoreExt.getField(datastore, {
      ...record,
      field: 'outputs'
    });
    const trusted = DatastoreExt.getField(datastore, {
      ...record,
      field: 'trusted'
    });
    // Normalize stream data.
    Private.normalize(value);
    const outputData = {
      datastore,
      record: { ...outputs, record: list[index] }
    };
    OutputModel.fromJSON(outputData, value, trusted);
  }

  /**
   * Clear all of the output.
   */
  export function clear(loc: IOutputAreaData.DataLocation): void {
    const { datastore, record, outputs } = loc;
    const list = DatastoreExt.getField(datastore, {
      ...record,
      field: 'outputs'
    });
    DatastoreExt.withTransaction(datastore, () => {
      DatastoreExt.updateField(
        datastore,
        { ...record, field: 'outputs' },
        { index: 0, remove: list.length, values: [] }
      );
      list.forEach(output => {
        OutputModel.clear({
          datastore,
          record: { ...outputs, record: output }
        });
      });
    });
  }

  /**
   * Serialize the model to JSON.
   */
  export function toJSON(
    loc: IOutputAreaData.DataLocation
  ): nbformat.IOutput[] {
    const { datastore, record, outputs } = loc;
    const list = DatastoreExt.getField(datastore, {
      ...record,
      field: 'outputs'
    });
    return list.map(id =>
      OutputModel.toJSON({ datastore, record: { ...outputs, record: id } })
    );
  }

  /**
   * Add an array of output items to the list.
   *
   * #### Notes
   * This removes overwritten characters, and consolidates items if they should
   * be combined with a previous entry rather than a new entry.
   */
  export function appendItem(
    loc: IOutputAreaData.DataLocation,
    value: nbformat.IOutput
  ): void {
    const { datastore, record, outputs } = loc;
    let trusted = DatastoreExt.getField(datastore, {
      ...record,
      field: 'trusted'
    });

    DatastoreExt.withTransaction(datastore, () => {
      // Normalize the value.
      Private.normalize(value);

      const list = DatastoreExt.getField(datastore, {
        ...record,
        field: 'outputs'
      });

      // Consolidate outputs if they are stream outputs of the same kind.
      if (list.length) {
        const index = list.length - 1;
        const id = list[index];
        const outputData = {
          datastore,
          record: { ...outputs, record: id }
        };
        const lastValue = OutputModel.toJSON(outputData);
        if (nbformat.isStream(value) && lastValue.name === value.name) {
          lastValue.text += value.text as string;
          lastValue.text = Private.removeOverwrittenChars(
            lastValue.text as string
          );
          value.text = lastValue.text;
          OutputModel.fromJSON(outputData, value, trusted);
          return;
        }
      }

      if (nbformat.isStream(value)) {
        value.text = Private.removeOverwrittenChars(value.text as string);
      }

      const id = UUID.uuid4();
      const outputData = { datastore, record: { ...outputs, record: id } };
      OutputModel.fromJSON(outputData, value, trusted);

      DatastoreExt.updateField(
        datastore,
        { ...record, field: 'outputs' },
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
