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

import { IDisposable } from '@phosphor/disposable';

import { ISignal, Signal } from '@phosphor/signaling';

/**
 * The model for an output area.
 */
export interface IOutputAreaModel extends IDisposable {
  /**
   * A signal emitted when the model state changes.
   */
  readonly stateChanged: ISignal<IOutputAreaModel, void>;

  /**
   * Whether the output area is trusted.
   */
  trusted: boolean;

  /**
   * Get the length of the items in the model.
   */
  readonly length: number;

  /**
   * The record location of the data.
   */
  readonly record: DatastoreExt.RecordLocation<IOutputAreaModel.ISchema>;

  /**
   * The output content factory used by the model.
   */
  readonly contentFactory: IOutputAreaModel.IContentFactory;

  /**
   * Get an item at the specified index.
   */
  get(index: number): IOutputModel;

  /**
   * Add an output, which may be combined with previous output.
   *
   * #### Notes
   * The output bundle is copied.
   * Contiguous stream outputs of the same `name` are combined.
   */
  add(output: nbformat.IOutput): void;

  /**
   * Set the value at the specified index.
   */
  set(index: number, output: nbformat.IOutput): void;

  /**
   * Clear all of the output.
   *
   * @param wait - Delay clearing the output until the next message is added.
   */
  clear(wait?: boolean): void;

  /**
   * Deserialize the model from JSON.
   *
   * #### Notes
   * This will clear any existing data.
   */
  fromJSON(values: nbformat.IOutput[]): void;

  /**
   * Serialize the model to JSON.
   */
  toJSON(): nbformat.IOutput[];
}

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
    storeOptions?: {
      /**
       * A record in a datastore to hold the output area model.
       */
      record: DatastoreExt.RecordLocation<ISchema>;

      /**
       * A table in a datastore for individual outputs.
       */
      outputs: DatastoreExt.TableLocation<ISchema>;
    };
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
export class OutputAreaModel implements IOutputAreaModel {
  /**
   * Construct a new observable outputs instance.
   */
  constructor(options: IOutputAreaModel.IOptions = {}) {
    const datastore = Datastore.create({
      id: 1,
      schemas: [IOutputAreaModel.SCHEMA, IOutputModel.SCHEMA]
    });
    this.record = {
      datastore,
      schema: IOutputAreaModel.SCHEMA,
      record: 'data'
    };
    DatastoreExt.withTransaction(datastore, () => {
      DatastoreExt.updateRecord(this.record, { trusted: !!options.trusted });
    });

    this.contentFactory =
      options.contentFactory || OutputAreaModel.defaultContentFactory;

    this._add(options.values);
  }

  /**
   * The record location of the data.
   */
  readonly record: DatastoreExt.RecordLocation<IOutputAreaModel.ISchema>;

  /**
   * A signal emitted when the model state changes.
   */
  get stateChanged(): ISignal<IOutputAreaModel, void> {
    return this._stateChanged;
  }

  /**
   * Get the length of the items in the model.
   */
  get length(): number {
    return DatastoreExt.getField({ ...this.record, field: 'outputs' }).length;
  }

  /**
   * Get whether the model is trusted.
   */
  get trusted(): boolean {
    return DatastoreExt.getField({ ...this.record, field: 'trusted' });
  }

  /**
   * Set whether the model is trusted.
   *
   * #### Notes
   * Changing the value will cause all of the models to re-set.
   */
  set trusted(value: boolean) {
    if (value === DatastoreExt.getField({ ...this.record, field: 'trusted' })) {
      return;
    }
    DatastoreExt.withTransaction(this.record.datastore, () => {
      const list = DatastoreExt.getField({ ...this.record, field: 'outputs' });
      DatastoreExt.updateField({ ...this.record, field: 'trusted' }, true);
      for (let i = 0; i < list.length; i++) {
        const id = list[i];
        const outputRecord = {
          datastore: this.record.datastore,
          schema: IOutputAreaModel.SCHEMA,
          record: id
        };
        DatastoreExt.updateField({ ...outputRecord, field: 'trusted' }, true);
      }
    });
  }

  /**
   * The output content factory used by the model.
   */
  readonly contentFactory: IOutputAreaModel.IContentFactory;

  /**
   * Test whether the model is disposed.
   */
  get isDisposed(): boolean {
    return this._isDisposed;
  }

  /**
   * Dispose of the resources used by the model.
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }
    this._isDisposed = true;
    Signal.clearData(this);
  }

  /**
   * Get an item at the specified index.
   */
  get(index: number): IOutputModel {
    const list = DatastoreExt.getField({ ...this.record, field: 'outputs' });
    return this._outputModels.get(list[index]);
  }

  /**
   * Set the value at the specified index.
   */
  set(index: number, value: nbformat.IOutput): void {
    const list = DatastoreExt.getField({ ...this.record, field: 'outputs' });
    // Normalize stream data.
    Private.normalize(value);
    let prev = this._outputModels.get(list[index]);
    if (prev) {
      prev.dispose();
      this._outputModels.delete(list[index]);
    }
    const outputRecord = {
      datastore: this.record.datastore,
      schema: IOutputModel.SCHEMA,
      record: list[index]
    };
    let item = this._createItem({
      record: outputRecord,
      value,
      trusted: this.trusted
    });
    this._outputModels.set(list[index], item);
  }

  /**
   * Add an output, which may be combined with previous output.
   *
   * #### Notes
   * The output bundle is copied.
   * Contiguous stream outputs of the same `name` are combined.
   */
  add(output: nbformat.IOutput): void {
    // If we received a delayed clear message, then clear now.
    if (this.clearNext) {
      this.clear();
      this.clearNext = false;
    }

    this._add([output]);
  }

  /**
   * Clear all of the output.
   *
   * @param wait Delay clearing the output until the next message is added.
   */
  clear(wait: boolean = false): void {
    this._lastStream = '';
    if (wait) {
      this.clearNext = true;
      return;
    }
    this._outputModels.forEach(model => model.dispose());
    this._outputModels.clear();
    DatastoreExt.withTransaction(this.record.datastore, () => {
      DatastoreExt.updateField(
        { ...this.record, field: 'outputs' },
        { index: 0, remove: this.length, values: [] }
      );
      // TODO also clear items from output table.
    });
  }

  /**
   * Deserialize the model from JSON.
   *
   * #### Notes
   * This will clear any existing data.
   */
  fromJSON(values: nbformat.IOutput[]) {
    this.clear();
    this._add(values);
  }

  /**
   * Serialize the model to JSON.
   */
  toJSON(): nbformat.IOutput[] {
    const list = DatastoreExt.getField({ ...this.record, field: 'outputs' });
    return list.map(id => this._outputModels.get(id).toJSON());
  }

  /**
   * Add an array of output items to the list.
   *
   * #### Notes
   * This removes overwritten characters, and consolidates items if they should
   * be combined with a previous entry rather than a new entry.
   */
  private _add(values: nbformat.IOutput[]): void {
    let trusted = DatastoreExt.getField({ ...this.record, field: 'trusted' });

    DatastoreExt.withTransaction(this.record.datastore, () => {
      values.forEach(value => {
        // Normalize the value.
        Private.normalize(value);

        const list = DatastoreExt.getField({
          ...this.record,
          field: 'outputs'
        });

        // Consolidate outputs if they are stream outputs of the same kind.
        if (
          nbformat.isStream(value) &&
          this._lastStream &&
          value.name === this._lastName
        ) {
          this._lastStream += value.text as string;
          this._lastStream = Private.removeOverwrittenChars(this._lastStream);
          value.text = this._lastStream;
          let index = list.length - 1;
          let outputRecord = {
            datastore: this.record.datastore,
            schema: IOutputModel.SCHEMA,
            record: list[index]
          };
          let prev = this._outputModels.get(list[index]);
          if (prev) {
            prev.dispose();
            this._outputModels.delete(list[index]);
          }
          this._createItem({ record: outputRecord, value, trusted });
          return;
        }

        if (nbformat.isStream(value)) {
          value.text = Private.removeOverwrittenChars(value.text as string);
        }

        let id = UUID.uuid4();
        let outputRecord = {
          datastore: this.record.datastore,
          schema: IOutputModel.SCHEMA,
          record: id
        };
        // Create the new item.
        this._createItem({ record: outputRecord, value, trusted });

        // Update the stream information.
        if (nbformat.isStream(value)) {
          this._lastStream = value.text as string;
          this._lastName = value.name;
        } else {
          this._lastStream = '';
        }

        DatastoreExt.updateField(
          { ...this.record, field: 'outputs' },
          { index: list.length, remove: 0, values: [id] }
        );
      });
    });
  }

  /**
   * A flag that is set when we want to clear the output area
   * *after* the next addition to it.
   */
  protected clearNext = false;

  /**
   * Create an output item and hook up its signals.
   *
   * #### Notes
   * If provided with
   */
  private _createItem(options: IOutputModel.IOptions): IOutputModel {
    let factory = this.contentFactory;
    let item = factory.createOutputModel(options);
    DatastoreExt.listenRecord(this.record, this._onGenericChange, this);
    this._outputModels.set(item.record.record, item);
    return item;
  }

  /**
   * Handle a change to an item.
   */
  private _onGenericChange(): void {
    this._stateChanged.emit(void 0);
  }

  private _outputModels = new Map<string, IOutputModel>();
  private _lastStream: string;
  private _lastName: 'stdout' | 'stderr';
  private _isDisposed = false;
  private _stateChanged = new Signal<IOutputAreaModel, void>(this);
}

/**
 * The namespace for OutputAreaModel class statics.
 */
export namespace OutputAreaModel {
  /**
   * The default implementation of a `IModelOutputFactory`.
   */
  export class ContentFactory implements IOutputAreaModel.IContentFactory {
    /**
     * Create an output model.
     */
    createOutputModel(options: IOutputModel.IOptions): IOutputModel {
      return new OutputModel(options);
    }
  }

  /**
   * The default output model factory.
   */
  export const defaultContentFactory = new ContentFactory();
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
