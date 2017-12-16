// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ReadonlyJSONValue, Token
} from '@phosphor/coreutils';

import {
  IDataConnector
} from './interfaces';


/* tslint:disable */
/**
 * The default state database token.
 */
export
const IStateDB = new Token<IStateDB>('@jupyterlab/coreutils:IStateDB');
/* tslint:enable */


/**
 * An object which holds an id/value pair.
 */
export
interface IStateItem {
  /**
   * The identifier key for a state item.
   */
  id: string;

  /**
   * The data value for a state item.
   */
  value: ReadonlyJSONValue;
}


/**
 * The description of a state database.
 */
export
interface IStateDB extends IDataConnector<ReadonlyJSONValue> {
  /**
   * The maximum allowed length of the data after it has been serialized.
   */
  readonly maxLength: number;

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
   * Retrieve all the saved bundles for a namespace.
   *
   * @param namespace - The namespace to retrieve.
   *
   * @returns A promise that bears a collection data payloads for a namespace.
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
  fetchNamespace(namespace: string): Promise<IStateItem[]>;
}


/**
 * The default concrete implementation of a state database.
 */
export
class StateDB implements IStateDB {
  /**
   * Create a new state database.
   *
   * @param options - The instantiation options for a state database.
   */
  constructor(options: StateDB.IOptions) {
    this.namespace = options.namespace;
    if (options.when) {
      this._handleSentinel(options.when);
    }
  }

  /**
   * The maximum allowed length of the data after it has been serialized.
   */
  readonly maxLength = 2000;

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
  clear(): Promise<void> {
    this._clear();

    return Promise.resolve(undefined);
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
   * using the `fetchNamespace()` method.
   *
   * The promise returned by this method may be rejected if an error occurs in
   * retrieving the data. Non-existence of an `id` will succeed with `null`.
   */
  fetch(id: string): Promise<ReadonlyJSONValue | undefined> {
    const key = `${this.namespace}:${id}`;
    const value = window.localStorage.getItem(key);

    if (!value) {
      return Promise.resolve(undefined);
    }

    try {
      const envelope = JSON.parse(value) as Private.Envelope;

      return Promise.resolve(envelope.v);
    } catch (error) {
      return Promise.reject(error);
    }
  }

  /**
   * Retrieve all the saved bundles for a namespace.
   *
   * @param namespace - The namespace to retrieve.
   *
   * @returns A promise that bears a collection data payloads for a namespace.
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
  fetchNamespace(namespace: string): Promise<IStateItem[]> {
    const { localStorage } = window;
    const prefix = `${this.namespace}:${namespace}:`;
    const regex = new RegExp(`^${this.namespace}\:`);
    let items: IStateItem[] = [];
    let i = localStorage.length;

    while (i) {
      let key = localStorage.key(--i);

      if (key && key.indexOf(prefix) === 0) {
        let value = localStorage.getItem(key);

        try {
          let envelope = JSON.parse(value) as Private.Envelope;

          items.push({
            id: key.replace(regex, ''),
            value: envelope ? envelope.v : undefined
          });
        } catch (error) {
          console.warn(error);
          localStorage.removeItem(key);
        }
      }
    }

    return Promise.resolve(items);
  }

  /**
   * Remove a value from the database.
   *
   * @param id - The identifier for the data being removed.
   *
   * @returns A promise that is rejected if remove fails and succeeds otherwise.
   */
  remove(id: string): Promise<void> {
    window.localStorage.removeItem(`${this.namespace}:${id}`);

    return Promise.resolve(undefined);
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
   * using the `fetchNamespace()` method.
   */
  save(id: string, value: ReadonlyJSONValue): Promise<void> {
    try {
      const key = `${this.namespace}:${id}`;
      const envelope: Private.Envelope = { v: value };
      const serialized = JSON.stringify(envelope);
      const length = serialized.length;
      const max = this.maxLength;

      if (length > max) {
        throw new Error(`Data length (${length}) exceeds maximum (${max})`);
      }

      window.localStorage.setItem(key, serialized);

      return Promise.resolve(undefined);
    } catch (error) {
      return Promise.reject(error);
    }
  }

  /**
   * Clear the entire database.
   *
   * #### Notes
   * Unlike the public `clear` method, this method is synchronous.
   */
  private _clear(): void {
    const { localStorage } = window;
    const prefix = `${this.namespace}:`;
    let i = localStorage.length;

    while (i) {
      let key = localStorage.key(--i);

      if (key && key.indexOf(prefix) === 0) {
        localStorage.removeItem(key);
      }
    }
  }

  /**
   * Handle the startup sentinel.
   */
  private _handleSentinel(when: Promise<void>): void {
    const { localStorage } = window;
    let key = `${this.namespace}:statedb:sentinel`;
    let sentinel = localStorage.getItem(key);

    // Clear state if the sentinel was not properly cleared on last page load.
    if (sentinel) {
      this._clear();
    }

    // Set the sentinel value and clear it when the statedb is initialized.
    localStorage.setItem(key, 'sentinel');
    when.then(() => { localStorage.removeItem(key); });
  }
}

/**
 * A namespace for StateDB statics.
 */
export
namespace StateDB {
  /**
   * The instantiation options for a state database.
   */
  export
  interface IOptions {
    /**
     * The namespace prefix for all state database entries.
     */
    namespace: string;

    /**
     * An optional Promise for when the state database should be considered
     * initialized.
     */
    when?: Promise<void>;
  }
}


/*
 * A namespace for private module data.
 */
namespace Private {
  /**
   * An envelope around a JSON value stored in the state database.
   */
  export
  type Envelope = { readonly v: ReadonlyJSONValue };
}
