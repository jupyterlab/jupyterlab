// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  nbformat
} from '@jupyterlab/coreutils';

import {
  IObservableMap, ObservableMap,
  IObservableValue, ObservableValue, IModelDB
} from '@jupyterlab/observables';

import {
  IAttachmentModel, AttachmentModel, imageRendererFactory
} from '@jupyterlab/rendermime';

import {
  IRenderMime
} from '@jupyterlab/rendermime-interfaces';

import {
  IDisposable
} from '@phosphor/disposable';

import {
  ISignal, Signal
} from '@phosphor/signaling';


/**
 * The model for attachments.
 */
export
interface IAttachmentsModel extends IDisposable {
  /**
   * A signal emitted when the model state changes.
   */
  readonly stateChanged: ISignal<IAttachmentsModel, void>;

  /**
   * A signal emitted when the model changes.
   */
  readonly changed: ISignal<IAttachmentsModel, IAttachmentsModel.ChangedArgs>;

  /**
   * The length of the items in the model.
   */
  readonly length: number;

  /**
   * The keys of the attachments in the model.
   */
  readonly keys: ReadonlyArray<string>;

  /**
   * The attachment content factory used by the model.
   */
  readonly contentFactory: IAttachmentsModel.IContentFactory;

  /**
   * Whether the specified key is set.
   */
  has(key: string): boolean;

  /**
   * Get an item for the specified key.
   */
  get(key: string): IAttachmentModel;

  /**
   * Set the value of the specified key.
   */
  set(key: string, attachment: nbformat.IMimeBundle): void;

  /**
   * Clear all of the attachments.
   */
  clear(): void;

  /**
   * Deserialize the model from JSON.
   *
   * #### Notes
   * This will clear any existing data.
   */
  fromJSON(values: nbformat.IAttachments): void;

  /**
   * Serialize the model to JSON.
   */
  toJSON(): nbformat.IAttachments;
}


/**
 * The namespace for IAttachmentsModel interfaces.
 */
export
namespace IAttachmentsModel {
  /**
   * The options used to create a attachments model.
   */
  export
  interface IOptions {
    /**
     * The initial values for the model.
     */
    values?: nbformat.IAttachments;

    /**
     * The attachment content factory used by the model.
     *
     * If not given, a default factory will be used.
     */
    contentFactory?: IContentFactory;

    /**
     * An optional IModelDB to store the attachments model.
     */
    modelDB?: IModelDB;
  }

  /**
   * A type alias for changed args.
   */
  export
  type ChangedArgs = IObservableMap.IChangedArgs<IAttachmentModel>;

  /**
   * The interface for an attachment content factory.
   */
  export
  interface IContentFactory {
    /**
     * Create an attachment model.
     */
    createAttachmentModel(options: IAttachmentModel.IOptions): IAttachmentModel;
  }
}

/**
 * The default implementation of the IAttachmentsModel.
 */
export
class AttachmentsModel implements IAttachmentsModel {
  /**
   * Construct a new observable outputs instance.
   */
  constructor(options: IAttachmentsModel.IOptions = {}) {
    this.contentFactory = (options.contentFactory ||
      AttachmentsModel.defaultContentFactory
    );
    if (options.values) {
      for (let key of Object.keys(options.values)) {
        this.set(key, options.values[key]);
      }
    }
    this._map.changed.connect(this._onMapChanged, this);

    // If we are given a IModelDB, keep an up-to-date
    // serialized copy of the AttachmentsModel in it.
    if (options.modelDB) {
      this._modelDB = options.modelDB;
      this._serialized = this._modelDB.createValue('attachments');
      if (this._serialized.get()) {
        this.fromJSON(this._serialized.get() as nbformat.IAttachments);
      } else {
        this._serialized.set(this.toJSON());
      }
      this._serialized.changed.connect(this._onSerializedChanged, this);
    }
  }

  /**
   * A signal emitted when the model state changes.
   */
  get stateChanged(): ISignal<IAttachmentsModel, void> {
    return this._stateChanged;
  }

  /**
   * A signal emitted when the model changes.
   */
  get changed(): ISignal<this, IAttachmentsModel.ChangedArgs> {
    return this._changed;
  }

  /**
   * The keys of the attachments in the model.
   */
  get keys(): ReadonlyArray<string> {
    return this._map.keys();
  }

  /**
   * Get the length of the items in the model.
   */
  get length(): number {
    return this._map.keys().length;
  }

  /**
   * The attachment content factory used by the model.
   */
  readonly contentFactory: IAttachmentsModel.IContentFactory;

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
    this._map.dispose();
    Signal.clearData(this);
  }

  /**
   * Whether the specified key is set.
   */
  has(key: string): boolean {
    return this._map.has(key);
  }

  /**
   * Get an item at the specified key.
   */
  get(key: string): IAttachmentModel {
    return this._map.get(key);
  }

  /**
   * Set the value at the specified key.
   */
  set(key: string, value: nbformat.IMimeBundle): void {
    // Normalize stream data.
    let item = this._createItem({ value });
    this._map.set(key, item);
  }

  /**
   * Clear all of the attachments.
   */
  clear(): void {
    this._map.values().forEach((item: IAttachmentModel) => { item.dispose(); });
    this._map.clear();
  }

  /**
   * Deserialize the model from JSON.
   *
   * #### Notes
   * This will clear any existing data.
   */
  fromJSON(values: nbformat.IAttachments) {
    this.clear();
    Object.keys(values).forEach((key) => { this.set(key, values[key]); });
  }

  /**
   * Serialize the model to JSON.
   */
  toJSON(): nbformat.IAttachments {
    let ret: nbformat.IAttachments = {};
    for (let key of this._map.keys()) {
      ret[key] = this._map.get(key).toJSON();
    }
    return ret;
  }

  /**
   * Create an attachment item and hook up its signals.
   */
  private _createItem(options: IAttachmentModel.IOptions): IAttachmentModel {
    let factory = this.contentFactory;
    let item = factory.createAttachmentModel(options);
    item.changed.connect(this._onGenericChange, this);
    return item;
  }

  /**
   * Handle a change to the list.
   */
  private _onMapChanged(sender: IObservableMap<IAttachmentModel>, args: IObservableMap.IChangedArgs<IAttachmentModel>) {
    if (this._serialized && !this._changeGuard) {
      this._changeGuard = true;
      this._serialized.set(this.toJSON());
      this._changeGuard = false;
    }
    this._changed.emit(args);
    this._stateChanged.emit(void 0);
  }

  /**
   * If the serialized version of the outputs have changed due to a remote
   * action, then update the model accordingly.
   */
  private _onSerializedChanged(sender: IObservableValue, args: ObservableValue.IChangedArgs) {
    if (!this._changeGuard) {
      this._changeGuard = true;
      this.fromJSON(args.newValue as nbformat.IAttachments);
      this._changeGuard = false;
    }
  }

  /**
   * Handle a change to an item.
   */
  private _onGenericChange(): void {
    this._stateChanged.emit(void 0);
  }

  private _map = new ObservableMap<IAttachmentModel>();
  private _isDisposed = false;
  private _stateChanged = new Signal<IAttachmentsModel, void>(this);
  private _changed = new Signal<this, IAttachmentsModel.ChangedArgs>(this);
  private _modelDB: IModelDB = null;
  private _serialized: IObservableValue = null;
  private _changeGuard = false;
}


/**
 * The namespace for AttachmentsModel class statics.
 */
export
namespace AttachmentsModel {
  /**
   * The default implementation of a `IAttachemntsModel.IContentFactory`.
   */
  export
  class ContentFactory implements IAttachmentsModel.IContentFactory {
    /**
     * Create an attachment model.
     */
    createAttachmentModel(options: IAttachmentModel.IOptions): IAttachmentModel {
      return new AttachmentModel(options);
    }
  }

  /**
   * The default attachment model factory.
   */
  export
  const defaultContentFactory = new ContentFactory();
}


/**
 * A resolver for cell attachments 'attchment:filename'.
 *
 * Will resolve to a data: url.
 */
export
class AttachmentsResolver implements IRenderMime.IResolver {
  /**
   * Create an attachments resolver object.
   */
  constructor(options: AttachmentsResolver.IOptions) {
    this._parent = options.parent || null;
    this._model = options.model;
  }
  /**
   * Resolve a relative url to a correct server path.
   */
  resolveUrl(url: string): Promise<string> {
    if (this._parent && !url.startsWith('attachment:')) {
      return this._parent.resolveUrl(url);
    }
    return Promise.resolve(url);
  }

  /**
   * Get the download url of a given absolute server path.
   */
  getDownloadUrl(path: string): Promise<string> {
    if (this._parent && !path.startsWith('attachment:')) {
      return this._parent.getDownloadUrl(path);
    }
    // Return a data URL with the data of the url
    const key = path.slice('attachment:'.length);
    if (!this._model.has(key)) {
      // Resolve with unprocessed path, to show as broken image
      return Promise.resolve(path);
    }
    const {data} = this._model.get(key);
    const mimeType = Object.keys(data)[0];
    // Only support known safe types:
    if (imageRendererFactory.mimeTypes.indexOf(mimeType) === -1) {
      return Promise.reject(`Cannot render unknown image mime type "${mimeType}".`);
    }
    const dataUrl = `data:${mimeType};base64,${data[mimeType]}`;
    return Promise.resolve(dataUrl);
  }

  /**
   * Whether the URL should be handled by the resolver
   * or not.
   */
  isLocal(url: string): boolean {
    if (this._parent && !url.startsWith('attachment:')) {
      return this._parent.isLocal(url);
    }
    return true;
  }

  private _model: IAttachmentsModel;
  private _parent: IRenderMime.IResolver | null;
}


/**
 * The namespace for `AttachmentsResolver` class statics.
 */
export
namespace AttachmentsResolver {
  /**
   * The options used to create an AttachmentsResolver.
   */
  export
  interface IOptions {
    /**
     * The attachments model to resolve against.
     */
    model: IAttachmentsModel;

    /**
     * A parent resolver to use if the URL/path is not for an attachment.
     */
    parent?: IRenderMime.IResolver;
  }
}
