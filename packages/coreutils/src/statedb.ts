// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ReadonlyJSONObject,
  ReadonlyJSONValue,
  Token
} from '@phosphor/coreutils';

import { ISignal, Signal } from '@phosphor/signaling';

import { IDataConnector } from './interfaces';

/* tslint:disable */
/**
 * The default state database token.
 */
export const IStateDB = new Token<IStateDB>('@jupyterlab/coreutils:IStateDB');
/* tslint:enable */

/**
 * The description of a state database.
 */
export interface IStateDB<T extends ReadonlyJSONValue = ReadonlyJSONValue>
  extends IDataConnector<T> {
  /**
   * The namespace prefix for all state database entries.
   *
   * #### Notes
   * This value should be set at instantiation and will only be used
   * internally by a state database. That means, for example, that an
   * app could have multiple, mutually exclusive state databases.
   */
  readonly namespace: string;

  /**
   * Return a serialized copy of the state database's entire contents.
   *
   * @returns A promise that bears the database contents as JSON.
   */
  toJSON(): Promise<{ [id: string]: T }>;
}

/**
 * The default concrete implementation of a state database.
 */
export class StateDB<T extends ReadonlyJSONValue = ReadonlyJSONValue>
  implements IStateDB<T> {
  /**
   * Create a new state database.
   *
   * @param options - The instantiation options for a state database.
   */
  constructor(options: StateDB.IOptions) {
    const { connector, namespace, transform, windowName } = options;

    this.namespace = namespace;

    this._connector = connector || Private.connector;
    this._window = windowName || '';
    this._ready = (transform || Promise.resolve(null)).then(transformation => {
      if (!transformation) {
        return;
      }

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

  /**
   * A signal that emits the change type any time a value changes.
   */
  get changed(): ISignal<this, StateDB.Change> {
    return this._changed;
  }

  /**
   * The namespace prefix for all state database entries.
   *
   * #### Notes
   * This value should be set at instantiation and will only be used internally
   * by a state database. That means, for example, that an app could have
   * multiple, mutually exclusive state databases.
   */
  readonly namespace: string;

  /**
   * Clear the entire database.
   */
  async clear(silent = false): Promise<void> {
    await this._ready;
    await this._clear();
    if (silent) {
      return;
    }
    this._changed.emit({ id: null, type: 'clear' });
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
  async fetch(id: string): Promise<T> {
    await this._ready;
    return this._fetch(id);
  }

  /**
   * Retrieve all the saved bundles for a namespace.
   *
   * @param filter - The namespace prefix to retrieve.
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
   * @returns A promise that bears the database contents as JSON.
   */
  async toJSON(): Promise<{ [id: string]: T }> {
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
    const key = `${this._window}:${this.namespace}:${id}`;
    const value = await this._connector.fetch(key);

    if (value) {
      return (JSON.parse(value) as Private.Envelope).v as T;
    }

    return undefined;
  }

  /**
   * Fetch a list from the database.
   */
  private async _list(query?: string): Promise<{ ids: string[]; values: T[] }> {
    const prefix = `${this._window}:${this.namespace}:`;
    const { ids, values } = await this._connector.list(
      query ? `${prefix}${query}:` : prefix
    );

    return {
      ids: ids.map((key: string) => key.replace(prefix, '')),
      values: values.map(val => (JSON.parse(val) as Private.Envelope).v as T)
    };
  }

  /**
   * Merge data into the state database.
   */
  private async _merge(contents: { [id: string]: T }): Promise<void> {
    await Promise.all(
      Object.keys(contents).map(key => this._save(key, contents[key]))
    );
  }

  /**
   * Overwrite the entire database with new contents.
   */
  private async _overwrite(contents: { [id: string]: T }): Promise<void> {
    await this._clear();
    await this._merge(contents);
  }

  /**
   * Remove a key in the database.
   */
  private async _remove(id: string): Promise<void> {
    const key = `${this._window}:${this.namespace}:${id}`;

    return this._connector.remove(key);
  }

  /**
   * Save a key and its value in the database.
   */
  private async _save(id: string, value: T): Promise<void> {
    const key = `${this._window}:${this.namespace}:${id}`;
    const serialized = JSON.stringify({ v: value } as Private.Envelope);

    return this._connector.save(key, serialized);
  }

  private _changed = new Signal<this, StateDB.Change>(this);
  private _connector: IDataConnector<string>;
  private _ready: Promise<void>;
  private _window: string;
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
  export type DataTransform = {
    /*
     * The change operation being applied.
     */
    type: 'cancel' | 'clear' | 'merge' | 'overwrite';

    /**
     * The contents of the change operation.
     */
    contents: ReadonlyJSONObject | null;
  };

  /**
   * The instantiation options for a state database.
   */
  export interface IOptions {
    /**
     * Optional data connector for a database. Defaults to in-memory connector.
     */
    connector?: IDataConnector<string>;

    /**
     * The namespace prefix for all state database entries.
     */
    namespace: string;

    /**
     * An optional promise that resolves with a data transformation that is
     * applied to the database contents before the database begins resolving
     * client requests.
     */
    transform?: Promise<DataTransform>;

    /**
     * An optional name for the application window.
     *
     * #### Notes
     * In environments where multiple windows can instantiate a state database,
     * a window name is necessary to prefix all keys that are stored within the
     * local storage that is shared by all windows. In JupyterLab, this window
     * name is generated by the `IWindowResolver` extension.
     */
    windowName?: string;
  }
}

/*
 * A namespace for private module data.
 */
namespace Private {
  /**
   * An envelope around a JSON value stored in the state database.
   */
  export type Envelope = { readonly v: ReadonlyJSONValue };

  /**
   * The in-memory storage
   */
  const storage: { [id: string]: string } = {};

  export const connector: IDataConnector<string> = {
    /**
     * Retrieve an item from the data connector.
     */
    fetch: async (id: string): Promise<string> => {
      return storage[id];
    },

    /**
     * Retrieve the list of items available from the data connector.
     */
    list: async (
      query: string
    ): Promise<{ ids: string[]; values: string[] }> => {
      return Object.keys(storage).reduce(
        (acc, val) => {
          if (val && val.indexOf(query) === 0) {
            acc.ids.push(val);
            acc.values.push(storage[val]);
          }
          return acc;
        },
        { ids: [], values: [] }
      );
    },

    /**
     * Remove a value using the data connector.
     */
    remove: async (id: string): Promise<void> => {
      delete storage[id];
    },

    /**
     * Save a value using the data connector.
     */
    save: async (id: string, value: string): Promise<void> => {
      storage[id] = value;
    }
  };
}
