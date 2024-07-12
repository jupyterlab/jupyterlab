// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { ReadonlyPartialJSONValue } from '@lumino/coreutils';
import { ISignal, Signal } from '@lumino/signaling';
import { IDataConnector } from './interfaces';
import { IStateDB } from './tokens';

/**
 * The default concrete implementation of a state database.
 */
export class StateDB<
  T extends ReadonlyPartialJSONValue = ReadonlyPartialJSONValue
> implements IStateDB<T>
{
  /**
   * Create a new state database.
   *
   * @param options - The instantiation options for a state database.
   */
  constructor(options: StateDB.IOptions<T> = {}) {
    const { connector, transform } = options;

    this._connector = connector || new StateDB.Connector();
    if (!transform) {
      this._ready = Promise.resolve(undefined);
    } else {
      this._ready = transform.then(transformation => {
        const { contents, type } = transformation;

        switch (type) {
          case 'cancel':
            return;
          case 'clear':
            return this._clear();
          case 'merge':
            return this._merge(contents || {});
          case 'overwrite':
            return this._overwrite(contents || {});
          default:
            return;
        }
      });
    }
  }

  /**
   * A signal that emits the change type any time a value changes.
   */
  get changed(): ISignal<this, StateDB.Change> {
    return this._changed;
  }

  /**
   * Clear the entire database.
   */
  async clear(): Promise<void> {
    await this._ready;
    await this._clear();
  }

  /**
   * Retrieve a saved bundle from the database.
   *
   * @param id - The identifier used to retrieve a data bundle.
   *
   * @returns A promise that bears a data payload if available.
   *
   * #### Notes
   * The `id` values of stored items in the state database are formatted:
   * `'namespace:identifier'`, which is the same convention that command
   * identifiers in JupyterLab use as well. While this is not a technical
   * requirement for `fetch()`, `remove()`, and `save()`, it *is* necessary for
   * using the `list(namespace: string)` method.
   *
   * The promise returned by this method may be rejected if an error occurs in
   * retrieving the data. Non-existence of an `id` will succeed with the `value`
   * `undefined`.
   */
  async fetch(id: string): Promise<T | undefined> {
    await this._ready;
    return this._fetch(id);
  }

  /**
   * Retrieve all the saved bundles for a namespace.
   *
   * @param namespace The namespace prefix to retrieve.
   *
   * @returns A promise that bears a collection of payloads for a namespace.
   *
   * #### Notes
   * Namespaces are entirely conventional entities. The `id` values of stored
   * items in the state database are formatted: `'namespace:identifier'`, which
   * is the same convention that command identifiers in JupyterLab use as well.
   *
   * If there are any errors in retrieving the data, they will be logged to the
   * console in order to optimistically return any extant data without failing.
   * This promise will always succeed.
   */
  async list(namespace: string): Promise<{ ids: string[]; values: T[] }> {
    await this._ready;
    return this._list(namespace);
  }

  /**
   * Remove a value from the database.
   *
   * @param id - The identifier for the data being removed.
   *
   * @returns A promise that is rejected if remove fails and succeeds otherwise.
   */
  async remove(id: string): Promise<void> {
    await this._ready;
    await this._remove(id);
    this._changed.emit({ id, type: 'remove' });
  }

  /**
   * Save a value in the database.
   *
   * @param id - The identifier for the data being saved.
   *
   * @param value - The data being saved.
   *
   * @returns A promise that is rejected if saving fails and succeeds otherwise.
   *
   * #### Notes
   * The `id` values of stored items in the state database are formatted:
   * `'namespace:identifier'`, which is the same convention that command
   * identifiers in JupyterLab use as well. While this is not a technical
   * requirement for `fetch()`, `remove()`, and `save()`, it *is* necessary for
   * using the `list(namespace: string)` method.
   */
  async save(id: string, value: T): Promise<void> {
    await this._ready;
    await this._save(id, value);
    this._changed.emit({ id, type: 'save' });
  }

  /**
   * Return a serialized copy of the state database's entire contents.
   *
   * @returns A promise that resolves with the database contents as JSON.
   */
  async toJSON(): Promise<{ readonly [id: string]: T }> {
    await this._ready;

    const { ids, values } = await this._list();

    return values.reduce(
      (acc, val, idx) => {
        acc[ids[idx]] = val;
        return acc;
      },
      {} as { [id: string]: T }
    );
  }

  /**
   * Clear the entire database.
   */
  private async _clear(): Promise<void> {
    await Promise.all((await this._list()).ids.map(id => this._remove(id)));
  }

  /**
   * Fetch a value from the database.
   */
  private async _fetch(id: string): Promise<T | undefined> {
    const value = await this._connector.fetch(id);

    if (value) {
      return (JSON.parse(value) as Private.Envelope).v as T;
    }
  }

  /**
   * Fetch a list from the database.
   */
  private async _list(namespace = ''): Promise<{ ids: string[]; values: T[] }> {
    const { ids, values } = await this._connector.list(namespace);

    return {
      ids,
      values: values.map(val => (JSON.parse(val) as Private.Envelope).v as T)
    };
  }

  /**
   * Merge data into the state database.
   */
  private async _merge(contents: StateDB.Content<T>): Promise<void> {
    await Promise.all(
      Object.keys(contents).map(
        key => contents[key] && this._save(key, contents[key]!)
      )
    );
  }

  /**
   * Overwrite the entire database with new contents.
   */
  private async _overwrite(contents: StateDB.Content<T>): Promise<void> {
    await this._clear();
    await this._merge(contents);
  }

  /**
   * Remove a key in the database.
   */
  private async _remove(id: string): Promise<void> {
    return this._connector.remove(id);
  }

  /**
   * Save a key and its value in the database.
   */
  private async _save(id: string, value: T): Promise<void> {
    return this._connector.save(id, JSON.stringify({ v: value }));
  }

  private _changed = new Signal<this, StateDB.Change>(this);
  private _connector: IDataConnector<string>;
  private _ready: Promise<void>;
}

/**
 * A namespace for StateDB statics.
 */
export namespace StateDB {
  /**
   * A state database change.
   */
  export type Change = {
    /**
     * The key of the database item that was changed.
     *
     * #### Notes
     * This field is set to `null` for global changes (i.e. `clear`).
     */
    id: string | null;

    /**
     * The type of change.
     */
    type: 'clear' | 'remove' | 'save';
  };

  /**
   * A data transformation that can be applied to a state database.
   */
  export type DataTransform<
    T extends ReadonlyPartialJSONValue = ReadonlyPartialJSONValue
  > = {
    /*
     * The change operation being applied.
     */
    type: 'cancel' | 'clear' | 'merge' | 'overwrite';

    /**
     * The contents of the change operation.
     */
    contents: Content<T> | null;
  };

  /**
   * Database content map
   */
  export type Content<T> = { [id: string]: T | undefined };

  /**
   * The instantiation options for a state database.
   */
  export interface IOptions<
    T extends ReadonlyPartialJSONValue = ReadonlyPartialJSONValue
  > {
    /**
     * Optional string key/value connector. Defaults to in-memory connector.
     */
    connector?: IDataConnector<string>;

    /**
     * An optional promise that resolves with a data transformation that is
     * applied to the database contents before the database begins resolving
     * client requests.
     */
    transform?: Promise<DataTransform<T>>;
  }

  /**
   * An in-memory string key/value data connector.
   */
  export class Connector implements IDataConnector<string> {
    /**
     * Retrieve an item from the data connector.
     */
    async fetch(id: string): Promise<string> {
      return this._storage[id];
    }

    /**
     * Retrieve the list of items available from the data connector.
     *
     * @param namespace - If not empty, only keys whose first token before `:`
     * exactly match `namespace` will be returned, e.g. `foo` in `foo:bar`.
     */
    async list(namespace = ''): Promise<{ ids: string[]; values: string[] }> {
      return Object.keys(this._storage).reduce(
        (acc, val) => {
          if (namespace === '' ? true : namespace === val.split(':')[0]) {
            acc.ids.push(val);
            acc.values.push(this._storage[val]);
          }
          return acc;
        },
        { ids: [] as string[], values: [] as string[] }
      );
    }

    /**
     * Remove a value using the data connector.
     */
    async remove(id: string): Promise<void> {
      delete this._storage[id];
    }

    /**
     * Save a value using the data connector.
     */
    async save(id: string, value: string): Promise<void> {
      this._storage[id] = value;
    }

    private _storage: { [key: string]: string } = {};
  }
}

/*
 * A namespace for private module data.
 */
namespace Private {
  /**
   * An envelope around a JSON value stored in the state database.
   */
  export type Envelope = { readonly v: ReadonlyPartialJSONValue };
}
