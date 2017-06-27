// Copyright (c) Jupyter Development Team.
// Distributed under the terms of

import {
  IRenderMime
} from '@jupyterlab/rendermime-interfaces';

import {
  JSONValue
} from '@phosphor/coreutils';

import {
  Action, DataStore
} from '@phosphor/datastore';

import {
  IDisposable
} from '@phosphor/disposable';

import {
  Signal
} from '@phosphor/signaling';


/**
 * A mime model backed by output data.
 */
export
class OutputMimeModel implements IRenderMime.IMimeModel, IDisposable {
  /**
   * Construct a new output model.
   */
  constructor(options: OutputMimeModel.IOptions) {
    let { id, dataStore } = options;
    let model = this._model = dataStore.state.mimeModels.byId[id];
    this._data = new Private.Bundle(model.dataId, dataStore);
    this._metadata = new Private.Bundle(model.metadataId, dataStore);
    this._dataStore = dataStore;
    dataStore.changed.connect(this._onStoreChanged, this);
  }

  /**
   * The data associated with the model.
   */
  get data(): IRenderMime.IBundle {
    return this._data;
  }

  /**
   * The metadata associated with the model.
   */
  get metadata(): IRenderMime.IBundle {
    return this._metadata;
  }

  /**
   * Whether the model is trusted.
   */
  get trusted(): boolean {
    return this._model.trusted;
  }

  /**
   * Whether the output mime model is disposed.
   */
  get isDisposed(): boolean {
    return this._isDisposed;
  }

  /**
   * Dispose of the resources used by the output mime model.
   */
  dispose(): void {
    if (this._isDisposed) {
      return;
    }
    Signal.clearData(this);
  }

  /**
   * Handle a change to the data store.
   */
  private _onStoreChanged(): void {
    let dataStore = this._dataStore;
    let model = dataStore.state.mimeModels.byId[this._id];
    if (model === this._model) {
      return;
    }
    this._model = model;
    this._data = new Private.Bundle(model.dataId, dataStore);
    this._metadata = new Private.Bundle(model.metadataId, dataStore);
  }

  private _id: number;
  private _isDisposed = false;
  private _model: IOutputMimeModel;
  private _dataStore: MimeModelStore;
  private _data: IRenderMime.IBundle;
  private _metadata: IRenderMime.IBundle;
}


/**
 * The namespace for OutputMimeModel statics.
 */
export
namespace OutputMimeModel {
  /**
   * The options used to create an OutputMimeModel.
   */
  export
  interface IOptions {
    /**
     * The model id associated with the model.
     */
    id: number;

    /**
     * The data store associated with the model.
     */
    dataStore: MimeModelStore;
  }
}


/**
 *
 */
export
interface IByIdMap<T> {
  /**
   *
   */
  readonly [id: number]: T;
}

/**
 *
 */
export
interface ITable<T> {
  /**
   *
   */
  readonly maxId: number;

  /**
   *
   */
  readonly byId: IByIdMap<T>;
}

/**
 * A read-only bundle of data for a mime model.
 */
export
interface IMimeBundle {
  readonly [key: string]: JSONValue;
}


/**
 * A model for output mime data.
 */
export
interface IOutputMimeModel {
  /**
   * Whether the model is trusted.
   */
  readonly trusted: boolean;

  /**
   * The data bundle id associated with the model.
   */
  readonly dataId: number;

  /**
   * The metadata bundle id associated with the model.
   */
  readonly metadataId: number;
}


/**
 * The store state for a mime model.
 */
export
interface IMimeStoreState {
  /**
   * The mime models table.
   */
  readonly mimeModels: ITable<IOutputMimeModel>;

  /**
   * The mime models table.
   */
  readonly mimeBundles: ITable<IMimeBundle>;
}


/**
 * An action associated with a rendermime model store.
 */
export
type MimeModelAction = (
  CreateMimeModel |
  CreateMimeBundle |
  AddToMimeBundle |
  RemoveFromMimeBundle
);


/**
 * A store for mime models.
 */
export
type MimeModelStore = DataStore<IMimeStoreState>;


/**
 * An action for creating a mime model.
 */
export
class CreateMimeModel extends Action<'@jupyterlab/outputarea/CREATE_MIME_MODEL'> {
  /**
   * Construct a new CreateMimeModel object.
   */
  constructor(id: number, model: IOutputMimeModel) {
    super('@jupyterlab/outputarea/CREATE_MIME_MODEL');
    this.id = id;
    this.model = model;
  }

  /**
   * The id of the mime model.
   */
  readonly id: number;

  /**
   * The model to add.
   */
  readonly model: IOutputMimeModel;
}


/**
 * An action for creating a mime bundle.
 */
export
class CreateMimeBundle extends Action<'@jupyterlab/outputarea/CREATE_MIME_BUNDLE'> {
  /**
   * Construct a new CreateMimeBundle object.
   */
  constructor(id: number, bundle: IMimeBundle) {
    super('@jupyterlab/outputarea/CREATE_MIME_BUNDLE');
    this.id = id;
    this.bundle = bundle;
  }

  /**
   * The id of the mime bundle.
   */
  readonly id: number;

  /**
   * The model to add.
   */
  readonly bundle: IMimeBundle;
}


/**
 * An action for adding or updating a key to a mime bundle.
 */
export
class AddToMimeBundle extends Action<'@jupyterlab/outputarea/ADD_TO_MIME_BUNDLE'> {
  /**
   * Construct a new AddToMimeBundle object.
   */
  constructor(id: number, key: string, value: JSONValue) {
    super('@jupyterlab/outputarea/ADD_TO_MIME_BUNDLE');
    this.id = id;
    this.key = key;
  }

  /**
   * The id of the mime bundle.
   */
  readonly id: number;

  /**
   * The key to add or update.
   */
  readonly key: string;

  /**
   * The value of the key.
   */
  readonly value: JSONValue;
}


/**
 * An action for removing a key from a mime bundle.
 */
export
class RemoveFromMimeBundle extends Action<'@jupyterlab/outputarea/REMOVE_FROM_MIME_BUNDLE'> {
  /**
   * Construct a new RemoveFromMimeBundle object.
   */
  constructor(id: number, key: string) {
    super('@jupyterlab/outputarea/REMOVE_FROM_MIME_BUNDLE');
    this.id = id;
    this.key = key;
  }

  /**
   * The id of the mime bundle.
   */
  readonly id: number;

  /**
   * The key to remove.
   */
  readonly key: string;
}


/**
 *
 */
export
function mimeReducer(state: IMimeStoreState, action: MimeModelAction): IMimeStoreState {
  return {
    ...state,
    mimeModels: mimeModels(state.mimeModels, action),
    mimeBundles: mimeBundles(state.mimeBundles, action),
  };
}


function mimeModels(table: ITable<IOutputMimeModel>, action: MimeModelAction): ITable<IOutputMimeModel> {
  switch (action.type) {
  case '@jupyterlab/outputarea/CREATE_MIME_MODEL':
    return createNewEntry(table, action.id, action.model);
  default:
    return table;
  }
}


function mimeBundles(table: ITable<IMimeBundle>, action: MimeModelAction): ITable<IMimeBundle> {
  let entry: IMimeBundle;
  switch (action.type) {
  case '@jupyterlab/outputarea/CREATE_MIME_BUNDLE':
    return createNewEntry(table, action.id, action.bundle);
  case '@jupyterlab/outputarea/ADD_TO_MIME_BUNDLE':
    entry = { ...table.byId[action.id], [action.key]: action.value };
    return {
      ...table,
      byId: { ...table.byId, [action.id]: entry }
    };
  case '@jupyterlab/outputarea/REMOVE_FROM_MIME_BUNDLE':
    entry = { ...table.byId[action.id] };
    delete (entry as any)[action.key];
    return {
      ...table,
      byId: { ...table.byId, [action.id]: entry }
    };
  default:
    return table;
  }
}


/**
 *
 */
function createNewEntry<T>(table: ITable<T>, id: number, entry: T): ITable<T> {
  if (id in table.byId) {
    throw new Error(`Id '${id}' already exists.`);
  }

  return { ...table, maxId: maxId(table.maxId), byId: byId(table.byId) };

  function byId(map: IByIdMap<T>): IByIdMap<T> {
    return { ...map, [id]: entry };
  }

  function maxId(maxId: number): number {
    return Math.max(maxId, id);
  }
}


/**
 * The namespace for module private data.
 */
namespace Private {
  /**
   * An implementation of a rendermime bundle for output data.
   */
  export
  class Bundle implements IRenderMime.IBundle {
    /**
     * Create a new bundle.
     */
    constructor(id: number, dataStore: MimeModelStore) {
      this._id = id;
      this._dataStore = dataStore;
    }

    /**
     * Get a value for a given key.
     *
     * @param key - the key.
     *
     * @returns the value for that key.
     */
    get(key: string): JSONValue {
      return this._dataStore.state.mimeBundles.byId[this._id][key];
    }

    /**
     * Check whether the bundle has a key.
     *
     * @param key - the key to check.
     *
     * @returns `true` if the bundle has the key, `false` otherwise.
     */
    has(key: string): boolean {
      let model = this._dataStore.state.mimeBundles.byId[this._id];
      return Object.keys(model).indexOf(key) !== -1;
    }

    /**
     * Set a key-value pair in the bundle.
     *
     * @param key - The key to set.
     *
     * @param value - The value for the key.
     *
     * @returns the old value for the key, or undefined
     *   if that did not exist.
     */
    set(key: string, value: JSONValue): JSONValue {
      let old = this.get(key);
      let action = new AddToMimeBundle(this._id, key, value);
      this._dataStore.dispatch(action);
      return old;
    }

    /**
     * Get a list of the keys in the bundle.
     *
     * @returns - a list of keys.
     */
    keys(): string[] {
      let model = this._dataStore.state.mimeBundles.byId[this._id];
      return Object.keys(model);
    }

    /**
     * Remove a key from the bundle.
     *
     * @param key - the key to remove.
     *
     * @returns the value of the given key,
     *   or undefined if that does not exist.
     */
    delete(key: string): JSONValue {
      let old = this.get(key);
      let action = new RemoveFromMimeBundle(this._id, key);
      this._dataStore.dispatch(action);
      return old;
    }

    private _id: number;
    private _dataStore: MimeModelStore;
  }
}
